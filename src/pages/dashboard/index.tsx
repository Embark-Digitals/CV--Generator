import { Link } from 'react-router-dom'
import { Briefcase, FileUp, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  useCertifications,
  useEducation,
  useExperiences,
  useProfile,
  useReferences,
  useSkills,
} from '@/features/profile/hooks'

export function DashboardPage() {
  const { data: profile } = useProfile()
  const { data: experiences = [] } = useExperiences()
  const { data: education = [] } = useEducation()
  const { data: certifications = [] } = useCertifications()
  const { data: skills = [] } = useSkills()
  const { data: references = [] } = useReferences()

  const bullets = experiences.reduce(
    (n, e) => n + e.experience_bullets.length,
    0,
  )
  const pending = [
    ...experiences,
    ...experiences.flatMap((e) => e.experience_bullets),
    ...education,
    ...certifications,
    ...skills,
    ...references,
  ].filter((r) => r.verification_status === 'pending_verification').length

  const stats = [
    { label: 'Employment roles', value: experiences.length },
    { label: 'Responsibilities', value: bullets },
    { label: 'Education records', value: education.length },
    { label: 'Certifications', value: certifications.length },
    { label: 'Skills & systems', value: skills.length },
    { label: 'References', value: references.length },
  ]

  const firstName =
    profile?.first_name || profile?.full_name?.split(' ')[0] || ''

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        description="Your career profile and application activity at a glance."
      />

      {pending > 0 && (
        <div
          className="border-warning/40 bg-warning/10 mb-6 rounded-md border p-4 text-sm"
          role="status"
        >
          {pending} imported records are waiting for your verification.{' '}
          <Link to="/profile" className="font-medium underline underline-offset-4">
            Review them now
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-muted-foreground text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/profile" className="group">
          <Card className="group-hover:border-primary/40 h-full transition-colors">
            <CardHeader>
              <UserRound className="text-primary h-5 w-5" aria-hidden="true" />
              <CardTitle className="text-base">Master Career Profile</CardTitle>
              <CardDescription>
                Keep your verified career record complete and current.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/import" className="group">
          <Card className="group-hover:border-primary/40 h-full transition-colors">
            <CardHeader>
              <FileUp className="text-primary h-5 w-5" aria-hidden="true" />
              <CardTitle className="text-base">Import a CV</CardTitle>
              <CardDescription>
                Extract your existing CV into structured, verifiable records.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/applications" className="group">
          <Card className="group-hover:border-primary/40 h-full transition-colors">
            <CardHeader>
              <Briefcase className="text-primary h-5 w-5" aria-hidden="true" />
              <CardTitle className="text-base">Applications</CardTitle>
              <CardDescription>
                Track every application and tailor a truthful CV for each.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
