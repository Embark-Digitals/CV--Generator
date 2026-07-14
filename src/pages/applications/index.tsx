import { PageHeader } from '@/components/layout/page-header'

export function ApplicationsPage() {
  return (
    <div>
      <PageHeader
        title="Applications"
        description="Track every job application from consideration to outcome."
      />
      <p className="text-muted-foreground text-sm">
        The job workspace arrives in Phase 3.
      </p>
    </div>
  )
}
