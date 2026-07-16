# AI Architecture

## Shape

```
Browser (never sees the OpenAI key)
  └─ supabase.functions.invoke(<function>, { body })   [user JWT attached]
       └─ Edge Function (Deno)
            ├─ requireUser(): validates JWT, builds a USER-SCOPED client
            │   → all DB access inside functions is RLS-enforced too
            ├─ Zod request validation
            ├─ provider.ts — the only module that talks to OpenAI
            └─ deterministic post-validation + safe usage logging
```

## Provider adapter (`supabase/functions/_shared/provider.ts`)

- Single `complete()` entry point: chat completion with **structured JSON
  output** (`response_format: json_schema, strict: true`).
- Timeout via `AbortController` (60–90 s per task), **2 attempts max**, backoff
  on 429.
- Never logs or returns provider response bodies on errors (they can echo
  prompt content).
- Model selection is configuration: `OPENAI_MODEL_EXTRACT` (default
  `gpt-4o-mini`) for extraction/classification, `OPENAI_MODEL_REWRITE`
  (default `gpt-4o`) reserved for final professional rewriting. No model IDs
  hard-coded at call sites.
- The key lives only as a Supabase secret:
  `supabase secrets set OPENAI_API_KEY --project-ref <ref>`.

## Functions

| Function | Task | Model tier |
| --- | --- | --- |
| `extract-profile` | CV text → structured candidate profile (everything user-verified afterwards) | extract |
| `extract-requirements` | advert text → typed requirement records + job facts | extract |
| `analyze-alignment` | requirements × verified evidence → per-requirement alignment, score, confirmation questions | extract/classify |
| `suggest-changes` (Phase 5) | evidence-cited tailoring suggestions, Truth-Lock validated | rewrite |
| `assistant` (Phase 5) | contextual chat; change proposals become pending suggestions | rewrite |
| `ai-selfcheck` | auth-protected ops probe: reports `openai_key_present` (boolean) and configured model names; `?live=1` does a tiny round-trip to confirm the key is accepted. Never returns key material. | extract |

### Confirming the OpenAI key is wired

```bash
# from an authenticated session, POST to the function:
#   /functions/v1/ai-selfcheck?live=1
# → {"openai_key_present": true, "model_extract": "...", "live": "ok", ...}
```

If `openai_key_present` is `false`, the secret is not set **on this project**
— run `supabase secrets set OPENAI_API_KEY --project-ref <ref>` against the
correct project reference and re-check.

## Safety measures

- **Prompt-injection defence**: document text is wrapped in
  `<<<BEGIN/END UNTRUSTED …>>>` markers; system prompts instruct the model to
  treat it as data only. Delimiter sequences inside the text are broken.
- **Zod validation** of every request body and every model response.
- **Duplicate-request prevention / caching**: `analyze-alignment` hashes its
  full input (requirements + evidence catalogue) and returns the stored
  analysis when nothing changed, unless `force` is passed.
- **Deterministic post-validation**: the model's claimed evidence IDs are
  checked against the verified-evidence catalogue; support claims without
  surviving evidence are downgraded to `needs_confirmation`. (Truth Lock
  extends this — see [AI_TRUTH_LOCK.md](AI_TRUTH_LOCK.md).)
- **Safe logging**: `ai_runs` stores kind, model, status, input hash, token
  counts and duration — never prompt or response content.
- **Evidence gating**: only `verified` / `user_confirmed` records enter the
  evidence catalogue; `pending_verification` and `rejected` records are
  invisible to the AI.
