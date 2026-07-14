// The canonical CvDocument model — the single source consumed by the live
// preview, the PDF renderer and the DOCX renderer so all three always agree.
// Node IDs are preserved from Master Career Profile records so AI
// suggestions and Truth Lock can trace every piece of content to evidence.
import { z } from 'zod'
import type {
  Certification,
  Education,
  ExperienceWithBullets,
  Profile,
  Reference,
  Skill,
  VisibilitySettings,
} from '@/types/domain'

export const SECTION_KEYS = [
  'summary',
  'skills',
  'systems',
  'experience',
  'education',
  'certifications',
  'references',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

export const sectionTitles: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  skills: 'Skills',
  systems: 'Systems & Software',
  experience: 'Employment History',
  education: 'Education',
  certifications: 'Certifications',
  references: 'References',
}

export const visibilityRulesSchema = z.object({
  address_mode: z.enum(['full', 'city_only', 'hidden']),
  show_email: z.boolean(),
  show_phone: z.boolean(),
  show_date_of_birth: z.boolean(),
  show_gender: z.boolean(),
  show_nationality: z.boolean(),
  show_drivers_licence: z.boolean(),
  references_mode: z.enum(['full', 'on_request', 'hidden']),
})

export type VisibilityRules = z.infer<typeof visibilityRulesSchema>

export const cvDocumentSchema = z.object({
  version: z.literal(1),
  header: z.object({
    full_name: z.string(),
    headline: z.string(),
  }),
  contact: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    address_line: z.string().nullable(),
    city: z.string().nullable(),
    region: z.string().nullable(),
    postal_code: z.string().nullable(),
    country: z.string().nullable(),
    date_of_birth: z.string().nullable(),
    gender: z.string().nullable(),
    nationality: z.string().nullable(),
    drivers_licence: z.string().nullable(),
  }),
  summary: z.string(),
  skills: z.array(z.object({ id: z.string(), name: z.string() })),
  systems: z.array(z.object({ id: z.string(), name: z.string() })),
  experiences: z.array(
    z.object({
      id: z.string(),
      company: z.string(),
      title: z.string(),
      location: z.string().nullable(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      is_current: z.boolean(),
      bullets: z.array(z.object({ id: z.string(), content: z.string() })),
    }),
  ),
  education: z.array(
    z.object({
      id: z.string(),
      institution: z.string(),
      qualification: z.string(),
      field_of_study: z.string().nullable(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      grade: z.string().nullable(),
    }),
  ),
  certifications: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      issuer: z.string().nullable(),
      issue_date: z.string().nullable(),
    }),
  ),
  references: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      relationship: z.string().nullable(),
      company: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    }),
  ),
  sectionOrder: z.array(z.enum(SECTION_KEYS)),
  sectionVisibility: z.record(z.enum(SECTION_KEYS), z.boolean()),
  visibility: visibilityRulesSchema,
})

export type CvDocument = z.infer<typeof cvDocumentSchema>

const isUsable = (status: string) =>
  status === 'verified' || status === 'user_confirmed'

/**
 * Build a CvDocument from the Master Career Profile. Only verified /
 * user-confirmed records enter the document — pending and rejected records
 * never appear on a CV.
 */
export function buildCvDocument(input: {
  profile: Profile
  visibility: VisibilitySettings
  experiences: ExperienceWithBullets[]
  education: Education[]
  certifications: Certification[]
  skills: Skill[]
  references: Reference[]
}): CvDocument {
  const { profile, visibility } = input
  return {
    version: 1,
    header: {
      full_name:
        profile.full_name ??
        [profile.first_name, profile.last_name].filter(Boolean).join(' '),
      headline: profile.headline ?? '',
    },
    contact: {
      email: profile.email,
      phone: profile.phone,
      address_line: profile.address_line,
      city: profile.city,
      region: profile.region,
      postal_code: profile.postal_code,
      country: profile.country,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
      nationality: profile.nationality,
      drivers_licence: profile.drivers_licence,
    },
    summary: profile.professional_summary ?? '',
    skills: input.skills
      .filter((s) => s.kind === 'skill' && isUsable(s.verification_status))
      .map((s) => ({ id: s.id, name: s.name })),
    systems: input.skills
      .filter((s) => s.kind === 'system' && isUsable(s.verification_status))
      .map((s) => ({ id: s.id, name: s.name })),
    experiences: input.experiences
      .filter((e) => isUsable(e.verification_status))
      .map((e) => ({
        id: e.id,
        company: e.company,
        title: e.title,
        location: e.location,
        start_date: e.start_date,
        end_date: e.end_date,
        is_current: e.is_current,
        bullets: e.experience_bullets
          .filter((b) => isUsable(b.verification_status))
          .map((b) => ({ id: b.id, content: b.content })),
      })),
    education: input.education
      .filter((e) => isUsable(e.verification_status))
      .map((e) => ({
        id: e.id,
        institution: e.institution,
        qualification: e.qualification,
        field_of_study: e.field_of_study,
        start_date: e.start_date,
        end_date: e.end_date,
        grade: e.grade,
      })),
    certifications: input.certifications
      .filter((c) => isUsable(c.verification_status))
      .map((c) => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer,
        issue_date: c.issue_date,
      })),
    references: input.references
      .filter((r) => isUsable(r.verification_status))
      .map((r) => ({
        id: r.id,
        name: r.name,
        relationship: r.relationship,
        company: r.company,
        email: r.email,
        phone: r.phone,
      })),
    sectionOrder: [...SECTION_KEYS],
    sectionVisibility: Object.fromEntries(
      SECTION_KEYS.map((k) => [k, true]),
    ) as Record<SectionKey, boolean>,
    visibility: {
      address_mode: visibility.address_mode,
      show_email: visibility.show_email,
      show_phone: visibility.show_phone,
      show_date_of_birth: visibility.show_date_of_birth,
      show_gender: visibility.show_gender,
      show_nationality: visibility.show_nationality,
      show_drivers_licence: visibility.show_drivers_licence,
      references_mode: visibility.references_mode,
    },
  }
}

export interface SuggestionTarget {
  target_section: string
  target_record_type: string | null
  target_record_id: string | null
}

/**
 * Apply an accepted/edited suggestion's text to the document. Returns a new
 * document; throws if the target no longer exists.
 */
export function applySuggestionToDocument(
  document: CvDocument,
  target: SuggestionTarget,
  text: string,
): CvDocument {
  const next: CvDocument = structuredClone(document)
  switch (target.target_record_type) {
    case 'summary':
      next.summary = text
      return next
    case 'headline':
      next.header.headline = text
      return next
    case 'experience_bullet': {
      for (const exp of next.experiences) {
        const bullet = exp.bullets.find((b) => b.id === target.target_record_id)
        if (bullet) {
          bullet.content = text
          return next
        }
      }
      throw new Error('The responsibility this suggestion targets is no longer on the CV.')
    }
    default:
      throw new Error('Unsupported suggestion target.')
  }
}

/** Contact line respecting visibility rules — shared by preview/PDF/DOCX. */
export function contactLine(doc: CvDocument): string[] {
  const v = doc.visibility
  const c = doc.contact
  const parts: string[] = []
  if (v.address_mode === 'full') {
    const address = [c.address_line, c.city, c.region, c.postal_code, c.country]
      .filter(Boolean)
      .join(', ')
    if (address) parts.push(address)
  } else if (v.address_mode === 'city_only') {
    const address = [c.city, c.country].filter(Boolean).join(', ')
    if (address) parts.push(address)
  }
  if (v.show_email && c.email) parts.push(c.email)
  if (v.show_phone && c.phone) parts.push(c.phone)
  return parts
}

/** Personal-detail line respecting visibility rules. */
export function detailLine(doc: CvDocument): string[] {
  const v = doc.visibility
  const c = doc.contact
  const parts: string[] = []
  if (v.show_date_of_birth && c.date_of_birth)
    parts.push(`Date of birth: ${c.date_of_birth}`)
  if (v.show_gender && c.gender) parts.push(`Gender: ${c.gender}`)
  if (v.show_nationality && c.nationality)
    parts.push(`Nationality: ${c.nationality}`)
  if (v.show_drivers_licence && c.drivers_licence)
    parts.push(`Driver's licence: ${c.drivers_licence}`)
  return parts
}

/** Section keys that actually render, in configured order. */
export function visibleSections(doc: CvDocument): SectionKey[] {
  return doc.sectionOrder.filter((key) => {
    if (!doc.sectionVisibility[key]) return false
    switch (key) {
      case 'summary':
        return doc.summary.trim().length > 0
      case 'skills':
        return doc.skills.length > 0
      case 'systems':
        return doc.systems.length > 0
      case 'experience':
        return doc.experiences.length > 0
      case 'education':
        return doc.education.length > 0
      case 'certifications':
        return doc.certifications.length > 0
      case 'references':
        return doc.visibility.references_mode !== 'hidden'
      default:
        return false
    }
  })
}

export function formatDateRange(
  start: string | null,
  end: string | null,
  isCurrent: boolean,
): string {
  const fmt = (d: string | null) => {
    if (!d) return ''
    const date = new Date(d)
    return Number.isNaN(date.getTime())
      ? d
      : date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
  }
  const from = fmt(start)
  const to = isCurrent ? 'Present' : fmt(end)
  return [from, to].filter(Boolean).join(' – ')
}
