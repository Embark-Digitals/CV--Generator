// Truth Lock — deterministic server-side validation of AI-proposed CV
// changes. Layer 3 of the honesty guarantee: prompts restrict (layer 1),
// evidence IDs attach to every claim (layer 2), and this module verifies
// (layer 3). It never trusts an AI-generated boolean about truthfulness.
//
// Pure TypeScript with no Deno/Node APIs so the exact same code is unit
// tested by Vitest and executed inside Edge Functions.

export interface EvidenceItem {
  id: string
  kind: string
  text: string
}

export interface ProposedSuggestion {
  target_section: string
  target_record_type: string | null
  target_record_id: string | null
  original_text: string
  proposed_text: string
  reason: string
  evidence_ids: string[]
  confidence?: number
}

export interface Violation {
  code:
    | 'no_evidence'
    | 'unknown_evidence'
    | 'unsupported_metric'
    | 'authority_upgrade'
    | 'proficiency_upgrade'
    | 'unsupported_system'
    | 'protected_field'
    | 'empty_text'
  message: string
  detail?: string
}

export interface ValidationResult {
  passed: boolean
  violations: Violation[]
}

const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Numeric claims: percentages, currency, counts, "R1.2m", "30%", "15 people". */
const NUMBER_PATTERN = /(?:[R$€£]\s?)?\d+(?:[.,]\d+)?(?:\s?(?:%|percent|million|m\b|k\b))?/gi

function extractNumericTokens(text: string): string[] {
  const matches = text.match(NUMBER_PATTERN) ?? []
  return matches
    .map((m) => m.replace(/\s+/g, '').toLowerCase())
    // Years like 2019 inside dates are handled by the protected-field checks.
    .filter((m) => !/^(19|20)\d{2}$/.test(m))
}

/**
 * Authority / seniority upgrades that need explicit user confirmation.
 * If the proposed text introduces one of these terms and neither the
 * original text nor any cited evidence contains it (or a same-tier synonym),
 * the suggestion fails.
 */
const AUTHORITY_TERMS = [
  'managed',
  'manager',
  'management of',
  'led',
  'leader',
  'leading',
  'directed',
  'director',
  'head of',
  'oversaw',
  'oversee',
  'supervised',
  'supervisor',
  'in charge of',
  'accountable for',
]

const PROFICIENCY_TERMS = [
  'expert',
  'expertise',
  'proficient',
  'advanced',
  'specialist',
  'mastery',
]

function containsTerm(text: string, term: string): boolean {
  const pattern = new RegExp(
    `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'i',
  )
  return pattern.test(text)
}

export interface ValidationContext {
  /** Verified/user-confirmed evidence owned by the current user. */
  evidence: EvidenceItem[]
  /**
   * Software/system names the user does NOT have verified evidence for
   * (e.g. systems demanded by the advert). Their appearance in proposed
   * text fails validation.
   */
  unverifiedSystems?: string[]
}

export function validateSuggestion(
  suggestion: ProposedSuggestion,
  context: ValidationContext,
): ValidationResult {
  const violations: Violation[] = []
  const proposed = suggestion.proposed_text ?? ''
  const original = suggestion.original_text ?? ''

  if (!proposed.trim()) {
    violations.push({ code: 'empty_text', message: 'Proposed text is empty' })
    return { passed: false, violations }
  }

  // --- evidence must exist, belong to the user, and be verified ------------
  const evidenceById = new Map(context.evidence.map((e) => [e.id, e]))
  const citedEvidence: EvidenceItem[] = []
  if (suggestion.evidence_ids.length === 0) {
    violations.push({
      code: 'no_evidence',
      message: 'Every proposed claim must cite verified evidence',
    })
  }
  for (const id of suggestion.evidence_ids) {
    const item = evidenceById.get(id)
    if (!item) {
      violations.push({
        code: 'unknown_evidence',
        message: 'Cited evidence does not exist in the verified catalogue',
        detail: id,
      })
    } else {
      citedEvidence.push(item)
    }
  }

  const evidenceText = normalise(citedEvidence.map((e) => e.text).join(' \n '))
  const originalNorm = normalise(original)
  const supportText = `${originalNorm} \n ${evidenceText}`

  // --- metrics: every number in the proposal must already exist ------------
  const proposedNumbers = extractNumericTokens(proposed)
  const supportNumbers = new Set([
    ...extractNumericTokens(original),
    ...extractNumericTokens(citedEvidence.map((e) => e.text).join(' ')),
  ])
  for (const token of proposedNumbers) {
    if (!supportNumbers.has(token)) {
      violations.push({
        code: 'unsupported_metric',
        message: `The figure "${token}" is not present in the original text or cited evidence`,
        detail: token,
      })
    }
  }

  // --- authority and proficiency upgrades ----------------------------------
  for (const term of AUTHORITY_TERMS) {
    if (containsTerm(proposed, term) && !containsTerm(supportText, term)) {
      violations.push({
        code: 'authority_upgrade',
        message: `"${term}" upgrades authority beyond the original wording and cited evidence — needs explicit user confirmation`,
        detail: term,
      })
    }
  }
  for (const term of PROFICIENCY_TERMS) {
    if (containsTerm(proposed, term) && !containsTerm(supportText, term)) {
      violations.push({
        code: 'proficiency_upgrade',
        message: `"${term}" claims proficiency beyond the original wording and cited evidence`,
        detail: term,
      })
    }
  }

  // --- systems the user has no verified evidence for -----------------------
  for (const system of context.unverifiedSystems ?? []) {
    const name = system.trim()
    if (name.length < 2) continue
    if (containsTerm(proposed, name) && !containsTerm(supportText, name)) {
      violations.push({
        code: 'unsupported_system',
        message: `"${name}" is not part of the user's verified systems or cited evidence`,
        detail: name,
      })
    }
  }

  // --- protected structural fields are never edited via suggestions --------
  const type = suggestion.target_record_type ?? ''
  const editableTypes = new Set(['summary', 'headline', 'experience_bullet'])
  if (!editableTypes.has(type)) {
    violations.push({
      code: 'protected_field',
      message:
        'Employers, employment dates, job titles, qualifications and certifications cannot be changed by AI suggestions',
      detail: type || 'unknown',
    })
  }

  return { passed: violations.length === 0, violations }
}
