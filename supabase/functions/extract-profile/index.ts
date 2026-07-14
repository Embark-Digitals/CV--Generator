// extract-profile: turn a stored source CV's text into a structured
// candidate profile. Everything returned is marked for user verification —
// nothing is written to the Master Career Profile here.
import { z } from 'npm:zod@3'
import {
  HttpError,
  json,
  logAiRun,
  serveWithContext,
  sha256Hex,
} from '../_shared/context.ts'
import {
  complete,
  INJECTION_GUARD,
  modelFor,
  ProviderError,
  untrustedBlock,
} from '../_shared/provider.ts'

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

  try {
    const result = await complete({
      model,
      system: SYSTEM_PROMPT,
      user: untrustedBlock('CV TEXT', doc.extracted_text),
      schemaName: 'candidate_profile',
      schema: responseJsonSchema,
      timeoutMs: 90_000,
    })
    await logAiRun(ctx, {
      kind: 'profile_extraction',
      model,
      status: 'success',
      inputHash,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      durationMs: result.durationMs,
    })
    return json({ candidate: result.json })
  } catch (err) {
    const code = err instanceof ProviderError ? err.code : 'error'
    await logAiRun(ctx, {
      kind: 'profile_extraction',
      model,
      status: code === 'error' ? 'error' : code,
      inputHash,
      errorCode: code,
    })
    throw new HttpError(502, 'Profile extraction failed')
  }
})
