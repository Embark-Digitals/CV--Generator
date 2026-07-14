// Editable Microsoft Word export for the canonical CvDocument.
// Real heading/paragraph styles and genuine bullet lists so recruiters and
// ATS software can parse and edit it. Same content as preview and PDF.
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx'
import type { CvDocument } from '../document'
import {
  contactLine,
  detailLine,
  formatDateRange,
  sectionTitles,
  visibleSections,
} from '../document'

const PAGE_WIDTH_TWIPS = 11906 // A4
const MARGIN_TWIPS = 1080 // ~1.9 cm
const CONTENT_WIDTH = PAGE_WIDTH_TWIPS - MARGIN_TWIPS * 2

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 90 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'A3A3A3' },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 20, // half-points → 10pt
        color: '262626',
      }),
    ],
  })
}

function entryHeader(title: string, dates: string): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
    spacing: { before: 120 },
    children: [
      new TextRun({ text: title, bold: true, size: 21 }),
      new TextRun({ text: `\t${dates}`, size: 18, color: '525252' }),
    ],
  })
}

function subLine(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, italics: true, size: 19, color: '404040' })],
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 30 },
    children: [new TextRun({ text, size: 21 })],
  })
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 21 })],
  })
}

export async function renderDocxBlob(doc: CvDocument): Promise<Blob> {
  const contact = contactLine(doc)
  const details = detailLine(doc)
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: doc.header.full_name, bold: true, size: 36 }),
      ],
    }),
  )
  if (doc.header.headline) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: doc.header.headline, size: 23, color: '404040' }),
        ],
      }),
    )
  }
  if (contact.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
        children: [
          new TextRun({
            text: contact.join('   ·   '),
            size: 18,
            color: '525252',
          }),
        ],
      }),
    )
  }
  if (details.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: details.join('   ·   '),
            size: 18,
            color: '525252',
          }),
        ],
      }),
    )
  }

  for (const key of visibleSections(doc)) {
    switch (key) {
      case 'summary':
        children.push(sectionHeading(sectionTitles.summary), body(doc.summary))
        break
      case 'skills':
        children.push(
          sectionHeading(sectionTitles.skills),
          body(doc.skills.map((s) => s.name).join('   ·   ')),
        )
        break
      case 'systems':
        children.push(
          sectionHeading(sectionTitles.systems),
          body(doc.systems.map((s) => s.name).join('   ·   ')),
        )
        break
      case 'experience':
        children.push(sectionHeading(sectionTitles.experience))
        for (const exp of doc.experiences) {
          children.push(
            entryHeader(
              exp.title,
              formatDateRange(exp.start_date, exp.end_date, exp.is_current),
            ),
            subLine(`${exp.company}${exp.location ? ` — ${exp.location}` : ''}`),
            ...exp.bullets.map((b) => bullet(b.content)),
          )
        }
        break
      case 'education':
        children.push(sectionHeading(sectionTitles.education))
        for (const edu of doc.education) {
          children.push(
            entryHeader(
              edu.qualification,
              formatDateRange(edu.start_date, edu.end_date, false),
            ),
            subLine(
              `${edu.institution}${edu.field_of_study ? ` — ${edu.field_of_study}` : ''}${edu.grade ? ` · ${edu.grade}` : ''}`,
            ),
          )
        }
        break
      case 'certifications':
        children.push(
          sectionHeading(sectionTitles.certifications),
          ...doc.certifications.map((cert) =>
            bullet(
              `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}${cert.issue_date ? ` (${cert.issue_date.slice(0, 4)})` : ''}`,
            ),
          ),
        )
        break
      case 'references':
        children.push(sectionHeading(sectionTitles.references))
        if (
          doc.visibility.references_mode === 'on_request' ||
          doc.references.length === 0
        ) {
          children.push(body('References available on request.'))
        } else {
          for (const ref of doc.references) {
            children.push(
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: ref.name, bold: true, size: 21 }),
                  new TextRun({
                    text: `${ref.relationship ? ` — ${ref.relationship}` : ''}${ref.company ? `, ${ref.company}` : ''}${ref.phone ? ` · ${ref.phone}` : ''}${ref.email ? ` · ${ref.email}` : ''}`,
                    size: 21,
                  }),
                ],
              }),
            )
          }
        }
        break
    }
  }

  const wordDocument = new Document({
    creator: 'CV Machine',
    title: `CV — ${doc.header.full_name}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 21 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_TWIPS, height: 16838 }, // A4
            margin: {
              top: MARGIN_TWIPS,
              bottom: MARGIN_TWIPS,
              left: MARGIN_TWIPS,
              right: MARGIN_TWIPS,
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(wordDocument)
}
