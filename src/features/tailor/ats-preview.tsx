// ATS Classic live preview — renders the canonical CvDocument exactly as the
// PDF and DOCX renderers do: A4 proportions, single column, conservative
// typography, no decorative icons, visibility rules applied.
import type { CvDocument } from './document'
import {
  contactLine,
  detailLine,
  formatDateRange,
  sectionTitles,
  visibleSections,
} from './document'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-1.5 border-b border-neutral-300 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-neutral-800">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function AtsClassicPreview({ document: doc }: { document: CvDocument }) {
  const contact = contactLine(doc)
  const details = detailLine(doc)
  const sections = visibleSections(doc)

  return (
    <div
      className="mx-auto w-full max-w-[210mm] bg-white p-10 font-serif text-[12px] leading-relaxed text-neutral-900 shadow-md print:shadow-none"
      style={{ minHeight: '297mm', fontFamily: 'Georgia, "Times New Roman", serif' }}
      aria-label="CV preview"
    >
      <header className="mb-5 text-center">
        <h1 className="text-xl font-bold tracking-wide text-neutral-900">
          {doc.header.full_name || 'Your Name'}
        </h1>
        {doc.header.headline && (
          <p className="mt-0.5 text-[13px] text-neutral-700">
            {doc.header.headline}
          </p>
        )}
        {contact.length > 0 && (
          <p className="mt-1.5 text-[11px] text-neutral-600">
            {contact.join('  ·  ')}
          </p>
        )}
        {details.length > 0 && (
          <p className="mt-0.5 text-[11px] text-neutral-600">
            {details.join('  ·  ')}
          </p>
        )}
      </header>

      {sections.map((key) => {
        switch (key) {
          case 'summary':
            return (
              <Section key={key} title={sectionTitles.summary}>
                <p className="whitespace-pre-wrap">{doc.summary}</p>
              </Section>
            )
          case 'skills':
            return (
              <Section key={key} title={sectionTitles.skills}>
                <p>{doc.skills.map((s) => s.name).join('  ·  ')}</p>
              </Section>
            )
          case 'systems':
            return (
              <Section key={key} title={sectionTitles.systems}>
                <p>{doc.systems.map((s) => s.name).join('  ·  ')}</p>
              </Section>
            )
          case 'experience':
            return (
              <Section key={key} title={sectionTitles.experience}>
                <div className="space-y-3">
                  {doc.experiences.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold">{exp.title}</p>
                        <p className="shrink-0 text-[11px] text-neutral-600">
                          {formatDateRange(
                            exp.start_date,
                            exp.end_date,
                            exp.is_current,
                          )}
                        </p>
                      </div>
                      <p className="text-[11px] italic text-neutral-700">
                        {exp.company}
                        {exp.location ? ` — ${exp.location}` : ''}
                      </p>
                      {exp.bullets.length > 0 && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5">
                          {exp.bullets.map((b) => (
                            <li key={b.id}>{b.content}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )
          case 'education':
            return (
              <Section key={key} title={sectionTitles.education}>
                <div className="space-y-2">
                  {doc.education.map((edu) => (
                    <div key={edu.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold">{edu.qualification}</p>
                        <p className="shrink-0 text-[11px] text-neutral-600">
                          {formatDateRange(edu.start_date, edu.end_date, false)}
                        </p>
                      </div>
                      <p className="text-[11px] italic text-neutral-700">
                        {edu.institution}
                        {edu.field_of_study ? ` — ${edu.field_of_study}` : ''}
                        {edu.grade ? ` · ${edu.grade}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )
          case 'certifications':
            return (
              <Section key={key} title={sectionTitles.certifications}>
                <ul className="list-disc space-y-0.5 pl-5">
                  {doc.certifications.map((cert) => (
                    <li key={cert.id}>
                      {cert.name}
                      {cert.issuer ? ` — ${cert.issuer}` : ''}
                      {cert.issue_date
                        ? ` (${cert.issue_date.slice(0, 4)})`
                        : ''}
                    </li>
                  ))}
                </ul>
              </Section>
            )
          case 'references':
            return (
              <Section key={key} title={sectionTitles.references}>
                {doc.visibility.references_mode === 'on_request' ||
                doc.references.length === 0 ? (
                  <p>References available on request.</p>
                ) : (
                  <div className="space-y-1.5">
                    {doc.references.map((ref) => (
                      <p key={ref.id}>
                        <span className="font-bold">{ref.name}</span>
                        {ref.relationship ? ` — ${ref.relationship}` : ''}
                        {ref.company ? `, ${ref.company}` : ''}
                        {ref.phone ? ` · ${ref.phone}` : ''}
                        {ref.email ? ` · ${ref.email}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </Section>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
