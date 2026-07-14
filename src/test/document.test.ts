import { describe, expect, it } from 'vitest'
import {
  applySuggestionToDocument,
  buildCvDocument,
  contactLine,
  cvDocumentSchema,
  detailLine,
  visibleSections,
} from '@/features/tailor/document'
import { exportFileName } from '@/features/tailor/export/filename'
import { sampleDocument } from './fixtures'
import type {
  ExperienceWithBullets,
  Profile,
  VisibilitySettings,
} from '@/types/domain'

const baseProfile = {
  id: 'user-1',
  full_name: 'Test Candidate',
  first_name: 'Test',
  last_name: 'Candidate',
  headline: 'Bookkeeper',
  professional_summary: 'Summary text.',
  email: 'candidate@example.com',
  phone: '000',
  address_line: '1 Example Street',
  city: 'Johannesburg',
  region: 'Gauteng',
  postal_code: '2000',
  country: 'South Africa',
  date_of_birth: '1990-01-01',
  gender: 'Female',
  nationality: 'South African',
  drivers_licence: 'Code B',
  verification_status: 'verified',
  source: 'manual',
  created_at: '',
  updated_at: '',
} as unknown as Profile

const baseVisibility = {
  user_id: 'user-1',
  address_mode: 'city_only',
  show_email: true,
  show_phone: true,
  show_date_of_birth: false,
  show_gender: false,
  show_nationality: false,
  show_drivers_licence: false,
  references_mode: 'on_request',
  created_at: '',
  updated_at: '',
} as unknown as VisibilitySettings

function experience(
  status: string,
  bulletStatuses: string[],
): ExperienceWithBullets {
  return {
    id: `exp-${status}`,
    user_id: 'user-1',
    company: 'Acme',
    title: 'Bookkeeper',
    location: null,
    employment_type: null,
    start_date: '2020-01-01',
    end_date: null,
    is_current: true,
    summary: null,
    display_order: 0,
    verification_status: status,
    source: 'manual',
    source_document_id: null,
    created_at: '',
    updated_at: '',
    experience_bullets: bulletStatuses.map((s, i) => ({
      id: `bullet-${i}-${s}`,
      experience_id: `exp-${status}`,
      user_id: 'user-1',
      content: `Bullet ${i}`,
      display_order: i,
      verification_status: s,
      source: 'manual',
      created_at: '',
      updated_at: '',
    })),
  } as unknown as ExperienceWithBullets
}

describe('buildCvDocument', () => {
  it('includes only verified and user_confirmed records', () => {
    const doc = buildCvDocument({
      profile: baseProfile,
      visibility: baseVisibility,
      experiences: [
        experience('verified', ['verified', 'pending_verification', 'rejected']),
        experience('pending_verification', ['verified']),
        experience('user_confirmed', ['user_confirmed']),
      ],
      education: [],
      certifications: [],
      skills: [],
      references: [],
    })
    expect(doc.experiences).toHaveLength(2)
    expect(doc.experiences[0].bullets).toHaveLength(1)
    expect(doc.experiences[1].bullets).toHaveLength(1)
  })

  it('produces a document that satisfies the schema', () => {
    const doc = buildCvDocument({
      profile: baseProfile,
      visibility: baseVisibility,
      experiences: [],
      education: [],
      certifications: [],
      skills: [],
      references: [],
    })
    expect(cvDocumentSchema.safeParse(doc).success).toBe(true)
  })
})

describe('visibility rules', () => {
  it('city_only address shows city and country but not street', () => {
    const doc = sampleDocument()
    const line = contactLine(doc).join(' ')
    expect(line).toContain('Johannesburg')
    expect(line).not.toContain('1 Example Street')
  })

  it('hidden address shows no location at all', () => {
    const doc = sampleDocument()
    doc.visibility.address_mode = 'hidden'
    const line = contactLine(doc).join(' ')
    expect(line).not.toContain('Johannesburg')
  })

  it('hidden personal fields never appear', () => {
    const doc = sampleDocument()
    expect(detailLine(doc)).toHaveLength(0)
  })

  it('personal fields appear when enabled', () => {
    const doc = sampleDocument()
    doc.visibility.show_date_of_birth = true
    doc.visibility.show_drivers_licence = true
    const line = detailLine(doc).join(' ')
    expect(line).toContain('1990-01-01')
    expect(line).toContain('Code B')
  })

  it('references section renders in on_request mode and hides in hidden mode', () => {
    const doc = sampleDocument()
    expect(visibleSections(doc)).toContain('references')
    doc.visibility.references_mode = 'hidden'
    expect(visibleSections(doc)).not.toContain('references')
  })

  it('empty sections do not render', () => {
    const doc = sampleDocument({ skills: [], summary: '' })
    const sections = visibleSections(doc)
    expect(sections).not.toContain('skills')
    expect(sections).not.toContain('summary')
  })

  it('section visibility toggles are respected', () => {
    const doc = sampleDocument()
    doc.sectionVisibility.education = false
    expect(visibleSections(doc)).not.toContain('education')
  })
})

describe('applySuggestionToDocument', () => {
  it('applies a summary change immutably', () => {
    const doc = sampleDocument()
    const next = applySuggestionToDocument(
      doc,
      { target_section: 'summary', target_record_type: 'summary', target_record_id: null },
      'New summary.',
    )
    expect(next.summary).toBe('New summary.')
    expect(doc.summary).not.toBe('New summary.')
  })

  it('applies a bullet change by id', () => {
    const doc = sampleDocument()
    const next = applySuggestionToDocument(
      doc,
      {
        target_section: 'experience',
        target_record_type: 'experience_bullet',
        target_record_id: 'b2',
      },
      'Assisted with month-end reporting and audit preparation.',
    )
    expect(next.experiences[0].bullets[1].content).toContain('audit')
  })

  it('throws when the target bullet no longer exists', () => {
    const doc = sampleDocument()
    expect(() =>
      applySuggestionToDocument(
        doc,
        {
          target_section: 'experience',
          target_record_type: 'experience_bullet',
          target_record_id: 'missing',
        },
        'text',
      ),
    ).toThrow()
  })

  it('refuses unsupported targets', () => {
    const doc = sampleDocument()
    expect(() =>
      applySuggestionToDocument(
        doc,
        {
          target_section: 'experience',
          target_record_type: 'experience',
          target_record_id: 'e1',
        },
        'Evil Corp',
      ),
    ).toThrow()
  })
})

describe('exportFileName', () => {
  it('builds the professional sanitised name', () => {
    const name = exportFileName(
      'Jane Doe',
      'Senior Bookkeeper',
      'Acme (Pty) Ltd.',
      'pdf',
      new Date(2026, 6, 14),
    )
    expect(name).toBe('Jane-Doe_Senior-Bookkeeper_Acme-Pty-Ltd_2026-07-14.pdf')
  })

  it('never produces unsafe characters', () => {
    const name = exportFileName('Ãnna / O\'Brien', 'C++ & "Dev"', 'A|B<C>', 'docx')
    expect(name).toMatch(/^[\w.-]+\.docx$/)
  })
})
