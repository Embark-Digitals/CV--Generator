# Deployment

## Production topology

| Piece | Where | Identifier |
| --- | --- | --- |
| Frontend | Vercel | project `cv-machine`, https://cv-machine.vercel.app |
| Database/Auth/Storage | Supabase | project `uonqfegzzxjbxqxfpqxe` (CV Machine, org Embark Digitals, eu-west-1) |
| Edge Functions | Supabase | extract-profile, extract-requirements, analyze-alignment, suggest-changes, assistant |

## Frontend (Vercel)

- `vercel.json`: SPA rewrite to `index.html`, security headers
  (nosniff, DENY framing, referrer and permissions policies)
- Environment variables (Production): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (anon key is public-by-design; RLS enforces
  security)
- Deploy: `vercel deploy --prod --yes`

## Database

```bash
supabase link --project-ref uonqfegzzxjbxqxfpqxe   # password in private store
supabase db push                                    # apply new migrations
supabase gen types typescript --linked > src/types/database.ts
```

## Auth configuration

Managed in `supabase/config.toml` and applied with `supabase config push`:
signup disabled, min password length 10, production + localhost redirect
URLs. **Custom SMTP is not yet configured** — password-recovery email uses
Supabase's rate-limited built-in sender (fine for the private MVP; see
INITIAL_USER_SETUP.md for the production SMTP recommendation).

## Edge Functions

```bash
supabase functions deploy extract-profile extract-requirements \
  analyze-alignment suggest-changes assistant --project-ref uonqfegzzxjbxqxfpqxe
```

Secrets (never in Git, never in the browser):

```bash
supabase secrets set OPENAI_API_KEY --project-ref uonqfegzzxjbxqxfpqxe
# optional model overrides:
supabase secrets set OPENAI_MODEL_EXTRACT=gpt-4o-mini OPENAI_MODEL_REWRITE=gpt-4o
```

## Release flow

`build/mvp` → PR → review → merge to `main` → `vercel deploy --prod`.
Never push `main` directly.
