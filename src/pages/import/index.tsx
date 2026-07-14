import { PageHeader } from '@/components/layout/page-header'

export function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import source CV"
        description="Upload your existing CV, review the extracted information, and confirm it into your career profile."
      />
      <p className="text-muted-foreground text-sm">
        The import workflow arrives in Phase 2.
      </p>
    </div>
  )
}
