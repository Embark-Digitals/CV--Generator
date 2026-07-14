import { supabase } from '@/lib/supabase'
import type { TablesUpdate } from '@/types/database'
import type { CandidateProfile } from './schema'

export type ImportMode = 'merge' | 'replace'

export interface ImportSelection {
  personal: boolean
  summary: boolean
  experiences: boolean[]
  education: boolean[]
  certifications: boolean[]
  skills: boolean[]
  systems: boolean[]
  references: boolean[]
}

export interface ImportResult {
  inserted: number
  skippedDuplicates: number
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

/** Only accepts ISO-ish date strings; anything else becomes null. */
const asDate = (s: string | null | undefined) =>
  s && /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : null

/**
 * Write user-reviewed candidate records into the Master Career Profile.
 * Reviewed records are saved as `verified` with source `cv_import`.
 * In merge mode, records matching existing rows are skipped, never duplicated.
 */
export async function saveReviewedImport(
  userId: string,
  documentId: string,
  candidate: CandidateProfile,
  selection: ImportSelection,
): Promise<ImportResult> {
  let inserted = 0
  let skipped = 0

  const fail = (message: string): never => {
    throw new Error(message)
  }

  if (selection.personal && candidate.personal) {
    const p = candidate.personal
    const patch: TablesUpdate<'profiles'> = {
      full_name: p.full_name ?? undefined,
      first_name: p.first_name ?? undefined,
      last_name: p.last_name ?? undefined,
      email: p.email ?? undefined,
      phone: p.phone ?? undefined,
      address_line: p.address_line ?? undefined,
      city: p.city ?? undefined,
      region: p.region ?? undefined,
      postal_code: p.postal_code ?? undefined,
      country: p.country ?? undefined,
      date_of_birth: asDate(p.date_of_birth) ?? undefined,
      gender: p.gender ?? undefined,
      nationality: p.nationality ?? undefined,
      drivers_licence: p.drivers_licence ?? undefined,
    }
    for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
      const value = patch[key]
      if (value == null || String(value).trim() === '') delete patch[key]
    }
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...patch,
          verification_status: 'verified',
          source: 'cv_import',
        })
        .eq('id', userId)
      if (error) fail(error.message)
      inserted++
    }
  }

  if (selection.summary) {
    const patch: TablesUpdate<'profiles'> = {}
    if (candidate.headline?.trim()) patch.headline = candidate.headline.trim()
    if (candidate.professional_summary?.trim())
      patch.professional_summary = candidate.professional_summary.trim()
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
      if (error) fail(error.message)
      inserted++
    }
  }

  // --- experiences (with bullets) -----------------------------------------
  const { data: existingExp } = await supabase
    .from('experiences')
    .select('id, company, title')
    .eq('user_id', userId)
  const expKeys = new Set(
    (existingExp ?? []).map((e) => `${norm(e.company)}|${norm(e.title)}`),
  )

  let expOrder = existingExp?.length ?? 0
  for (let i = 0; i < candidate.experiences.length; i++) {
    if (!selection.experiences[i]) continue
    const exp = candidate.experiences[i]
    if (expKeys.has(`${norm(exp.company)}|${norm(exp.title)}`)) {
      skipped++
      continue
    }
    const { data: created, error } = await supabase
      .from('experiences')
      .insert({
        user_id: userId,
        company: exp.company,
        title: exp.title,
        location: exp.location ?? null,
        employment_type: exp.employment_type ?? null,
        start_date: asDate(exp.start_date),
        end_date: exp.is_current ? null : asDate(exp.end_date),
        is_current: exp.is_current ?? false,
        display_order: expOrder++,
        verification_status: 'verified',
        source: 'cv_import',
        source_document_id: documentId,
      })
      .select()
      .single()
    if (error) fail(error.message)
    inserted++
    if (exp.bullets.length > 0 && created) {
      const { error: bulletError } = await supabase
        .from('experience_bullets')
        .insert(
          exp.bullets
            .filter((b) => b.trim())
            .map((content, order) => ({
              experience_id: created.id,
              user_id: userId,
              content: content.trim(),
              display_order: order,
              verification_status: 'verified' as const,
              source: 'cv_import' as const,
            })),
        )
      if (bulletError) fail(bulletError.message)
      inserted += exp.bullets.length
    }
  }

  // --- education ------------------------------------------------------------
  const { data: existingEdu } = await supabase
    .from('education')
    .select('institution, qualification')
    .eq('user_id', userId)
  const eduKeys = new Set(
    (existingEdu ?? []).map(
      (e) => `${norm(e.institution)}|${norm(e.qualification)}`,
    ),
  )
  let eduOrder = existingEdu?.length ?? 0
  for (let i = 0; i < candidate.education.length; i++) {
    if (!selection.education[i]) continue
    const edu = candidate.education[i]
    if (eduKeys.has(`${norm(edu.institution)}|${norm(edu.qualification)}`)) {
      skipped++
      continue
    }
    const { error } = await supabase.from('education').insert({
      user_id: userId,
      institution: edu.institution,
      qualification: edu.qualification,
      field_of_study: edu.field_of_study ?? null,
      start_date: asDate(edu.start_date),
      end_date: asDate(edu.end_date),
      grade: edu.grade ?? null,
      display_order: eduOrder++,
      verification_status: 'verified',
      source: 'cv_import',
      source_document_id: documentId,
    })
    if (error) fail(error.message)
    inserted++
  }

  // --- certifications ---------------------------------------------------------
  const { data: existingCerts } = await supabase
    .from('certifications')
    .select('name')
    .eq('user_id', userId)
  const certKeys = new Set((existingCerts ?? []).map((c) => norm(c.name)))
  let certOrder = existingCerts?.length ?? 0
  for (let i = 0; i < candidate.certifications.length; i++) {
    if (!selection.certifications[i]) continue
    const cert = candidate.certifications[i]
    if (certKeys.has(norm(cert.name))) {
      skipped++
      continue
    }
    const { error } = await supabase.from('certifications').insert({
      user_id: userId,
      name: cert.name,
      issuer: cert.issuer ?? null,
      issue_date: asDate(cert.issue_date),
      expiry_date: asDate(cert.expiry_date),
      display_order: certOrder++,
      verification_status: 'verified',
      source: 'cv_import',
      source_document_id: documentId,
    })
    if (error) fail(error.message)
    inserted++
  }

  // --- skills & systems -------------------------------------------------------
  const { data: existingSkills } = await supabase
    .from('skills')
    .select('name, kind')
    .eq('user_id', userId)
  const skillKeys = new Set(
    (existingSkills ?? []).map((s) => `${norm(s.name)}|${s.kind}`),
  )
  let skillOrder = existingSkills?.length ?? 0

  const insertSkill = async (name: string, kind: 'skill' | 'system') => {
    if (skillKeys.has(`${norm(name)}|${kind}`)) {
      skipped++
      return
    }
    skillKeys.add(`${norm(name)}|${kind}`)
    const { error } = await supabase.from('skills').insert({
      user_id: userId,
      name: name.trim(),
      kind,
      display_order: skillOrder++,
      verification_status: 'verified',
      source: 'cv_import',
      source_document_id: documentId,
    })
    if (error) fail(error.message)
    inserted++
  }

  for (let i = 0; i < candidate.skills.length; i++) {
    if (selection.skills[i] && candidate.skills[i].trim())
      await insertSkill(candidate.skills[i], 'skill')
  }
  for (let i = 0; i < candidate.systems.length; i++) {
    if (selection.systems[i] && candidate.systems[i].trim())
      await insertSkill(candidate.systems[i], 'system')
  }

  // --- references ----------------------------------------------------------
  const { data: existingRefs } = await supabase
    .from('references')
    .select('name')
    .eq('user_id', userId)
  const refKeys = new Set((existingRefs ?? []).map((r) => norm(r.name)))
  let refOrder = existingRefs?.length ?? 0
  for (let i = 0; i < candidate.references.length; i++) {
    if (!selection.references[i]) continue
    const ref = candidate.references[i]
    if (refKeys.has(norm(ref.name))) {
      skipped++
      continue
    }
    const { error } = await supabase.from('references').insert({
      user_id: userId,
      name: ref.name,
      relationship: ref.relationship ?? null,
      company: ref.company ?? null,
      email: ref.email ?? null,
      phone: ref.phone ?? null,
      display_order: refOrder++,
      verification_status: 'verified',
      source: 'cv_import',
      source_document_id: documentId,
    })
    if (error) fail(error.message)
    inserted++
  }

  return { inserted, skippedDuplicates: skipped }
}
