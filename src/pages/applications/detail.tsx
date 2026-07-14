import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'

export function ApplicationDetailPage() {
  const { id } = useParams()
  return (
    <div>
      <PageHeader title="Application" description={`Application ${id ?? ''}`} />
      <p className="text-muted-foreground text-sm">
        Application detail arrives in Phase 3.
      </p>
    </div>
  )
}
