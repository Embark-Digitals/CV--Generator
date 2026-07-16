// extract-profile: turn a stored source CV's text into a structured
// candidate profile. Everything returned is marked for user verification —
// nothing is written to the Master Career Profile here.
import { z } from 'npm:zod@3'
import {
  HttpError,
  hasPendingRun,
  json,
  logAiRun,
  serveWithContext,
  sha256Hex,
  updateAiRun,
} from '../_shared/context.ts'
import {
  complete,
  INJECTION_GUARD,
  modelFor,
  ProviderError,
  untrustedBlock,
} from '../_shared/provider.ts'
import type { ProviderErrorCode } from '../_shared/openai-response.ts'

// Map an internal failure code to (HTTP status, stable category). The client
// turns the category into safe user-facing copy; we never send provider text.
function failureResponse(code: ProviderErrorCode | 'in_progress') {
  const table: Record<string, { status: number; category: string }> = {
    timeout: { status: 504, category: 'timeout' },
    rate_limited: { status: 429, category: 'rate_limited' },
    quota: { status: 402, category: 'quota' },
    truncated: { status: 502, category: 'truncated' },
    invalid_response: { status: 502, category: 'invalid_response' },
    in_progress: { status: 409, category: 'in_progress' },
    error: { status: 502, category: 'unavailable' },
  }
  const { status, category } = table[code] ?? table.error
  return json({ error: 'Profile extraction failed', category }, status)
}

const requestSchema = z.object({ document_id: z.string().uuid() })

const SYSTEM_PROMPT =
  'You extract structured career information from CV text. ' +
  'Copy facts exactly as written — never infer, embellish or invent employers, dates, titles, qualifications, skills or achievements. ' +
  'If a field is not present in the text, return null for it. Dates must be ISO YYYY-MM-DD; if only a month or year is given, use the first day (e.g. 2019-03-01, 2019-01-01). ' +
  'Split employment descriptions into individual responsibility bullets. ' +
  'Systems means software/tools (e.g. Excel, SAP, Pastel); skills are competencies. ' +
  INJECTION_GUARD

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    personal: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        [
          'full_name',
          'first_name',
          'last_name',
          'email',
          'phone',
          'address_line',
          'city',
          'region',
          'postal_code',
          'country',
          'date_of_birth',
          'gender',
          'nationality',
          'drivers_licence',
        ].map((k) => [k, { type: ['string', 'null'] }]),
      ),
      required: [
        'full_name',
        'first_name',
        'last_name',
        'email',
        'phone',
        'address_line',
        'city',
        'region',
        'postal_code',
        'country',
        'date_of_birth',
        'gender',
        'nationality',
        'drivers_licence',
      ],
    },
    headline: { type: ['string', 'null'] },
    professional_summary: { type: ['string', 'null'] },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          location: { type: ['string', 'null'] },
          employment_type: { type: ['string', 'null'] },
          start_date: { type: ['string', 'null'] },
          end_date: { type: ['string', 'null'] },
          is_current: { type: 'boolean' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'company',
          'title',
          'location',
          'employment_type',
          'start_date',
          'end_date',
          'is_current',
          'bullets',
        ],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          institution: { type: 'string' },
          qualification: { type: 'string' },
          field_of_study: { type: ['string', 'null'] },
          start_date: { type: ['string', 'null'] },
          end_date: { type: ['string', 'null'] },
          grade: { type: ['string', 'null'] },
        },
        required: [
          'institution',
          'qualification',
          'field_of_study',
          'start_date',
          'end_date',
          'grade',
        ],
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          issuer: { type: ['string', 'null'] },
          issue_date: { type: ['string', 'null'] },
          expiry_date: { type: ['string', 'null'] },
        },
        required: ['name', 'issuer', 'issue_date', 'expiry_date'],
      },
    },
    skills: { type: 'array', items: { type: 'string' } },
    systems: { type: 'array', items: { type: 'string' } },
    references: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          relationship: { type: ['string', 'null'] },
          company: { type: ['string', 'null'] },
          email: { type: ['string', 'null'] },
          phone: { type: ['string', 'null'] },
        },
        required: ['name', 'relationship', 'company', 'email', 'phone'],
      },
    },
  },
  required: [
    'personal',
    'headline',
    'professional_summary',
    'experiences',
    'education',
    'certifications',
    'skills',
    'systems',
    'references',
  ],
}

serveWithContext(async (req, ctx) => {
  const body = requestSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) throw new HttpError(400, 'Invalid request body')

  // RLS guarantees the document belongs to the caller.
  const { data: doc, error } = await ctx.db
    .from('uploaded_documents')
    .select('id, extracted_text')
    .eq('id', body.data.document_id)
    .single()
  if (error || !doc?.extracted_text) {
    throw new HttpError(404, 'Document not found or has no extracted text')
  }

  const model = modelFor('extract')
  const inputHash = await sha256Hex(doc.extracted_text)

  // Reject a duplicate submission (e.g. impatient retry) for the same document
  // while an extraction is already running, before spending another AI call.
  if (await hasPendingRun(ctx, 'profile_extraction', inputHash)) {
    return failureResponse('in_progress')
  }

  // Record a pending run so concurrent duplicates are detected and the run has
  // a lifecycle we can finalise.
  const runId = await logAiRun(ctx, {
    kind: 'profile_extraction',
    model,
    status: 'pending',
    inputHash,
  })
  const finalise = (entry: Parameters<typeof updateAiRun>[2]) =>
    runId ? updateAiRun(ctx, runId, entry) : Promise.resolve()

  try {
    const result = await complete({
      model,
      system: SYSTEM_PROMPT,
      user: untrustedBlock('CV TEXT', doc.extracted_text),
      schemaName: 'candidate_profile',
      schema: responseJsonSchema,
      // Reasoning model: leave generous headroom so reasoning + a large
      // structured profile never truncates (only used tokens are billed).
      maxOutputTokens: 16_000,
      timeoutMs: 90_000,
    })
    await finalise({
      status: 'success',
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      durationMs: result.durationMs,
    })
    return json({ candidate: result.json })
  } catch (err) {
    const code: ProviderErrorCode =
      err instanceof ProviderError ? err.code : 'error'
    // Enum-safe status; the precise category lives in error_code.
    const enumStatus =
      code === 'timeout' || code === 'rate_limited' ? code : 'error'
    await finalise({ status: enumStatus, errorCode: code })
    return failureResponse(code)
  }
})
