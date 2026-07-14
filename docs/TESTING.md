# Testing

Run everything: `npm test` (Vitest). 40 tests across 5 suites.

## Suites

### `truth-lock.test.ts` — 13 unit tests
The deterministic Truth Lock validator (the exact module deployed in Edge
Functions): same-tier rephrasing passes; missing evidence, unknown/foreign
evidence IDs, fabricated percentages, assisted→managed and supported→led
authority upgrades, exposure→expert proficiency upgrades, unverified
software mentions, protected structural fields (employer/dates/titles/
qualifications/certifications) and empty text all fail.

### `document.test.ts` — document engine unit tests
`buildCvDocument` includes only verified/user-confirmed records; schema
validity; visibility rules (city-only vs hidden address, hidden personal
fields, references modes, empty sections, section toggles);
`applySuggestionToDocument` (immutability, by-id targeting, missing targets,
protected targets); export filename sanitisation.

### `exports.test.ts` — real document generation (Node)
DOCX output is a valid ZIP/Word package, including long-content and
hidden-references cases; PDF output starts with `%PDF-` and renders one- and
two-page CVs through the same component the app ships.

### `security.integration.test.ts` — live RLS/storage/versioning (7 tests)
Runs against the real Supabase project using local QA credentials
(`.env` + `private/qa-users.txt`, both gitignored) and **skips automatically
when they are absent**. Covers: unauthenticated denial on all core tables,
cross-user profile/suggestion reads, spoofed-owner inserts, child records
under a foreign parent, cross-user storage writes and downloads, and version
immutability (locked versions reject edits and deletes; the snapshot stays
stable while the draft changes; locked→submitted allowed; submitted→draft
rejected).

### `workflow.e2e.test.ts` — critical workflow (live)
Application → requirements → tailored CV → saved version → lock → submitted →
application linkage → tamper rejection, at the API level with cleanup.

## AI-path testing

Model calls require the `OPENAI_API_KEY` secret, so the AI functions are
covered by: Zod validation of requests/responses, the deterministic
alignment post-check, the Truth Lock suite, and graceful-failure UI paths
(every function failure surfaces a friendly retryable error). After the key
is set, exercise: import extraction, requirement extraction, alignment,
suggestion generation and the assistant end-to-end manually once.

## QA users

Two auto-confirmed QA accounts (`qa-user-one/two@cvmachine.invalid`) exist
for the live suites; credentials in `private/qa-users.txt`. They hold only
synthetic data. Real personal data is never used in tests or fixtures.
