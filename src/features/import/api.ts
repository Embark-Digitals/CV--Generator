import { supabase } from '@/lib/supabase'
import { sha256Hex } from '@/lib/hash'
import { PDF_MIME } from '@/lib/extract-text'
import { candidateProfileSchema, type CandidateProfile } from './schema'
import type { UploadedDocument } from '@/types/domain'

/**
 * Upload the original source CV to private storage and record it with the
 * extracted text. Path is always {user_id}/source-cvs/... (RLS-scoped).
 */
export async function uploadSourceCv(
  userId: string,
  file: File,
  extractedText: string,
): Promise<UploadedDocument> {
  const stamp = Date.now()
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const path = `${userId}/source-cvs/${stamp}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('source-cvs')
    .upload(path, file, { contentType: file.type || PDF_MIME })
  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('uploaded_documents')
    .insert({
      user_id: userId,
      kind: 'source_cv',
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || PDF_MIME,
      size_bytes: file.size,
      extracted_text: extractedText,
      text_hash: await sha256Hex(extractedText),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

/** Call the secure extraction Edge Function for a stored document. */
export async function extractProfile(
  documentId: string,
): Promise<CandidateProfile> {
  const { data, error } = await supabase.functions.invoke('extract-profile', {
    body: { document_id: documentId },
  })
  if (error) {
    throw new Error(
      'AI extraction is unavailable. You can still add records manually, or retry once the AI service is configured.',
    )
  }
  const parsed = candidateProfileSchema.safeParse(data?.candidate)
  if (!parsed.success) {
    throw new Error('AI extraction returned an unexpected format. Try again.')
  }
  return parsed.data
}

export interface ExistingCounts {
  experiences: number
  education: number
  certifications: number
  skills: number
  references: number
}

export async function fetchExistingCounts(
  userId: string,
): Promise<ExistingCounts> {
  const count = async (
    table:
      | 'experiences'
      | 'education'
      | 'certifications'
      | 'skills'
      | 'references',
  ) => {
    const { count: n, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return n ?? 0
  }
  const [experiences, education, certifications, skills, references] =
    await Promise.all([
      count('experiences'),
      count('education'),
      count('certifications'),
      count('skills'),
      count('references'),
    ])
  return { experiences, education, certifications, skills, references }
}

/** Delete existing profile list records ahead of a deliberate replace. */
export async function clearProfileSections(userId: string) {
  for (const table of [
    'experiences', // bullets cascade
    'education',
    'certifications',
    'skills',
    'references',
  ] as const) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) throw new Error(error.message)
  }
}
