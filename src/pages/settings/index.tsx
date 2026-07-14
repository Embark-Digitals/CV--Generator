import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTheme, type Theme } from '@/providers/theme-provider'
import { useAuth } from '@/providers/auth-provider'
import { useUpdateVisibility, useVisibility } from '@/features/profile/hooks'
import type { VisibilitySettings } from '@/types/domain'

const toggles: Array<{
  key: keyof Pick<
    VisibilitySettings,
    | 'show_email'
    | 'show_phone'
    | 'show_date_of_birth'
    | 'show_gender'
    | 'show_nationality'
    | 'show_drivers_licence'
  >
  label: string
  hint?: string
}> = [
  { key: 'show_email', label: 'Email address' },
  { key: 'show_phone', label: 'Telephone number' },
  { key: 'show_date_of_birth', label: 'Date of birth' },
  { key: 'show_gender', label: 'Gender' },
  { key: 'show_nationality', label: 'Nationality' },
  {
    key: 'show_drivers_licence',
    label: "Driver's licence",
    hint: 'Usually only when the job requires it',
  },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, updatePassword } = useAuth()
  const { data: visibility, isLoading } = useVisibility()
  const updateVisibility = useUpdateVisibility()
  const [newPassword, setNewPassword] = useState('')
  const [changing, setChanging] = useState(false)

  const changePassword = async () => {
    if (newPassword.length < 10) {
      toast.error('Use at least 10 characters.')
      return
    }
    setChanging(true)
    const { error } = await updatePassword(newPassword)
    setChanging(false)
    if (error) toast.error('Password change failed. Sign in again and retry.')
    else {
      toast.success('Password updated')
      setNewPassword('')
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Appearance, personal-information visibility defaults and account."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Light, dark, or follow your device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="theme-select">Theme</Label>
              <Select
                id="theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal information visibility</CardTitle>
            <CardDescription>
              Master defaults for what appears on exported CVs. Each tailored
              CV can override these per application. Hidden fields stay safely
              stored — they are only left off documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !visibility ? (
              <p className="text-muted-foreground text-sm" role="status">
                Loading visibility settings…
              </p>
            ) : (
              <div className="space-y-5">
                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="address-mode">Address on CV</Label>
                  <Select
                    id="address-mode"
                    value={visibility.address_mode}
                    onChange={(e) =>
                      updateVisibility.mutate({
                        address_mode:
                          e.target.value as VisibilitySettings['address_mode'],
                      })
                    }
                  >
                    <option value="city_only">City and country only</option>
                    <option value="full">Full address</option>
                    <option value="hidden">Hidden</option>
                  </Select>
                </div>
                <ul className="divide-y">
                  {toggles.map(({ key, label, hint }) => (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div>
                        <Label htmlFor={`vis-${key}`}>{label}</Label>
                        {hint && (
                          <p className="text-muted-foreground text-xs">{hint}</p>
                        )}
                      </div>
                      <Switch
                        id={`vis-${key}`}
                        checked={visibility[key]}
                        onChange={(e) =>
                          updateVisibility.mutate({ [key]: e.target.checked })
                        }
                      />
                    </li>
                  ))}
                </ul>
                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="refs-mode">References on CV</Label>
                  <Select
                    id="refs-mode"
                    value={visibility.references_mode}
                    onChange={(e) =>
                      updateVisibility.mutate({
                        references_mode:
                          e.target.value as VisibilitySettings['references_mode'],
                      })
                    }
                  >
                    <option value="on_request">
                      “References available on request”
                    </option>
                    <option value="full">Full referee details</option>
                    <option value="hidden">No references section</option>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in as {user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex max-w-md items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={() => void changePassword()}
                disabled={changing || newPassword.length === 0}
              >
                {changing ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
