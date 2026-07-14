// suggest-changes: propose evidence-cited tailoring edits for a tailored CV.
// Layer 1: restrictive prompt. Layer 2: evidence IDs on every proposal.
// Layer 3: deterministic Truth Lock validation — failures are stored
// (transparent) but never surfaced as pending suggestions.
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
import { buildEvidenceCatalogue, unverifiedSystemsFor } from '../_shared/evidence.ts'
import { validateSuggestion } from '../_shared/truth-lock.ts'

const requestSchema = z.object({ tailored_cv_id: z.string().uuid() })

const SYSTEM_PROMPT = [
  'You tailor a candidate\'s CV to a specific job WITHOUT ever inventing anything.',
  'You may ONLY: rephrase verified content, mirror terminology that appears in the job requirements, condense repetition, and rewrite the professional summary using verified facts.',
  'You may NOT invent or upgrade: employers, dates, job titles, qualifications, certifications, software, responsibilities, achievements, metrics, percentages, figures, team sizes, seniority, leadership authority, or proficiency levels.',
  'Permitted rephrasing keeps the same tier: "helped" -> "assisted", "worked on" -> "supported", "responsible for processing" -> "processed".',
  'Forbidden upgrades include: "assisted" -> "managed", "supported" -> "led", "participated" -> "directed", "exposure to" -> "expert in", "familiar with" -> "proficient in", adding any number that is not in the source text.',
  'Requirements the candidate has no evidence for must be LEFT OUT of the CV — never write them in.',
  'Each suggestion must cite the ids of evidence items that fully support the proposed text.',
  'Targets: target_record_type is one of "summary" (the professional summary), "headline" (the one-line professional identity), or "experience_bullet" (an individual responsibility; target_record_id = the bullet id from the CURRENT CV DOCUMENT).',
  'original_text must be copied exactly from the current document. Propose at most 10 high-value suggestions.',
  INJECTION_GUARD,
].join(' ')

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
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
  required: ['suggestions'],
}

const suggestionsSchema = z.object({
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
  if (cv.status !== 'draft' && cv.status !== 'ready') {
    throw new HttpError(400, 'Suggestions can only target a draft CV')
  }

  const { data: requirements } = await ctx.db
    .from('job_requirements')
    .select('id, kind, priority, description, alignment')
    .eq('job_application_id', cv.job_application_id)
    .order('display_order')
  if (!requirements || requirements.length === 0) {
    throw new HttpError(400, 'Extract or add job requirements first')
  }

  const evidence = await buildEvidenceCatalogue(ctx)
  if (evidence.length === 0) {
    throw new HttpError(400, 'No verified profile records to work from')
  }
  const unverifiedSystems = unverifiedSystemsFor(requirements, evidence)

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

  const model = modelFor('rewrite')
  const inputHash = await sha256Hex(
    documentDigest + JSON.stringify(requirements) + evidence.length,
  )

  const userMessage = [
    'JOB REQUIREMENTS (kind | priority | alignment | text):',
    untrustedBlock(
      'REQUIREMENTS',
      requirements
        .map(
          (r: any) =>
            `${r.kind} | ${r.priority} | ${r.alignment ?? 'unknown'} | ${r.description}`,
        )
        .join('\n'),
    ),
    '',
    'CURRENT CV DOCUMENT (JSON; bullet ids are targets):',
    untrustedBlock('CV DOCUMENT', documentDigest),
    '',
    'VERIFIED EVIDENCE CATALOGUE (id | kind | text):',
    untrustedBlock(
      'EVIDENCE',
      evidence.map((e) => `${e.id} | ${e.kind} | ${e.text}`).join('\n'),
    ),
  ].join('\n')

  let proposals: z.infer<typeof suggestionsSchema>['suggestions']
  let usage = { promptTokens: 0, completionTokens: 0, durationMs: 0 }
  try {
    const result = await complete({
      model,
      system: SYSTEM_PROMPT,
      user: userMessage,
      schemaName: 'cv_suggestions',
      schema: responseJsonSchema,
      timeoutMs: 120_000,
      maxOutputTokens: 8192,
    })
    const parsed = suggestionsSchema.safeParse(result.json)
    if (!parsed.success) {
      throw new ProviderError('error', 'Model output failed validation')
    }
    proposals = parsed.data.suggestions
    usage = {
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      durationMs: result.durationMs,
    }
  } catch (err) {
    const code = err instanceof ProviderError ? err.code : 'error'
    await logAiRun(ctx, {
      kind: 'suggestion',
      model,
      status: code === 'error' ? 'error' : code,
      inputHash,
      errorCode: code,
    })
    throw new HttpError(502, 'Suggestion generation failed')
  }

  const aiRunId = await logAiRun(ctx, {
    kind: 'suggestion',
    model,
    status: 'success',
    inputHash,
    ...usage,
  })

  // ---- Truth Lock: deterministic validation of every proposal -------------
  let stored = 0
  let blocked = 0
  for (const proposal of proposals) {
    const validation = validateSuggestion(proposal, {
      evidence,
      unverifiedSystems,
    })
    const { error } = await ctx.db.from('ai_suggestions').insert({
      user_id: ctx.userId,
      tailored_cv_id: cv.id,
      job_application_id: cv.job_application_id,
      ai_run_id: aiRunId,
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
      // Truth-Lock failures are stored for transparency but never pending.
      status: validation.passed ? 'pending' : 'rejected',
    })
    if (!error) {
      if (validation.passed) stored++
      else blocked++
    }
  }

  return json({ stored, blocked })
})
