# Security

## Threat model

CV Machine holds one person's complete career and identity data plus their
job-search activity. The primary risks are: cross-user data exposure (if the
app ever gains more users), leaked secrets, personal data entering Git, and
AI-fabricated claims (covered in [AI_TRUTH_LOCK.md](AI_TRUTH_LOCK.md)).

## Authentication

- Supabase Auth, email + password only. Minimum password length 10.
- **Public signup is disabled** at the Auth service level
  (`enable_signup = false`, pushed via `supabase config push`). Accounts are
  created administratively — see
  [INITIAL_USER_SETUP.md](INITIAL_USER_SETUP.md).
- Sessions persist with refresh-token rotation; protected routes redirect
  unauthenticated visitors to `/sign-in`.

## Authorised-user enforcement (defence in depth)

Beyond `auth.uid()` ownership, every RLS policy also requires
`public.is_authorised()` — membership of the `user_roles` allow-list, which
only the auth bootstrap trigger or the service role can write. Even a user
created unexpectedly could read/write nothing unless enrolled.

## Row Level Security

- RLS is enabled on **every** table in the initial migrations, before any
  data existed.
- Explicit policies per command (SELECT / INSERT / UPDATE / DELETE) with
  `USING` and `WITH CHECK`.
- Child records verify **parent ownership** on write: a user cannot insert
  an `experience_bullet` under another user's experience, a requirement
  under another user's application, etc.
- `user_roles` is read-only to users (no write policies).
- Verified live (see `docs/TESTING.md`): cross-user reads return zero rows,
  spoofed-owner inserts fail, cross-parent child inserts fail.

## Storage

- All buckets private; no permanent public URLs — downloads use
  authenticated requests or short-lived signed URLs.
- Object paths are `{user_id}/…` and policies compare the first path
  segment to `auth.uid()`.
- Mime allow-lists (PDF/DOCX) and 20 MB size limits per bucket.

## Secrets

| Secret | Location | Never |
| --- | --- | --- |
| OpenAI API key | Supabase Edge Function secret (`supabase secrets set`) | frontend env, network responses, logs, source, CI output |
| Service-role key | Supabase dashboard / local admin scripts only | the browser, the repo |
| DB password | `private/` (gitignored) + owner's password manager | chat, Git |
| Anon key | `.env` (gitignored) + Vercel env | committed `.env` |

The anon key is public by design; every capability it grants is constrained
by RLS.

## Personal data rules

- Real CV/personal data never enters Git: no fixtures, seeds, docs examples,
  screenshots or console logs. `.gitignore` blocks `private/`,
  `source-data/`, `.env*` and `paulina*` paths as a safety net.
- `ai_runs` logs hashes, token counts and status codes — never raw content.
- Real data enters only through the authenticated import workflow.

## Edge Functions

- Validate the caller's JWT and derive `user_id` from it — never from the
  request body.
- Zod-validate request bodies; enforce timeouts, limited retries and
  duplicate-request prevention via content hashing.
- Prompt-injection defence: job-advert text is treated as untrusted data,
  delimited and never interpreted as instructions; outputs are
  schema-validated and deterministically checked by Truth Lock.
