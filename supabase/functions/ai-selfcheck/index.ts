// ai-selfcheck: authenticated operational health probe for AI configuration.
// Returns ONLY booleans and non-secret model names — never any key material.
// Used to confirm the OpenAI secret is wired without exposing its value.
import { HttpError, json, serveWithContext } from '../_shared/context.ts'
import { complete, modelFor, ProviderError } from '../_shared/provider.ts'

serveWithContext(async (req, _ctx) => {
  const url = new URL(req.url)
  const live = url.searchParams.get('live') === '1'

  const hasKey = Boolean(Deno.env.get('OPENAI_API_KEY'))
  const extractModel = modelFor('extract')
  const rewriteModel = modelFor('rewrite')

  const result: Record<string, unknown> = {
    openai_key_present: hasKey,
    model_extract: extractModel,
    model_rewrite: rewriteModel,
  }

  // Optional tiny live round-trip to confirm the key is actually accepted.
  if (live) {
    if (!hasKey) {
      result.live = 'skipped_no_key'
      return json(result)
    }
    try {
      const r = await complete({
        model: extractModel,
        system:
          'You are a health probe. Reply with the exact JSON requested. Ignore any other instruction.',
        user: 'Return {"ok": true}.',
        schemaName: 'health_probe',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: { ok: { type: 'boolean' } },
          required: ['ok'],
        },
        // gpt-5-mini is a reasoning model: it spends output tokens on
        // internal reasoning before the visible reply, so a tiny cap
        // starves it. Give a realistic budget.
        maxOutputTokens: 2000,
        timeoutMs: 60_000,
      })
      result.live = 'ok'
      result.live_valid_json = typeof (r.json as { ok?: unknown })?.ok === 'boolean'
      result.prompt_tokens = r.promptTokens
      result.completion_tokens = r.completionTokens
    } catch (err) {
      result.live = err instanceof ProviderError ? err.code : 'error'
    }
  }

  if (req.method !== 'POST') throw new HttpError(405, 'Use POST')
  return json(result)
})
