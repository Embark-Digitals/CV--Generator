# Product Architecture

## North star

“One career profile. Every application tailored — truthfully.”

Engineering rule: every tailored claim must be traceable to verified career
evidence.

## System shape

```
React SPA (Vite + TS)
  ├── Supabase Auth (email/password, private access)
  ├── Supabase PostgreSQL (relational career data, RLS everywhere)
  ├── Supabase Storage (private buckets, user-scoped paths, signed URLs)
  └── Supabase Edge Functions (Deno)
        └── OpenAI provider adapter → OpenAI API
```

The browser never holds the OpenAI key or the service-role key. All AI calls
go through authenticated Edge Functions that validate the caller's JWT.

## Core domain concepts

- **Master Career Profile** — the authoritative relational career record
  (profiles, experiences, experience_bullets, education, certifications,
  skills, references…). Each record carries a verification state
  (`pending_verification` → `verified` / `user_confirmed` / `rejected`) and a
  source.
- **Job Application** — one workspace per job: the original advertisement,
  extracted requirements, alignment analysis, tailored CV versions, exports
  and status history.
- **Truth Lock** — a three-layer honesty guarantee:
  1. restrictive system prompts,
  2. evidence IDs attached to every proposed claim,
  3. a deterministic server-side validator that rejects unsupported claims.
- **CvDocument** — one canonical document model consumed by the live preview,
  the PDF renderer and the DOCX renderer, so all three always agree.
- **CV versions** — immutable snapshots per application; locked/submitted
  versions can never change; restore always creates a new draft.

## Frontend layout

- `src/pages` — routed screens
- `src/components` — UI primitives and layout
- `src/features` — domain modules (profile, import, applications, tailor…)
- `src/lib` — clients and utilities
- `src/providers` — theme, auth, query
- `supabase/migrations` — versioned SQL schema
- `supabase/functions` — Edge Functions

## Documents

Detailed references:

- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- [SECURITY.md](SECURITY.md)
- [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md)
- [AI_TRUTH_LOCK.md](AI_TRUTH_LOCK.md)
- [DOCUMENT_EXPORTS.md](DOCUMENT_EXPORTS.md)
- [TESTING.md](TESTING.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
