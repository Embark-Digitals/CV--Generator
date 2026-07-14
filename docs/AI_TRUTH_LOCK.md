# Truth Lock

Truth Lock is CV Machine's defining feature: **every tailored claim must be
traceable to verified career evidence**. It is enforced in three layers, and
an AI-generated statement about its own honesty is never one of them.

## Layer 1 — restrictive prompts

The `suggest-changes` and `assistant` system prompts allow only: rephrasing
verified content, mirroring advert terminology, condensing repetition and
rewriting the summary from verified facts. They forbid inventing or
upgrading employers, dates, titles, qualifications, certifications, software,
responsibilities, achievements, metrics, team sizes, seniority, authority or
proficiency.

## Layer 2 — evidence IDs on every claim

Every proposal must cite `evidence_ids` drawn from the verified-evidence
catalogue (`_shared/evidence.ts`): only `verified` / `user_confirmed`
records, read through a user-scoped RLS client, so foreign or unverified
records can never be cited.

## Layer 3 — deterministic validation (`_shared/truth-lock.ts`)

Pure TypeScript, unit-tested by Vitest and executed unchanged inside Edge
Functions. Checks per proposal:

| Check | Violation code |
| --- | --- |
| Evidence list non-empty | `no_evidence` |
| Every cited ID exists in the user's verified catalogue | `unknown_evidence` |
| Every number/percentage/amount in the proposal already appears in the original text or cited evidence | `unsupported_metric` |
| No authority upgrade (managed/led/directed/head of/oversaw/supervised/…) beyond original + evidence | `authority_upgrade` |
| No proficiency upgrade (expert/proficient/advanced/specialist/…) beyond original + evidence | `proficiency_upgrade` |
| No mention of systems the user lacks verified evidence for | `unsupported_system` |
| Target is editable content only (`summary`, `headline`, `experience_bullet`) — employers, dates, titles, qualifications, certifications are structurally untouchable | `protected_field` |
| Proposed text non-empty | `empty_text` |

Permitted same-tier rephrasing: *helped → assisted*, *worked on →
supported*, *responsible for processing → processed*.

Blocked without confirmation: *assisted → managed*, *supported → led*,
*participated → directed*, *exposure to → expert in*, *familiar with →
proficient in*, adding any unsupported figure.

## Disposition

- Proposals that **pass** are stored as `pending` suggestions with their
  `validation_result`, and surface in the review panel (original vs
  suggested, reason, evidence, Accept / Edit / Reject).
- Proposals that **fail** are stored as `rejected` with their violations —
  transparent, but never shown as actionable and never applied.
- Accepted/edited text changes only the active tailored draft document.
  The Master Career Profile changes only when the user separately confirms
  new evidence (confirmation questions → `user_confirmed_evidence`).
- Chat replies never modify the CV directly; any change the assistant wants
  becomes a pending suggestion through the same pipeline.

## Missing requirements stay missing

Requirements classified `not_evidenced` or `needs_confirmation` are never
written into the CV. `needs_confirmation` produces a question; only the
user's explicit answer creates usable evidence.
