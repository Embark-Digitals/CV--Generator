import { supabase } from '@/lib/supabase'
import { sha256Hex } from '@/lib/hash'
import type {
  ApplicationNote,
  JobApplication,
  JobRequirement,
} from '@/types/domain'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import { z } from 'zod'

function throwOnError<T>(result: {
  data: T | null
  error: { message: string } | null
}): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

// --- applications -----------------------------------------------------------

export async function fetchApplications(
  userId: string,
): Promise<JobApplication[]> {
  return throwOnError(
    await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
  )
}

export async function fetchApplication(id: string): Promise<JobApplication> {
  return throwOnError(
    await supabase.from('job_applications').select('*').eq('id', id).single(),
  )
}

export async function createApplication(
  row: TablesInsert<'job_applications'>,
): Promise<JobApplication> {
  if (row.advert_text) {
    row.advert_text_hash = await sha256Hex(row.advert_text)
  }
  return throwOnError(
    await supabase.from('job_applications').insert(row).select().single(),
  )
}

export async function updateApplication(
  id: string,
  patch: TablesUpdate<'job_applications'>,
): Promise<JobApplication> {
  if (patch.advert_text) {
    patch.advert_text_hash = await sha256Hex(patch.advert_text)
  }
  return throwOnError(
    await supabase
      .from('job_applications')
      .update(patch)
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function deleteApplication(id: string) {
  const { error } = await supabase
    .from('job_applications')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Store the original advert file privately and link it to the application. */
export async function uploadAdvertFile(
  userId: string,
  applicationId: string,
  file: File,
  extractedText: string,
) {
  const path = `${userId}/job-adverts/${applicationId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
  const { error: uploadError } = await supabase.storage
    .from('job-adverts')
    .upload(path, file, { contentType: file.type })
  if (uploadError) throw new Error(uploadError.message)

  const doc = throwOnError<{ id: string }>(
    await supabase
      .from('uploaded_documents')
      .insert({
        user_id: userId,
        kind: 'job_advert',
        job_application_id: applicationId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        extracted_text: extractedText,
        text_hash: await sha256Hex(extractedText),
      })
      .select()
      .single(),
  )
  await updateApplication(applicationId, {
    advert_text: extractedText,
    advert_document_id: doc.id,
  })
}

// --- requirements ------------------------------------------------------------

export async function fetchRequirements(
  applicationId: string,
): Promise<JobRequirement[]> {
  return throwOnError(
    await supabase
      .from('job_requirements')
      .select('*')
      .eq('job_application_id', applicationId)
      .order('display_order'),
  )
}

export async function insertRequirement(
  row: TablesInsert<'job_requirements'>,
): Promise<JobRequirement> {
  return throwOnError(
    await supabase.from('job_requirements').insert(row).select().single(),
  )
}

export async function updateRequirement(
  id: string,
  patch: TablesUpdate<'job_requirements'>,
): Promise<JobRequirement> {
  return throwOnError(
    await supabase
      .from('job_requirements')
      .update(patch)
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase
    .from('job_requirements')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// --- extraction (Edge Function) ----------------------------------------------

const extractedRequirementSchema = z.object({
  kind: z.string(),
  priority: z.enum(['required', 'preferred']),
  description: z.string().min(1),
})

const extractionResultSchema = z.object({
  job_title: z.string().nullish(),
  company: z.string().nullish(),
  location: z.string().nullish(),
  employment_type: z.string().nullish(),
  seniority: z.string().nullish(),
  closing_date: z.string().nullish(),
  requirements: z.array(extractedRequirementSchema).default([]),
})

export type RequirementExtraction = z.infer<typeof extractionResultSchema>

export async function extractRequirements(
  applicationId: string,
): Promise<RequirementExtraction> {
  const { data, error } = await supabase.functions.invoke(
    'extract-requirements',
    { body: { job_application_id: applicationId } },
  )
  if (error) {
    throw new Error(
      'AI requirement extraction is unavailable right now. You can add requirements manually below.',
    )
  }
  const parsed = extractionResultSchema.safeParse(data?.extraction)
  if (!parsed.success) {
    throw new Error('Requirement extraction returned an unexpected format.')
  }
  return parsed.data
}

// --- notes -------------------------------------------------------------------

export async function fetchNotes(
  applicationId: string,
): Promise<ApplicationNote[]> {
  return throwOnError(
    await supabase
      .from('application_notes')
      .select('*')
      .eq('job_application_id', applicationId)
      .order('created_at', { ascending: false }),
  )
}

export async function insertNote(row: TablesInsert<'application_notes'>) {
  return throwOnError(
    await supabase.from('application_notes').insert(row).select().single(),
  )
}

export async function deleteNote(id: string) {
  const { error } = await supabase
    .from('application_notes')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
