import { PageHeader } from '@/components/layout/page-header'

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your career profile and application activity at a glance."
      />
      <p className="text-muted-foreground text-sm">
        Dashboard content arrives with the Master Career Profile in Phase 2.
      </p>
    </div>
  )
}
