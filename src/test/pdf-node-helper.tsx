// Node-side PDF rendering for tests (browser code uses pdf().toBlob()).
import { renderToBuffer } from '@react-pdf/renderer'
import { CvPdfDocument } from '@/features/tailor/export/pdf'
import type { CvDocument } from '@/features/tailor/document'

export async function renderPdfBuffer(document: CvDocument) {
  return renderToBuffer(<CvPdfDocument document={document} />)
}
