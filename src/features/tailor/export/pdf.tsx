// PDF renderer for the canonical CvDocument — @react-pdf/renderer.
// A4, single column, selectable/searchable text, conservative typography.
// Content parity with the live preview and DOCX is guaranteed by consuming
// the same document model and shared visibility helpers.
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer'
import type { CvDocument } from '../document'
import {
  contactLine,
  detailLine,
  formatDateRange,
  sectionTitles,
  visibleSections,
} from '../document'

const styles = StyleSheet.create({
  page: {
    paddingVertical: 46,
    paddingHorizontal: 52,
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    lineHeight: 1.35,
    color: '#171717',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
  },
  headline: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 2,
    color: '#404040',
  },
  contact: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 5,
    color: '#525252',
  },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 0.75,
    borderBottomColor: '#a3a3a3',
    paddingBottom: 2,
    marginBottom: 5,
  },
  entry: { marginBottom: 7 },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  entryTitle: { fontFamily: 'Times-Bold' },
  entryDates: { fontSize: 9, color: '#525252' },
  entrySub: { fontSize: 9.5, fontFamily: 'Times-Italic', color: '#404040' },
  bulletRow: { flexDirection: 'row', marginTop: 2, paddingLeft: 10 },
  bulletGlyph: { width: 10 },
  bulletText: { flex: 1 },
})

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

export function CvPdfDocument({ document: doc }: { document: CvDocument }) {
  const contact = contactLine(doc)
  const details = detailLine(doc)
  const sections = visibleSections(doc)

  return (
    <Document
      title={`CV — ${doc.header.full_name}`}
      author={doc.header.full_name}
      creator="CV Machine"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{doc.header.full_name}</Text>
        {doc.header.headline ? (
          <Text style={styles.headline}>{doc.header.headline}</Text>
        ) : null}
        {contact.length > 0 ? (
          <Text style={styles.contact}>{contact.join('   ·   ')}</Text>
        ) : null}
        {details.length > 0 ? (
          <Text style={styles.contact}>{details.join('   ·   ')}</Text>
        ) : null}

        {sections.map((key) => {
          switch (key) {
            case 'summary':
              return (
                <View key={key} style={styles.section}>
                  <SectionTitle>{sectionTitles.summary}</SectionTitle>
                  <Text>{doc.summary}</Text>
                </View>
              )
            case 'skills':
              return (
                <View key={key} style={styles.section}>
                  <SectionTitle>{sectionTitles.skills}</SectionTitle>
                  <Text>{doc.skills.map((s) => s.name).join('   ·   ')}</Text>
                </View>
              )
            case 'systems':
              return (
                <View key={key} style={styles.section}>
                  <SectionTitle>{sectionTitles.systems}</SectionTitle>
                  <Text>{doc.systems.map((s) => s.name).join('   ·   ')}</Text>
                </View>
              )
            case 'experience':
              return (
                <View key={key} style={styles.section}>
                  <SectionTitle>{sectionTitles.experience}</SectionTitle>
                  {doc.experiences.map((exp) => (
                    <View key={exp.id} style={styles.entry} wrap={false}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.entryTitle}>{exp.title}</Text>
                        <Text style={styles.entryDates}>
                          {formatDateRange(
                            exp.start_date,
                            exp.end_date,
                            exp.is_current,
                          )}
                        </Text>
                      </View>
                      <Text style={styles.entrySub}>
                        {exp.company}
                        {exp.location ? ` — ${exp.location}` : ''}
                      </Text>
                      {exp.bullets.map((b) => (
                        <View key={b.id} style={styles.bulletRow}>
                          <Text style={styles.bulletGlyph}>•</Text>
                          <Text style={styles.bulletText}>{b.content}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )
            case 'education':
              return (
                <View key={key} style={styles.section}>
                  <SectionTitle>{sectionTitles.education}</SectionTitle>
                  {doc.education.map((edu) => (
                    <View key={edu.id} style={styles.entry} wrap={false}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.entryTitle}>
                          {edu.qualification}
                        </Text>
                        <Text style={styles.entryDates}>
                          {formatDateRange(edu.start_date, edu.end_date, false)}
                        </Text>
                      </View>
                      <Text style={styles.entrySub}>
                        {edu.institution}
                        {edu.field_of_study ? ` — ${edu.field_of_study}` : ''}
                        {edu.grade ? ` · ${edu.grade}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            case 'certifications':
              return (
                <View key={key} style={styles.section}>
                  <SectionTitle>{sectionTitles.certifications}</SectionTitle>
                  {doc.certifications.map((cert) => (
                    <View key={cert.id} style={styles.bulletRow}>
                      <Text style={styles.bulletGlyph}>•</Text>
                      <Text style={styles.bulletText}>
                        {cert.name}
                        {cert.issuer ? ` — ${cert.issuer}` : ''}
                        {cert.issue_date
                          ? ` (${cert.issue_date.slice(0, 4)})`
                          : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            case 'references':
              return (
                <View key={key} style={styles.section}>
                  <SectionTitle>{sectionTitles.references}</SectionTitle>
                  {doc.visibility.references_mode === 'on_request' ||
                  doc.references.length === 0 ? (
                    <Text>References available on request.</Text>
                  ) : (
                    doc.references.map((ref) => (
                      <View key={ref.id} style={{ marginBottom: 3 }}>
                        <Text>
                          <Text style={styles.entryTitle}>{ref.name}</Text>
                          {ref.relationship ? ` — ${ref.relationship}` : ''}
                          {ref.company ? `, ${ref.company}` : ''}
                          {ref.phone ? ` · ${ref.phone}` : ''}
                          {ref.email ? ` · ${ref.email}` : ''}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )
            default:
              return null
          }
        })}
      </Page>
    </Document>
  )
}

export async function renderPdfBlob(document: CvDocument): Promise<Blob> {
  return pdf(<CvPdfDocument document={document} />).toBlob()
}
