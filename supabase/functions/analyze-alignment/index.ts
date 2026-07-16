// analyze-alignment: classify every job requirement against the user's
// VERIFIED career evidence. The model proposes; deterministic code disposes:
// any claimed evidence ID that does not exist in the verified evidence
// catalogue is stripped, and unsupported claims are downgraded. Requirements
// without evidence stay not_evidenced / needs_confirmation — they are never
// injected into the CV.
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

const requestSchema = z.object({
  job_application_id: z.string().uuid(),
  force: z.boolean().optional(),
})

import { buildEvidenceCatalogue } from '../_shared/evidence.ts'

const SYSTEM_PROMPT =
  'You assess how well a candidate\'s VERIFIED career evidence supports each job requirement. ' +
  'For every requirement id, classify alignment as: "supported" (clear evidence), "partially_supported" (related but incomplete evidence), "not_evidenced" (nothing relevant), or "needs_confirmation" (the candidate may plausibly have this but it is not on record — ask them). ' +
  'List the ids of evidence items that genuinely support your classification. Use ONLY ids from the evidence catalogue. Never invent evidence. ' +
  'For needs_confirmation requirements, write one short direct question to ask the candidate. ' +
  'Keep notes to one sentence. ' +
  INJECTION_GUARD

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assessments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          requirement_id: { type: 'string' },
          alignment: {
            type: 'string',
            enum: [
              'supported',
              'partially_supported',
              'not_evidenced',
              'needs_confirmation',
            ],
          },
          evidence_ids: { type: 'array', items: { type: 'string' } },
          note: { type: 'string' },
          question: { type: ['string', 'null'] },
        },
        required: [
          'requirement_id',
          'alignment',
          'evidence_ids',
          'note',
          'question',
        ],
      },
    },
  },
  required: ['assessments'],
}

const assessmentsSchema = z.object({
  assessments: z.array(
    z.object({
      requirement_id: z.string(),
      alignment: z.enum([
        'supported',
        'partially_supported',
        'not_evidenced',
        'needs_confirmation',
      ]),
      evidence_ids: z.array(z.string()),
      note: z.string(),
      question: z.string().nullable(),
    }),
  ),
})

serveWithContext(async (req, ctx) => {
  const body = requestSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) throw new HttpError(400, 'Invalid request body')
  const applicationId = body.data.job_application_id

  const { data: requirements, error: reqError } = await ctx.db
    .from('job_requirements')
    .select('id, kind, priority, description')
    .eq('job_application_id', applicationId)
    .order('display_order')
  if (reqError) throw new HttpError(500, 'Could not load requirements')
  if (!requirements || requirements.length === 0) {
    throw new HttpError(400, 'Extract or add job requirements first')
  }

  const evidence = await buildEvidenceCatalogue(ctx)
  if (evidence.length === 0) {
    throw new HttpError(
      400,
      'Your Master Career Profile has no verified records yet — verify your profile first',
    )
  }

  // Duplicate-request prevention / caching: identical inputs return the
  // stored analysis instead of a new model call.
  const inputHash = await sha256Hex(
    JSON.stringify({
      req: requirements.map((r: any) => [r.id, r.description, r.priority]),
      ev: evidence.map((e) => [e.id, e.text]),
    }),
  )
  if (!body.data.force) {
    const { data: cached } = await ctx.db
      .from('job_analysis_runs')
      .select('id, alignment_score, summary, created_at')
      .eq('job_application_id', applicationId)
      .eq('input_hash', inputHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cached) {
      return json({ analysis: cached, cached: true })
    }
  }

  const model = modelFor('classify')
  const userMessage = [
    'JOB REQUIREMENTS (id | priority | text):',
    untrustedBlock(
      'REQUIREMENTS',
      requirements
        .map((r: any) => `${r.id} | ${r.priority} | ${r.description}`)
        .join('\n'),
    ),
    '',
    'VERIFIED EVIDENCE CATALOGUE (id | kind | text):',
    untrustedBlock(
      'EVIDENCE',
      evidence.map((e) => `${e.id} | ${e.kind} | ${e.text}`).join('\n'),
    ),
  ].join('\n')

  let assessments: z.infer<typeof assessmentsSchema>['assessments']
  let usage = { promptTokens: 0, completionTokens: 0, durationMs: 0 }
  try {
    const result = await complete({
      model,
      system: SYSTEM_PROMPT,
      user: userMessage,
      schemaName: 'alignment_assessments',
      schema: responseJsonSchema,
      // One classification + evidence mapping per requirement can be many
      // items; give generous headroom on top of reasoning tokens.
      maxOutputTokens: 12_000,
      timeoutMs: 90_000,
    })
    const parsed = assessmentsSchema.safeParse(result.json)
    if (!parsed.success) {
      throw new ProviderError('error', 'Model output failed validation')
    }
    assessments = parsed.data.assessments
    usage = {
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      durationMs: result.durationMs,
    }
  } catch (err) {
    const code = err instanceof ProviderError ? err.code : 'error'
    await logAiRun(ctx, {
      kind: 'alignment',
      model,
      status: enumStatusFor(code),
      inputHash,
      errorCode: code,
    })
    throw new HttpError(502, 'Alignment analysis failed')
  }

  const aiRunId = await logAiRun(ctx, {
    kind: 'alignment',
    model,
    status: 'success',
    inputHash,
    ...usage,
  })

  // ---- Deterministic validation layer (never trust the model) -------------
  const validEvidenceIds = new Set(evidence.map((e) => e.id))
  const validRequirementIds = new Set(requirements.map((r: any) => r.id))
  const byRequirement = new Map<string, (typeof assessments)[number]>()
  for (const a of assessments) {
    if (!validRequirementIds.has(a.requirement_id)) continue
    const cleanIds = a.evidence_ids.filter((id) => validEvidenceIds.has(id))
    let alignment = a.alignment
    // A support claim without surviving evidence is not a support claim.
    if (
      (alignment === 'supported' || alignment === 'partially_supported') &&
      cleanIds.length === 0
    ) {
      alignment = 'needs_confirmation'
    }
    byRequirement.set(a.requirement_id, {
      ...a,
      alignment,
      evidence_ids: cleanIds,
    })
  }

  let weighted = 0
  let totalWeight = 0
  const counts = {
    supported: 0,
    partially_supported: 0,
    not_evidenced: 0,
    needs_confirmation: 0,
  }

  for (const r of requirements as any[]) {
    const a = byRequirement.get(r.id)
    const alignment = a?.alignment ?? 'needs_confirmation'
    counts[alignment as keyof typeof counts]++
    const weight = r.priority === 'required' ? 2 : 1
    totalWeight += weight
    if (alignment === 'supported') weighted += weight
    else if (alignment === 'partially_supported') weighted += weight * 0.5

    await ctx.db
      .from('job_requirements')
      .update({
        alignment,
        alignment_note: a?.note ?? null,
        evidence_ids: a?.evidence_ids ?? [],
      })
      .eq('id', r.id)

    if (alignment === 'needs_confirmation' && a?.question) {
      const { data: existing } = await ctx.db
        .from('confirmation_questions')
        .select('id')
        .eq('job_requirement_id', r.id)
        .eq('status', 'pending')
        .maybeSingle()
      if (!existing) {
        await ctx.db.from('confirmation_questions').insert({
          user_id: ctx.userId,
          job_application_id: applicationId,
          job_requirement_id: r.id,
          question: a.question,
        })
      }
    }
  }

  const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0
  const summary = { counts, total_requirements: requirements.length }

  const { data: analysis, error: insertError } = await ctx.db
    .from('job_analysis_runs')
    .insert({
      job_application_id: applicationId,
      user_id: ctx.userId,
      ai_run_id: aiRunId,
      input_hash: inputHash,
      alignment_score: score,
      summary,
    })
    .select('id, alignment_score, summary, created_at')
    .single()
  if (insertError) throw new HttpError(500, 'Could not store analysis')

  return json({ analysis, cached: false })
})
