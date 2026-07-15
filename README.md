# CV Machine

**One career profile. Every application tailored — truthfully.**

CV Machine is a private career workspace built by Embark Digitals. It keeps a
single verified Master Career Profile and tailors a truthful, ATS-friendly CV
for every job application. Every tailored claim is traceable to verified
career evidence — this is enforced by the **Truth Lock** validation layer, not
just by prompting.

## Status

Private single-user MVP. Not a public SaaS, not a job-application bot.
The source code is public by owner decision; the application, its data and
all credentials remain private — no secrets or personal data ever enter this
repository.

## Architecture

React (Vite + TypeScript)
→ Supabase Auth
→ Supabase PostgreSQL with Row Level Security
→ Supabase private Storage
→ Supabase Edge Functions
→ OpenAI provider adapter
→ OpenAI API

See [docs/PRODUCT_ARCHITECTURE.md](docs/PRODUCT_ARCHITECTURE.md).

## Stack

- React 19, TypeScript, Vite, React Router
- Tailwind CSS v4, shadcn-style components
- React Hook Form + Zod, TanStack Query
- `pdfjs-dist` (PDF extraction), `mammoth` (DOCX extraction)
- `@react-pdf/renderer` (PDF export), `docx` (Word export)
- Supabase JS v2, Supabase Edge Functions (Deno)

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase project values
npm run dev
```

- `npm run build` — type-check and production build
- `npm test` — run unit/integration tests
- `npm run lint` — lint

## Security and privacy rules

- No real personal CV data in the repository — ever (code, fixtures, seeds,
  docs, screenshots). Real data enters only through the authenticated import
  workflow.
- The OpenAI API key exists only as a Supabase Edge Function secret.
- The service-role key never reaches the browser.
- All storage buckets are private; downloads are authenticated or signed.
- Public signup is disabled; access is enforced by RLS as well as UI.

See [docs/SECURITY.md](docs/SECURITY.md) and
[docs/AI_TRUTH_LOCK.md](docs/AI_TRUTH_LOCK.md).

## Git workflow

- `main` — approved production releases only (never pushed directly)
- `build/mvp` — active implementation and integration
- `feature/*`, `fix/*`, `audit/*` — scoped branches

See [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md).
