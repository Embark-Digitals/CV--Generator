import { Badge } from '@/components/ui/badge'
import type { ApplicationStatus } from '@/types/domain'

export const statusLabels: Record<ApplicationStatus, string> = {
  considering: 'Considering',
  preparing: 'Preparing',
  ready_to_apply: 'Ready to apply',
  applied: 'Applied',
  interview: 'Interview',
  assessment: 'Assessment',
  offer: 'Offer',
  unsuccessful: 'Unsuccessful',
  withdrawn: 'Withdrawn',
  archived: 'Archived',
}

export const statusOrder: ApplicationStatus[] = [
  'considering',
  'preparing',
  'ready_to_apply',
  'applied',
  'interview',
  'assessment',
  'offer',
  'unsuccessful',
  'withdrawn',
  'archived',
]

const variants: Record<
  ApplicationStatus,
  'secondary' | 'default' | 'success' | 'warning' | 'destructive' | 'outline'
> = {
  considering: 'secondary',
  preparing: 'warning',
  ready_to_apply: 'default',
  applied: 'default',
  interview: 'success',
  assessment: 'success',
  offer: 'success',
  unsuccessful: 'destructive',
  withdrawn: 'outline',
  archived: 'outline',
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={variants[status]}>{statusLabels[status]}</Badge>
}
