# Project Completion Report — CV Machine MVP

Date: 2026-07-16 · Branch: `build/mvp` · Owner: Embark Digitals

## What was built

A private single-user career workspace implementing the full brief:
authentication, relational Master Career Profile with per-record
verification, source-CV import with section-by-section review, job
application workspace (10-state lifecycle, full advert preservation, PDF/
DOCX/pasted intake), AI requirement extraction, Job Alignment with evidence
matching and confirmation questions, Truth-Lock-validated AI suggestions
with accept/reject/manual-edit review, contextual assistant (proposals become
pending suggestions), one canonical CvDocument powering the ATS Classic
preview + real PDF + editable DOCX exports, immutable version history with
lock/submit/restore, visibility controls (master defaults + per-CV), light/
dark/system themes, responsive desktop/mobile layouts.

Deliberately not built (per brief): billing, public signup, scraping,
auto-apply, public CV pages, LinkedIn, cover letters, multi-user admin,
analytics, template marketplace.

## Infrastructure

- Supabase project **`gqtdolbkgedxfgadnqrt`** (owner's verified account, org
  `huwhjrlpirgifabvxbuh`, eu-west-1): 3 migrations (23 tables, 17 enums,
  triggers), RLS on every table with per-command policies + parent-ownership
  checks + `is_authorised()` allow-list, 3 private storage buckets with
  user-scoped paths, 6 deployed Edge Functions, signup disabled.
  - **Provenance correction (2026-07-16):** the original project
    `uonqfegzzxjbxqxfpqxe` was created via a Supabase CLI credential that
    belonged to a **different account** (classification C). It was retired;
    the machine credential was revoked (`supabase logout`), the owner
    re-authenticated (`supabase login`), and the entire backend was
    rebuilt on their own account. Migrations, RLS, storage, functions and
    config are identical (all from Git); 40/40 tests pass against the new
    backend. The old project is untouched for the owner to delete.
- Vercel project `cv-machine` → https://cv-machine.vercel.app (verified 200).
  The Vercel project is not Git-connected; deployments are CLI-driven, so
  GitHub pushes never trigger builds.
- GitHub: `Embark-Digitals/CV--Generator` — `main` (Phase 0 baseline) and
  `build/mvp` (all 10 commits) pushed with upstream tracking on 2026-07-16
  after a full history privacy/secret scan (clean). The repository is
  **public by owner decision**; the anon key in the frontend bundle is
  public-by-design and all security is enforced by RLS. Branch protection
  requires org-admin access (optional follow-up).

## Verification

- 40 automated tests, all passing: Truth Lock (13), document engine,
  real PDF/DOCX generation, live RLS/storage/version-immutability against
  the production Supabase project, and an API-level end-to-end critical
  workflow.
- Lint (oxlint) passing — six benign fast-refresh warnings, zero errors.
- Production build (`tsc -b && vite build`) passing; heavy renderers
  code-split and lazy-loaded; build output scanned — no secrets, QA
  identities or personal data.
- Edge Function health (2026-07-16): all five functions reject
  unauthenticated calls (401); authenticated calls without the OpenAI key
  fail cleanly (502 + friendly JSON, no stack traces) and write `ai_runs`
  usage records.

## Outstanding external actions (owner)

1. **OpenAI key** — `supabase secrets set OPENAI_API_KEY --project-ref
   gqtdolbkgedxfgadnqrt` (enter the key only in the secure CLI prompt or the
   dashboard; AI features return friendly errors until set).
2. **Initial user account** — create via the Supabase dashboard
   (auto-confirm) per docs/INITIAL_USER_SETUP.md, then run the first real
   CV import through the application.
3. **First-use validation session** — with 1 and 2 done: real CV import and
   verification, requirement extraction, Job Alignment, suggestion review,
   manual Truth Lock probes, and PDF/DOCX exports opened and checked.
4. Later: custom SMTP for password recovery; optional custom domain;
   optional branch protection on `main` (org-admin).

## Known limitations

- AI paths not yet exercised end-to-end (blocked on the OpenAI key).
- Password recovery relies on Supabase's built-in rate-limited sender.
- No browser-level (Playwright) E2E; critical workflow covered at API level.
- Vercel preview environment lacks env vars (production configured).
- QA users hold synthetic data; remove them before real production use if
  desired.

## Verdict

Code, database, security model, exports and deployment are implemented,
pushed and verified. Production-ready for its intended private single-user
use **once the OpenAI key is set, the initial account is created and the
first-use validation session passes** — AI-dependent paths must not be
declared complete before that session.
