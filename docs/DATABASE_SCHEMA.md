# Database Schema

Versioned migrations live in `supabase/migrations/`. Regenerate frontend
types after any change:

```bash
supabase gen types typescript --linked > src/types/database.ts
```

## Design principles

- The Master Career Profile is **relational** — no single JSON blob. Each
  employment responsibility is its own `experience_bullets` row.
- `cv_versions` snapshots are the deliberate exception: immutable JSON
  documents frozen for historical reproducibility.
- Every user-owned row has explicit `user_id` ownership (or `id` = user id
  for one-row-per-user tables) and `created_at`/`updated_at` timestamps
  maintained by trigger.
- Imported/AI data is never trusted: rows carry `verification_status`
  (`pending_verification` → `verified` / `user_confirmed` / `rejected`) and
  `source` (`cv_import` / `manual` / `ai` / `user_confirmation`).

## Tables

### Identity & preferences

| Table | Purpose |
| --- | --- |
| `user_roles` | Authorised-user allow-list (`owner`/`admin`). Written only by the auth bootstrap trigger / service role. `public.is_authorised()` checks membership and is embedded in every RLS policy. |
| `profiles` | One row per user: personal details, professional identity, summary. PK = `auth.users.id`. |
| `profile_visibility_settings` | Master visibility defaults (address mode, email/phone/DOB/gender/nationality/licence toggles, references mode). |
| `template_preferences` | Template, typography, spacing, page preferences (A4). |

### Master Career Profile

| Table | Purpose |
| --- | --- |
| `uploaded_documents` | Private file metadata + extracted text (source CVs, job adverts). |
| `experiences` | Employment history rows with date-order check constraint. |
| `experience_bullets` | Individual responsibilities; FK → `experiences` (cascade). |
| `education` | Qualifications. |
| `certifications` | Certifications with issue/expiry dates. |
| `skills` | Skills and systems/software (`kind`: `skill`/`system`); unique per user on `lower(name), kind`. |
| `references` | Referees (quoted identifier — SQL keyword). |

### Job workspace

| Table | Purpose |
| --- | --- |
| `job_applications` | Company, title, advert text + hash, status enum (10 states from `considering` to `archived`), `applied_at`, `submitted_cv_version_id`. |
| `job_requirements` | Stable-ID requirements with `kind`, `priority` (`required`/`preferred`), `alignment` (`supported`/`partially_supported`/`not_evidenced`/`needs_confirmation`), `evidence_ids uuid[]`. |
| `job_analysis_runs` | Alignment analysis snapshots with `input_hash` for caching and `alignment_score` (0–100 check). |
| `application_notes` | Free-form notes per application. |

### Tailoring & versions

| Table | Purpose |
| --- | --- |
| `tailored_cvs` | Active tailoring workspace per application: canonical `document` JSON, template, visibility overrides. |
| `cv_sections` | Per-CV section order/visibility/content; unique `(tailored_cv_id, section_key)`. |
| `cv_versions` | Immutable numbered snapshots (unique `(tailored_cv_id, version_number)`): document, master snapshot, visibility, advert hash, accepted suggestions, lock/submit timestamps. |
| `exports` | Generated PDF/DOCX files; `cv_version_id` FK is `ON DELETE RESTRICT` so exports stay linked. |

### AI & Truth Lock

| Table | Purpose |
| --- | --- |
| `ai_runs` | Usage log: kind, model, status, input hash, token counts, duration. **No raw prompt/response bodies** (safe logging). |
| `ai_suggestions` | Every proposed change: target section/record, original + proposed text, reason, `evidence_ids`, confidence, deterministic `validation_result`, status (`pending`/`accepted`/`rejected`/`manually_edited`). |
| `confirmation_questions` | Questions raised when a requirement needs user confirmation. |
| `user_confirmed_evidence` | Evidence explicitly confirmed by the user in answer to questions. |

## Integrity rules

- `enforce_cv_version_immutability()` trigger: locked/submitted versions
  reject any content change or deletion; only `locked → submitted` and
  `→ archived` status transitions are allowed.
- `handle_new_user()` trigger on `auth.users`: bootstraps `user_roles`,
  `profiles`, `profile_visibility_settings`, `template_preferences`.
  Public signup is disabled, so every user is administratively intended.
- Deletion behaviour: user deletion cascades everywhere; parent records
  cascade to children (experiences → bullets, applications → requirements);
  `exports.cv_version_id` restricts version deletion.

## Storage

Three private buckets — `source-cvs`, `job-adverts`, `exports` — 20 MB
limit, PDF/DOCX mime allow-lists, and `{user_id}/…` path scoping enforced by
`storage.objects` policies. See migration `20260714000300_storage.sql`.
