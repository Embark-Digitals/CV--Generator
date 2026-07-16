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

export type ExtractionCategory =
  | 'timeout'
  | 'rate_limited'
  | 'quota'
  | 'truncated'
  | 'invalid_response'
  | 'in_progress'
  | 'unavailable'

/** Extraction failure carrying a safe, specific category (never provider text). */
export class ExtractionError extends Error {
  category: ExtractionCategory
  constructor(category: ExtractionCategory, message: string) {
    super(message)
    this.name = 'ExtractionError'
    this.category = category
  }
}

/** Accurate, safe user-facing copy for each failure category. */
export function extractionMessage(category: string): string {
  switch (category) {
    case 'timeout':
      return 'AI extraction timed out. Please try again.'
    case 'rate_limited':
      return 'The AI service is busy right now. Please wait a moment and try again.'
    case 'quota':
      return 'The AI service quota is currently unavailable. Please try again later.'
    case 'truncated':
      return 'This document was too long to extract in one pass. Try again, or add records manually.'
    case 'invalid_response':
      return 'The AI response could not be validated. Please try again.'
    case 'in_progress':
      return 'An extraction for this document is already running. Please wait for it to finish.'
    case 'unavailable':
    default:
      return 'The AI service is temporarily unavailable. Please try again shortly.'
  }
}

/** Call the secure extraction Edge Function for a stored document. */
export async function extractProfile(
  documentId: string,
): Promise<CandidateProfile> {
  const { data, error } = await supabase.functions.invoke('extract-profile', {
    body: { document_id: documentId },
  })
  if (error) {
    // The function returns a stable { category } on failure; read it from the
    // response body without ever surfacing raw provider text.
    let category = 'unavailable'
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json()
        if (body?.category) category = String(body.category)
      } catch {
        /* keep the safe default */
      }
    }
    throw new ExtractionError(
      category as ExtractionCategory,
      extractionMessage(category),
    )
  }
  const parsed = candidateProfileSchema.safeParse(data?.candidate)
  if (!parsed.success) {
    throw new ExtractionError(
      'invalid_response',
      extractionMessage('invalid_response'),
    )
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
