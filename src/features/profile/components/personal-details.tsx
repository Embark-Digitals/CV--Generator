import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerificationBadge } from './verification'
import { useProfile, useUpdateProfile } from '../hooks'
import type { Profile } from '@/types/domain'

const schema = z.object({
  full_name: z.string().max(200),
  first_name: z.string().max(100),
  last_name: z.string().max(100),
  email: z.email().or(z.literal('')),
  phone: z.string().max(40),
  address_line: z.string().max(300),
  city: z.string().max(100),
  region: z.string().max(100),
  postal_code: z.string().max(20),
  country: z.string().max(100),
  date_of_birth: z.string(),
  gender: z.string().max(40),
  nationality: z.string().max(100),
  drivers_licence: z.string().max(60),
})

type FormValues = z.infer<typeof schema>

function toForm(profile: Profile): FormValues {
  return {
    full_name: profile.full_name ?? '',
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    address_line: profile.address_line ?? '',
    city: profile.city ?? '',
    region: profile.region ?? '',
    postal_code: profile.postal_code ?? '',
    country: profile.country ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    gender: profile.gender ?? '',
    nationality: profile.nationality ?? '',
    drivers_licence: profile.drivers_licence ?? '',
  }
}

const fields: Array<{
  name: keyof FormValues
  label: string
  type?: string
  span2?: boolean
}> = [
  { name: 'full_name', label: 'Full name', span2: true },
  { name: 'first_name', label: 'First name' },
  { name: 'last_name', label: 'Last name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Telephone' },
  { name: 'address_line', label: 'Street address', span2: true },
  { name: 'city', label: 'City' },
  { name: 'region', label: 'Province / region' },
  { name: 'postal_code', label: 'Postal code' },
  { name: 'country', label: 'Country' },
  { name: 'date_of_birth', label: 'Date of birth', type: 'date' },
  { name: 'gender', label: 'Gender' },
  { name: 'nationality', label: 'Nationality' },
  { name: 'drivers_licence', label: "Driver's licence" },
]

export function PersonalDetailsSection() {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (profile) reset(toForm(profile))
  }, [profile, reset])

  if (isLoading || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm" role="status">
            Loading personal details…
          </p>
        </CardContent>
      </Card>
    )
  }

  const onSubmit = (values: FormValues) => {
    const patch = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]),
    )
    updateProfile.mutate(
      { ...patch, verification_status: 'user_confirmed' },
      { onSuccess: () => reset(values) },
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Personal details</CardTitle>
        <VerificationBadge status={profile.verification_status} />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(({ name, label, type, span2 }) => (
              <div
                key={name}
                className={span2 ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}
              >
                <Label htmlFor={`pd-${name}`}>{label}</Label>
                <Input
                  id={`pd-${name}`}
                  type={type ?? 'text'}
                  aria-invalid={!!errors[name]}
                  {...register(name)}
                />
                {errors[name] && (
                  <p className="text-destructive text-xs" role="alert">
                    {errors[name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {isDirty && (
              <p className="text-warning text-xs" role="status">
                Unsaved changes
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset(toForm(profile))}
              disabled={!isDirty}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {updateProfile.isPending ? 'Saving…' : 'Save details'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
