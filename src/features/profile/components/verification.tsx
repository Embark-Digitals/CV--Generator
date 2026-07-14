import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { VerificationStatus } from '@/types/domain'

const labels: Record<VerificationStatus, string> = {
  pending_verification: 'Pending verification',
  verified: 'Verified',
  user_confirmed: 'User confirmed',
  rejected: 'Rejected',
}

const variants: Record<
  VerificationStatus,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  pending_verification: 'warning',
  verified: 'success',
  user_confirmed: 'success',
  rejected: 'destructive',
}

export function VerificationBadge({
  status,
}: {
  status: VerificationStatus
}) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

export function VerifyActions({
  status,
  onVerify,
  onReject,
  disabled,
}: {
  status: VerificationStatus
  onVerify: () => void
  onReject: () => void
  disabled?: boolean
}) {
  if (status === 'verified' || status === 'user_confirmed') return null
  return (
    <span className="inline-flex gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onVerify}
        disabled={disabled}
        aria-label="Mark as verified"
      >
        <Check aria-hidden="true" /> Verify
      </Button>
      {status !== 'rejected' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          disabled={disabled}
          aria-label="Reject this record"
        >
          <X aria-hidden="true" /> Reject
        </Button>
      )}
    </span>
  )
}
