import { supabase } from '@/lib/supabase'
import type { CvVersion, TailoredCv } from '@/types/domain'
import type { Json } from '@/types/database'
import { cvDocumentSchema, type CvDocument } from '@/features/tailor/document'

function throwOnError<T>(result: {
  data: T | null
  error: { message: string } | null
}): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

export async function fetchVersions(
  tailoredCvId: string,
): Promise<CvVersion[]> {
  return throwOnError(
    await supabase
      .from('cv_versions')
      .select('*')
      .eq('tailored_cv_id', tailoredCvId)
      .order('version_number', { ascending: false }),
  )
}

export async function fetchVersionsForApplication(
  applicationId: string,
): Promise<CvVersion[]> {
  return throwOnError(
    await supabase
      .from('cv_versions')
      .select('*')
      .eq('job_application_id', applicationId)
      .order('created_at', { ascending: false }),
  )
}

/**
 * Snapshot the active draft into an immutable numbered version, recording
 * the accepted suggestions, advert hash and visibility that produced it.
 */
export async function createVersion(
  userId: string,
  cv: TailoredCv,
  document: CvDocument,
): Promise<CvVersion> {
  const { data: latest } = await supabase
    .from('cv_versions')
    .select('version_number')
    .eq('tailored_cv_id', cv.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const versionNumber = (latest?.version_number ?? 0) + 1

  const { data: accepted } = await supabase
    .from('ai_suggestions')
    .select('id')
    .eq('tailored_cv_id', cv.id)
    .in('status', ['accepted', 'manually_edited'])

  const { data: app } = await supabase
    .from('job_applications')
    .select('advert_text_hash')
    .eq('id', cv.job_application_id)
    .single()

  return throwOnError(
    await supabase
      .from('cv_versions')
      .insert({
        tailored_cv_id: cv.id,
        job_application_id: cv.job_application_id,
        user_id: userId,
        version_number: versionNumber,
        status: 'ready',
        template: cv.template,
        document: document as unknown as Json,
        master_snapshot: document as unknown as Json,
        visibility_settings: document.visibility as unknown as Json,
        advert_text_hash: app?.advert_text_hash ?? null,
        accepted_suggestion_ids: (accepted ?? []).map((s) => s.id),
      })
      .select()
      .single(),
  )
}

export async function lockVersion(id: string): Promise<CvVersion> {
  return throwOnError(
    await supabase
      .from('cv_versions')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
  )
}

/** Mark a version as the one actually submitted to the employer. */
export async function submitVersion(
  version: CvVersion,
  appliedAt: string,
): Promise<void> {
  const now = new Date().toISOString()
  // Lock first if still editable (ready/draft), then submit.
  if (version.status === 'draft' || version.status === 'ready') {
    const { error } = await supabase
      .from('cv_versions')
      .update({ status: 'locked', locked_at: now })
      .eq('id', version.id)
    if (error) throw new Error(error.message)
  }
  const { error: submitError } = await supabase
    .from('cv_versions')
    .update({ status: 'submitted', submitted_at: now })
    .eq('id', version.id)
  if (submitError) throw new Error(submitError.message)

  const { error: appError } = await supabase
    .from('job_applications')
    .update({
      submitted_cv_version_id: version.id,
      applied_at: appliedAt,
    })
    .eq('id', version.job_application_id)
  if (appError) throw new Error(appError.message)

  // The tailoring workspace for a submitted CV is no longer a draft.
  await supabase
    .from('tailored_cvs')
    .update({ status: 'submitted' })
    .eq('id', version.tailored_cv_id)
}

/**
 * Restore: copy an immutable version's document back into the active draft.
 * The version itself never changes — restoring always produces a new draft.
 */
export async function restoreVersion(version: CvVersion): Promise<void> {
  const parsed = cvDocumentSchema.safeParse(version.document)
  if (!parsed.success) {
    throw new Error('This version has an unreadable document snapshot.')
  }
  const { error } = await supabase
    .from('tailored_cvs')
    .update({ document: version.document, status: 'draft' })
    .eq('id', version.tailored_cv_id)
  if (error) throw new Error(error.message)
}

export async function deleteVersion(id: string): Promise<void> {
  // The DB trigger refuses deletion of locked/submitted versions.
  const { error } = await supabase.from('cv_versions').delete().eq('id', id)
  if (error) {
    throw new Error(
      error.message.includes('immutable') || error.message.includes('cannot')
        ? 'Locked or submitted versions cannot be deleted.'
        : error.message,
    )
  }
}

export async function fetchExportsForVersion(versionId: string) {
  return throwOnError(
    await supabase
      .from('exports')
      .select('*')
      .eq('cv_version_id', versionId)
      .order('created_at', { ascending: false }),
  )
}
