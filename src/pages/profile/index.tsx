import { PageHeader } from '@/components/layout/page-header'

export function ProfilePage() {
  return (
    <div>
      <PageHeader
        title="Master Career Profile"
        description="Your verified career record — the single source of truth for every tailored CV."
      />
      <p className="text-muted-foreground text-sm">
        Profile sections arrive in Phase 2.
      </p>
    </div>
  )
}
