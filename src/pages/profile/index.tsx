import { PageHeader } from '@/components/layout/page-header'
import { PersonalDetailsSection } from '@/features/profile/components/personal-details'
import { SummarySection } from '@/features/profile/components/summary-section'
import { ExperiencesSection } from '@/features/profile/components/experiences-section'
import {
  CertificationsSection,
  EducationSection,
  ReferencesSection,
  SkillsSection,
} from '@/features/profile/components/simple-sections'

export function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Master Career Profile"
        description="Your verified career record — the single source of truth for every tailored CV."
      />
      <div className="space-y-6">
        <PersonalDetailsSection />
        <SummarySection />
        <ExperiencesSection />
        <EducationSection />
        <CertificationsSection />
        <SkillsSection />
        <ReferencesSection />
      </div>
    </div>
  )
}
