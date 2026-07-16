// extract-requirements: turn a job advertisement into structured, editable
// requirement records plus basic job facts. The user reviews and corrects
// everything; nothing is authoritative until they say so.
import { z } from 'npm:zod@3'
import {
  enumStatusFor,
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

const requestSchema = z.object({ job_application_id: z.string().uuid() })

const KINDS = [
  'qualification',
  'experience',
  'skill',
  'system',
  'responsibility',
  'regulatory',
  'licence',
  'industry_term',
  'submission',
  'other',
] as const

const SYSTEM_PROMPT =
  'You extract hiring requirements from a job advertisement. ' +
  'Report only what the advert states — never invent requirements. ' +
  'Classify each requirement: qualification (education/degrees), experience (years or domains of experience), skill (competencies), system (software/tools), responsibility (duties of the role), regulatory (compliance/legislation knowledge), licence (driver\'s or professional licences), industry_term (sector jargon worth mirroring), submission (how to apply), other. ' +
  'Mark priority "required" for must-haves and "preferred" for nice-to-haves. ' +
  'closing_date must be ISO YYYY-MM-DD or null. ' +
  INJECTION_GUARD

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    job_title: { type: ['string', 'null'] },
    company: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    employment_type: { type: ['string', 'null'] },
    seniority: { type: ['string', 'null'] },
    closing_date: { type: ['string', 'null'] },
    requirements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', enum: [...KINDS] },
          priority: { type: 'string', enum: ['required', 'preferred'] },
          description: { type: 'string' },
        },
        required: ['kind', 'priority', 'description'],
      },
    },
  },
  required: [
    'job_title',
    'company',
    'location',
    'employment_type',
    'seniority',
    'closing_date',
    'requirements',
  ],
}

serveWithContext(async (req, ctx) => {
  const body = requestSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) throw new HttpError(400, 'Invalid request body')

  const { data: app, error } = await ctx.db
    .from('job_applications')
    .select('id, advert_text')
    .eq('id', body.data.job_application_id)
    .single()
  if (error || !app?.advert_text?.trim()) {
    throw new HttpError(404, 'Application not found or has no advert text')
  }

  const model = modelFor('extract')
  const inputHash = await sha256Hex(app.advert_text)

  try {
    const result = await complete({
      model,
      system: SYSTEM_PROMPT,
      user: untrustedBlock('JOB ADVERT', app.advert_text),
      schemaName: 'job_requirements',
      schema: responseJsonSchema,
      // Structured vacancy requirements + job facts: moderate output, with
      // headroom for reasoning tokens (gpt-5-mini shares the budget).
      maxOutputTokens: 8000,
      timeoutMs: 60_000,
    })
    await logAiRun(ctx, {
      kind: 'job_extraction',
      model,
      status: 'success',
      inputHash,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      durationMs: result.durationMs,
    })
    return json({ extraction: result.json })
  } catch (err) {
    const code = err instanceof ProviderError ? err.code : 'error'
    await logAiRun(ctx, {
      kind: 'job_extraction',
      model,
      status: enumStatusFor(code),
      inputHash,
      errorCode: code,
    })
    throw new HttpError(502, 'Requirement extraction failed')
  }
})
