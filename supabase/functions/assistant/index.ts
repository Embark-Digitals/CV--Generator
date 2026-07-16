// assistant: contextual chat for the tailoring workspace. Replies
// conversationally, and any CV change it wants to make MUST be emitted as a
// structured suggestion — which goes through the same Truth Lock validation
// and lands as a pending suggestion for review. Chat never edits the CV.
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
import { buildEvidenceCatalogue, unverifiedSystemsFor } from '../_shared/evidence.ts'
import { validateSuggestion } from '../_shared/truth-lock.ts'

const requestSchema = z.object({
  tailored_cv_id: z.string().uuid(),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(12)
    .default([]),
})

const SYSTEM_PROMPT = [
  'You are the CV Machine assistant inside a CV tailoring workspace.',
  'Answer questions about the job, the requirements and the candidate\'s verified evidence. Be concise and practical.',
  'STRICT HONESTY RULES: never invent or upgrade employers, dates, titles, qualifications, certifications, software, responsibilities, achievements, metrics, seniority or proficiency. Requirements without evidence stay off the CV.',
  'If the user asks you to change the CV, do NOT claim you changed it. Emit the change in the suggestions array (it will be validated and shown to the user for approval) and say it is ready for their review.',
  'Suggestions may only target: "summary", "headline", or "experience_bullet" (with the bullet id from the CV document). original_text must match the document exactly and evidence_ids must cite the evidence catalogue.',
  INJECTION_GUARD,
].join(' ')

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target_section: { type: 'string' },
          target_record_type: {
            type: 'string',
            enum: ['summary', 'headline', 'experience_bullet'],
          },
          target_record_id: { type: ['string', 'null'] },
          original_text: { type: 'string' },
          proposed_text: { type: 'string' },
          reason: { type: 'string' },
          evidence_ids: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number' },
        },
        required: [
          'target_section',
          'target_record_type',
          'target_record_id',
          'original_text',
          'proposed_text',
          'reason',
          'evidence_ids',
          'confidence',
        ],
      },
    },
  },
  required: ['reply', 'suggestions'],
}

const responseSchema = z.object({
  reply: z.string(),
  suggestions: z.array(
    z.object({
      target_section: z.string(),
      target_record_type: z.enum(['summary', 'headline', 'experience_bullet']),
      target_record_id: z.string().nullable(),
      original_text: z.string(),
      proposed_text: z.string(),
      reason: z.string(),
      evidence_ids: z.array(z.string()),
      confidence: z.number().min(0).max(1).catch(0.5),
    }),
  ),
})

serveWithContext(async (req, ctx) => {
  const body = requestSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) throw new HttpError(400, 'Invalid request body')

  const { data: cv, error: cvError } = await ctx.db
    .from('tailored_cvs')
    .select('id, job_application_id, document, status')
    .eq('id', body.data.tailored_cv_id)
    .single()
  if (cvError || !cv) throw new HttpError(404, 'Tailored CV not found')

  const { data: requirements = [] } = await ctx.db
    .from('job_requirements')
    .select('id, kind, priority, description, alignment')
    .eq('job_application_id', cv.job_application_id)
    .order('display_order')

  const evidence = await buildEvidenceCatalogue(ctx)
  const unverifiedSystems = unverifiedSystemsFor(requirements ?? [], evidence)

  const doc = cv.document ?? {}
  const documentDigest = JSON.stringify({
    headline: doc.header?.headline ?? '',
    summary: doc.summary ?? '',
    experiences: (doc.experiences ?? []).map((e: any) => ({
      id: e.id,
      company: e.company,
      title: e.title,
      bullets: e.bullets,
    })),
    skills: doc.skills,
    systems: doc.systems,
  })

  const historyText = body.data.history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n')

  const userMessage = [
    'CURRENT CV DOCUMENT (JSON):',
    untrustedBlock('CV DOCUMENT', documentDigest),
    '',
    'JOB REQUIREMENTS:',
    untrustedBlock(
      'REQUIREMENTS',
      (requirements ?? [])
        .map((r: any) => `${r.kind} | ${r.priority} | ${r.alignment ?? '?'} | ${r.description}`)
        .join('\n'),
    ),
    '',
    'VERIFIED EVIDENCE CATALOGUE (id | kind | text):',
    untrustedBlock(
      'EVIDENCE',
      evidence.map((e) => `${e.id} | ${e.kind} | ${e.text}`).join('\n'),
    ),
    '',
    historyText ? `CONVERSATION SO FAR:\n${historyText}\n` : '',
    `USER MESSAGE: ${body.data.message}`,
  ].join('\n')

  const model = modelFor('rewrite')
  const inputHash = await sha256Hex(body.data.message + documentDigest)

  let parsedResponse: z.infer<typeof responseSchema>
  try {
    const result = await complete({
      model,
      system: SYSTEM_PROMPT,
      user: userMessage,
      schemaName: 'assistant_reply',
      schema: responseJsonSchema,
      timeoutMs: 90_000,
      // Bounded conversational reply plus optional suggestions, with headroom
      // for reasoning tokens above the previous 4096 (which risked truncation).
      maxOutputTokens: 8000,
    })
    const parsed = responseSchema.safeParse(result.json)
    if (!parsed.success) {
      throw new ProviderError('error', 'Model output failed validation')
    }
    parsedResponse = parsed.data
    await logAiRun(ctx, {
      kind: 'assistant',
      model,
      status: 'success',
      inputHash,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      durationMs: result.durationMs,
    })
  } catch (err) {
    const code = err instanceof ProviderError ? err.code : 'error'
    await logAiRun(ctx, {
      kind: 'assistant',
      model,
      status: enumStatusFor(code),
      inputHash,
      errorCode: code,
    })
    throw new HttpError(502, 'The assistant is unavailable right now')
  }

  let pendingCreated = 0
  for (const proposal of parsedResponse.suggestions) {
    const validation = validateSuggestion(proposal, {
      evidence,
      unverifiedSystems,
    })
    const { error } = await ctx.db.from('ai_suggestions').insert({
      user_id: ctx.userId,
      tailored_cv_id: cv.id,
      job_application_id: cv.job_application_id,
      target_section: proposal.target_section,
      target_record_type: proposal.target_record_type,
      target_record_id: proposal.target_record_id,
      original_text: proposal.original_text,
      proposed_text: proposal.proposed_text,
      reason: proposal.reason,
      evidence_ids: proposal.evidence_ids.filter((id) =>
        evidence.some((e) => e.id === id),
      ),
      confidence: proposal.confidence,
      validation_result: validation,
      validation_passed: validation.passed,
      status: validation.passed ? 'pending' : 'rejected',
    })
    if (!error && validation.passed) pendingCreated++
  }

  return json({ reply: parsedResponse.reply, pending_suggestions: pendingCreated })
})
