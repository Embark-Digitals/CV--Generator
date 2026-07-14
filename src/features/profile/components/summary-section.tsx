import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProfile, useUpdateProfile } from '../hooks'

const schema = z.object({
  headline: z.string().max(160),
  professional_summary: z.string().max(2000),
})

type FormValues = z.infer<typeof schema>

export function SummarySection() {
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (profile)
      reset({
        headline: profile.headline ?? '',
        professional_summary: profile.professional_summary ?? '',
      })
  }, [profile, reset])

  if (!profile) return null

  const onSubmit = (values: FormValues) => {
    updateProfile.mutate(
      {
        headline: values.headline || null,
        professional_summary: values.professional_summary || null,
      },
      { onSuccess: () => reset(values) },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional identity</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="headline">Professional headline</Label>
            <Input
              id="headline"
              placeholder="e.g. Senior Bookkeeper"
              aria-invalid={!!errors.headline}
              {...register('headline')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="professional_summary">Professional summary</Label>
            <Textarea
              id="professional_summary"
              rows={5}
              aria-invalid={!!errors.professional_summary}
              {...register('professional_summary')}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            {isDirty && (
              <p className="text-warning text-xs" role="status">
                Unsaved changes
              </p>
            )}
            <Button type="submit" disabled={!isDirty}>
              {updateProfile.isPending ? 'Saving…' : 'Save summary'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
