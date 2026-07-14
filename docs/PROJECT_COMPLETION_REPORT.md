# Project Completion Report — CV Machine MVP

Date: 2026-07-14 · Branch: `build/mvp` · Owner: Embark Digitals

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

- Supabase project `uonqfegzzxjbxqxfpqxe` (org Embark Digitals, eu-west-1):
  3 migrations (23 tables, 17 enums, triggers), RLS on every table with
  per-command policies + parent-ownership checks + `is_authorised()`
  allow-list, 3 private storage buckets with user-scoped paths, 5 deployed
  Edge Functions, signup disabled.
- Vercel project `cv-machine` → https://cv-machine.vercel.app (verified 200).
- Local git repo, 10 commits across phases 0–8; `main` holds the baseline,
  work on `build/mvp`.

## Verification

- 40 automated tests, all passing: Truth Lock (13), document engine,
  real PDF/DOCX generation, live RLS/storage/version-immutability against
  the production Supabase project, and an API-level end-to-end critical
  workflow.
- Production build (`tsc -b && vite build`) passing; heavy renderers
  code-split and lazy-loaded.

## Outstanding external actions (owner)

1. **GitHub access** — the authenticated account `Ndumiso-Y` has read-only
   access to `Embark-Digitals/CV--Generator`. Grant it write/admin (or add
   it to the org), then push `main` and `build/mvp`. The repo is currently
   **public** and must be made private (needs admin).
2. **OpenAI key** — `supabase secrets set OPENAI_API_KEY --project-ref
   uonqfegzzxjbxqxfpqxe` (AI features return friendly errors until set).
3. **Paulina's account** — create via dashboard (auto-confirm) per
   docs/INITIAL_USER_SETUP.md, then import her CV through the app.
4. Later: custom SMTP for password recovery; optional custom domain.

## Known limitations

- AI paths not yet exercised end-to-end (blocked on the OpenAI key).
- Password recovery relies on Supabase's built-in rate-limited sender.
- No browser-level (Playwright) E2E; critical workflow covered at API level.
- Vercel preview environment lacks env vars (production configured).
- QA users hold synthetic data; remove them before real production use if
  desired.

## Verdict

Production-ready for its intended private single-user use **once the three
external actions above are completed** — all code paths that do not depend
on the OpenAI key are implemented, deployed and verified.
