import {
  useCertifications,
  useEducation,
  useReferences,
  useSkills,
} from '../hooks'
import { EntityListSection } from './entity-list-section'
import type { Certification, Education, Reference, Skill } from '@/types/domain'

const year = (d: string | null) => (d ? d.slice(0, 4) : '')

export function EducationSection() {
  const { data = [], isLoading } = useEducation()
  return (
    <EntityListSection<Education>
      title="Education"
      table="education"
      rows={data}
      isLoading={isLoading}
      addLabel="Add qualification"
      emptyMessage="No education records yet."
      fields={[
        { name: 'qualification', label: 'Qualification', required: true },
        { name: 'institution', label: 'Institution', required: true },
        { name: 'field_of_study', label: 'Field of study' },
        { name: 'start_date', label: 'Start date', type: 'date' },
        { name: 'end_date', label: 'End date', type: 'date' },
        { name: 'grade', label: 'Grade / result' },
      ]}
      renderPrimary={(row) => row.qualification}
      renderSecondary={(row) =>
        [row.institution, [year(row.start_date), year(row.end_date)].filter(Boolean).join('–')]
          .filter(Boolean)
          .join(' · ')
      }
    />
  )
}

export function CertificationsSection() {
  const { data = [], isLoading } = useCertifications()
  return (
    <EntityListSection<Certification>
      title="Certifications"
      table="certifications"
      rows={data}
      isLoading={isLoading}
      addLabel="Add certification"
      emptyMessage="No certifications yet."
      fields={[
        { name: 'name', label: 'Certification', required: true },
        { name: 'issuer', label: 'Issuing organisation' },
        { name: 'issue_date', label: 'Issue date', type: 'date' },
        { name: 'expiry_date', label: 'Expiry date', type: 'date' },
        { name: 'credential_reference', label: 'Credential reference' },
      ]}
      renderPrimary={(row) => row.name}
      renderSecondary={(row) =>
        [row.issuer, year(row.issue_date)].filter(Boolean).join(' · ')
      }
    />
  )
}

export function SkillsSection() {
  const { data = [], isLoading } = useSkills()
  const skills = data.filter((s) => s.kind === 'skill')
  const systems = data.filter((s) => s.kind === 'system')
  return (
    <div className="space-y-6">
      <EntityListSection<Skill>
        title="Skills"
        table="skills"
        rows={skills}
        isLoading={isLoading}
        addLabel="Add skill"
        emptyMessage="No skills yet."
        insertExtras={{ kind: 'skill' }}
        fields={[{ name: 'name', label: 'Skill', required: true }]}
        renderPrimary={(row) => row.name}
      />
      <EntityListSection<Skill>
        title="Systems and software"
        table="skills"
        rows={systems}
        isLoading={isLoading}
        addLabel="Add system"
        emptyMessage="No systems or software yet."
        insertExtras={{ kind: 'system' }}
        fields={[{ name: 'name', label: 'System / software', required: true }]}
        renderPrimary={(row) => row.name}
      />
    </div>
  )
}

export function ReferencesSection() {
  const { data = [], isLoading } = useReferences()
  return (
    <EntityListSection<Reference>
      title="References"
      table="references"
      rows={data}
      isLoading={isLoading}
      addLabel="Add referee"
      emptyMessage="No references yet. Exports can always state “References available on request”."
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'relationship', label: 'Relationship / role' },
        { name: 'company', label: 'Company' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Telephone' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      renderPrimary={(row) => row.name}
      renderSecondary={(row) =>
        [row.relationship, row.company].filter(Boolean).join(' · ')
      }
    />
  )
}
