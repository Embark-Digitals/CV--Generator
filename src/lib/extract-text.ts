export const PDF_MIME = 'application/pdf'
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * Extract selectable text from a PDF in the browser via pdfjs-dist.
 * Loaded lazily so the (large) worker only downloads when importing.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url'))
    .default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const doc = await task.promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }
  await task.destroy()
  return pages.join('\n\n').replace(/[ \t]+/g, ' ').trim()
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = (await import('mammoth')).default
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  })
  return result.value.trim()
}

/** Extract text from a PDF or DOCX file; throws on unsupported types. */
export async function extractFileText(file: File): Promise<string> {
  if (file.type === PDF_MIME || file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file)
  }
  if (file.type === DOCX_MIME || file.name.toLowerCase().endsWith('.docx')) {
    return extractDocxText(file)
  }
  throw new Error('Unsupported file type. Upload a PDF or DOCX file.')
}
