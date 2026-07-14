// Truth Lock deterministic validator — the honesty guarantee.
// These tests exercise the exact module deployed inside Edge Functions.
import { describe, expect, it } from 'vitest'
import {
  validateSuggestion,
  type EvidenceItem,
  type ProposedSuggestion,
} from '../../supabase/functions/_shared/truth-lock'

const evidence: EvidenceItem[] = [
  {
    id: 'ev-bullet-1',
    kind: 'responsibility',
    text: 'Assisted with monthly reconciliations of supplier accounts — during Bookkeeper at Acme Ltd',
  },
  {
    id: 'ev-skill-1',
    kind: 'system',
    text: 'Pastel',
  },
  {
    id: 'ev-metric-1',
    kind: 'responsibility',
    text: 'Processed 120 supplier invoices per month',
  },
  {
    id: 'ev-lead-1',
    kind: 'responsibility',
    text: 'Led a team of two junior clerks during month-end',
  },
]

function bulletSuggestion(
  overrides: Partial<ProposedSuggestion>,
): ProposedSuggestion {
  return {
    target_section: 'experience',
    target_record_type: 'experience_bullet',
    target_record_id: 'bullet-1',
    original_text: 'Assisted with monthly reconciliations of supplier accounts',
    proposed_text: 'Assisted with monthly supplier account reconciliations',
    reason: 'Mirror advert terminology',
    evidence_ids: ['ev-bullet-1'],
    ...overrides,
  }
}

describe('Truth Lock validator', () => {
  it('accepts a same-tier rephrase backed by evidence', () => {
    const result = validateSuggestion(bulletSuggestion({}), { evidence })
    expect(result.passed).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('accepts helped -> assisted style rephrasing', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        original_text: 'Helped with supplier reconciliations',
        proposed_text: 'Assisted with supplier reconciliations',
      }),
      { evidence },
    )
    expect(result.passed).toBe(true)
  })

  it('rejects a suggestion with no evidence IDs', () => {
    const result = validateSuggestion(
      bulletSuggestion({ evidence_ids: [] }),
      { evidence },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain('no_evidence')
  })

  it('rejects evidence IDs that are not in the verified catalogue (including other users records)', () => {
    const result = validateSuggestion(
      bulletSuggestion({ evidence_ids: ['someone-elses-evidence-id'] }),
      { evidence },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain('unknown_evidence')
  })

  it('rejects fabricated percentages', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        proposed_text:
          'Assisted with monthly reconciliations, improving accuracy by 30%',
      }),
      { evidence },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain(
      'unsupported_metric',
    )
  })

  it('accepts metrics that appear in cited evidence', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        original_text: 'Processed supplier invoices',
        proposed_text: 'Processed 120 supplier invoices per month',
        evidence_ids: ['ev-metric-1'],
      }),
      { evidence },
    )
    expect(result.passed).toBe(true)
  })

  it('rejects assisted -> managed authority upgrades', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        proposed_text: 'Managed monthly reconciliations of supplier accounts',
      }),
      { evidence },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain(
      'authority_upgrade',
    )
  })

  it('rejects supported -> led upgrades', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        original_text: 'Supported month-end processes',
        proposed_text: 'Led month-end processes',
      }),
      { evidence },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain(
      'authority_upgrade',
    )
  })

  it('allows leadership wording when the cited evidence contains it', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        original_text: 'Supervised two junior clerks',
        proposed_text: 'Led a team of two junior clerks during month-end',
        evidence_ids: ['ev-lead-1'],
      }),
      { evidence },
    )
    expect(result.passed).toBe(true)
  })

  it('rejects exposure -> expert proficiency upgrades', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        original_text: 'Exposure to Pastel',
        proposed_text: 'Expert in Pastel',
        evidence_ids: ['ev-skill-1'],
      }),
      { evidence },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain(
      'proficiency_upgrade',
    )
  })

  it('rejects software the user has no verified evidence for', () => {
    const result = validateSuggestion(
      bulletSuggestion({
        proposed_text:
          'Assisted with monthly reconciliations of supplier accounts using SAP',
      }),
      { evidence, unverifiedSystems: ['SAP'] },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain(
      'unsupported_system',
    )
  })

  it('blocks AI edits to employers, dates, titles, qualifications and certifications', () => {
    for (const type of [
      'experience',
      'education',
      'certification',
      'employment_dates',
      null,
    ]) {
      const result = validateSuggestion(
        bulletSuggestion({ target_record_type: type }),
        { evidence },
      )
      expect(result.passed).toBe(false)
      expect(result.violations.map((v) => v.code)).toContain(
        'protected_field',
      )
    }
  })

  it('rejects empty proposed text', () => {
    const result = validateSuggestion(
      bulletSuggestion({ proposed_text: '   ' }),
      { evidence },
    )
    expect(result.passed).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain('empty_text')
  })
})
