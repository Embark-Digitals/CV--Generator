import { PageHeader } from '@/components/layout/page-header'

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Appearance, visibility defaults and account."
      />
      <p className="text-muted-foreground text-sm">
        Visibility defaults arrive in Phase 2.
      </p>
    </div>
  )
}
