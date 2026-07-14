// Export orchestration: render the canonical document to PDF or DOCX,
// store the file privately under {user_id}/exports/, record it in the
// exports table, and hand the file to the user's browser.
import { supabase } from '@/lib/supabase'
import type { CvDocument } from '../document'
import { exportFileName } from './filename'

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

export interface ExportInput {
  userId: string
  tailoredCvId: string
  cvVersionId?: string | null
  jobApplicationId: string
  document: CvDocument
  jobTitle: string
  company: string
  format: 'pdf' | 'docx'
}

export async function exportCv(input: ExportInput): Promise<string> {
  // Renderers load lazily — they are heavy and only needed here.
  const blob =
    input.format === 'pdf'
      ? await (await import('./pdf')).renderPdfBlob(input.document)
      : await (await import('./docx')).renderDocxBlob(input.document)

  if (blob.size < 500) {
    throw new Error('The generated document looks empty — export aborted.')
  }

  const fileName = exportFileName(
    input.document.header.full_name,
    input.jobTitle,
    input.company,
    input.format,
  )

  const storagePath = `${input.userId}/exports/${input.tailoredCvId}/${Date.now()}-${fileName}`
  const { error: uploadError } = await supabase.storage
    .from('exports')
    .upload(storagePath, blob, { contentType: MIME[input.format] })
  if (uploadError) throw new Error(uploadError.message)

  const { error: insertError } = await supabase.from('exports').insert({
    user_id: input.userId,
    tailored_cv_id: input.tailoredCvId,
    cv_version_id: input.cvVersionId ?? null,
    job_application_id: input.jobApplicationId,
    format: input.format,
    file_name: fileName,
    storage_path: storagePath,
  })
  if (insertError) throw new Error(insertError.message)

  // Local download for immediate use.
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return fileName
}

/** Signed, short-lived download link for a stored export. */
export async function signedExportUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('exports')
    .createSignedUrl(storagePath, 60 * 10)
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Could not create a download link')
  }
  return data.signedUrl
}
