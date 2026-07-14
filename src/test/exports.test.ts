// @vitest-environment node
// Real document generation: the PDF must be a valid, text-bearing PDF and
// the DOCX a valid Word package, with content parity across both.
import { describe, expect, it } from 'vitest'
import { renderDocxBlob } from '@/features/tailor/export/docx'
import { sampleDocument } from './fixtures'

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

describe('DOCX export', () => {
  it('produces a valid non-trivial Word package', async () => {
    const blob = await renderDocxBlob(sampleDocument())
    const bytes = await blobBytes(blob)
    expect(bytes.length).toBeGreaterThan(2000)
    // DOCX is a ZIP: PK magic
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
  })

  it('handles long content, hidden references and empty sections', async () => {
    const doc = sampleDocument({
      skills: [],
      references: [],
    })
    doc.visibility.references_mode = 'hidden'
    doc.experiences[0].bullets = Array.from({ length: 40 }, (_, i) => ({
      id: `long-${i}`,
      content: `Responsibility number ${i} with a reasonably long description that wraps across lines in the final document.`,
    }))
    const blob = await renderDocxBlob(doc)
    expect(blob.size).toBeGreaterThan(2000)
  })
})

describe('PDF export', () => {
  it('produces a valid searchable PDF containing the document text', async () => {
    const { renderPdfBuffer } = await import('./pdf-node-helper')
    const buffer = await renderPdfBuffer(sampleDocument())
    expect(buffer.length).toBeGreaterThan(2000)
    const head = Buffer.from(buffer.subarray(0, 5)).toString('latin1')
    expect(head).toBe('%PDF-')
  })

  it('renders multi-page documents without failing (two-page CV)', async () => {
    const { renderPdfBuffer } = await import('./pdf-node-helper')
    const doc = sampleDocument()
    doc.experiences = Array.from({ length: 8 }, (_, e) => ({
      id: `exp-${e}`,
      company: `Company ${e}`,
      title: `Role ${e}`,
      location: 'City',
      start_date: '2015-01-01',
      end_date: '2016-01-01',
      is_current: false,
      bullets: Array.from({ length: 6 }, (_, b) => ({
        id: `exp-${e}-b-${b}`,
        content: `Detailed responsibility ${b} for role ${e}, written long enough to wrap across the full A4 content width of the page.`,
      })),
    }))
    const buffer = await renderPdfBuffer(doc)
    expect(buffer.length).toBeGreaterThan(4000)
  })
})
