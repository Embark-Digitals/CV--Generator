import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { SectionCard, EmptyState } from './section-card'
import { VerificationBadge, VerifyActions } from './verification'
import { useEntityMutations, useExperiences, useUserId } from '../hooks'
import type { ExperienceWithBullets } from '@/types/domain'

const schema = z.object({
  company: z.string().min(1, 'Company is required').max(200),
  title: z.string().min(1, 'Job title is required').max(200),
  location: z.string().max(200),
  employment_type: z.string().max(100),
  start_date: z.string(),
  end_date: z.string(),
  is_current: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const emptyForm: FormValues = {
  company: '',
  title: '',
  location: '',
  employment_type: '',
  start_date: '',
  end_date: '',
  is_current: false,
}

function formatRange(exp: ExperienceWithBullets) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : ''
  const start = fmt(exp.start_date)
  const end = exp.is_current ? 'Present' : fmt(exp.end_date)
  return [start, end].filter(Boolean).join(' — ')
}

export function ExperiencesSection() {
  const userId = useUserId()
  const { data: experiences = [], isLoading } = useExperiences()
  const expMut = useEntityMutations('experiences')
  const bulletMut = useEntityMutations('experience_bullets')
  const [editing, setEditing] = useState<ExperienceWithBullets | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newBullet, setNewBullet] = useState<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm })

  const openAdd = () => {
    setEditing(null)
    reset(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (exp: ExperienceWithBullets) => {
    setEditing(exp)
    reset({
      company: exp.company,
      title: exp.title,
      location: exp.location ?? '',
      employment_type: exp.employment_type ?? '',
      start_date: exp.start_date ?? '',
      end_date: exp.end_date ?? '',
      is_current: exp.is_current,
    })
    setDialogOpen(true)
  }

  const onSubmit = (values: FormValues) => {
    const row = {
      company: values.company,
      title: values.title,
      location: values.location || null,
      employment_type: values.employment_type || null,
      start_date: values.start_date || null,
      end_date: values.is_current ? null : values.end_date || null,
      is_current: values.is_current,
    }
    if (editing) {
      expMut.update.mutate(
        { id: editing.id, patch: row },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      expMut.insert.mutate(
        {
          ...row,
          user_id: userId,
          source: 'manual',
          verification_status: 'user_confirmed',
          display_order: experiences.length,
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  const move = (index: number, direction: -1 | 1) => {
    const a = experiences[index]
    const b = experiences[index + direction]
    if (!a || !b) return
    expMut.swap.mutate({
      a: { id: a.id, display_order: a.display_order },
      b: { id: b.id, display_order: b.display_order },
    })
  }

  const addBullet = (exp: ExperienceWithBullets) => {
    const content = (newBullet[exp.id] ?? '').trim()
    if (!content) return
    bulletMut.insert.mutate(
      {
        experience_id: exp.id,
        user_id: userId,
        content,
        source: 'manual',
        verification_status: 'user_confirmed',
        display_order: exp.experience_bullets.length,
      },
      { onSuccess: () => setNewBullet((s) => ({ ...s, [exp.id]: '' })) },
    )
  }

  return (
    <SectionCard
      title="Employment history"
      description="Each responsibility is a separate, individually verifiable record."
      onAdd={openAdd}
      addLabel="Add role"
    >
      {isLoading ? (
        <p className="text-muted-foreground text-sm" role="status">
          Loading employment history…
        </p>
      ) : experiences.length === 0 ? (
        <EmptyState>
          No employment history yet. Import your CV or add a role manually.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {experiences.map((exp, index) => (
            <li key={exp.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{exp.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {exp.company}
                    {exp.location ? ` · ${exp.location}` : ''}
                    {formatRange(exp) ? ` · ${formatRange(exp)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <VerificationBadge status={exp.verification_status} />
                  <VerifyActions
                    status={exp.verification_status}
                    onVerify={() =>
                      expMut.update.mutate({
                        id: exp.id,
                        patch: { verification_status: 'verified' },
                      })
                    }
                    onReject={() =>
                      expMut.update.mutate({
                        id: exp.id,
                        patch: { verification_status: 'rejected' },
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${exp.title} up`}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, 1)}
                    disabled={index === experiences.length - 1}
                    aria-label={`Move ${exp.title} down`}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(exp)}
                    aria-label={`Edit ${exp.title}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove "${exp.title} at ${exp.company}" and all its responsibilities?`,
                        )
                      )
                        expMut.remove.mutate(exp.id)
                    }}
                    aria-label={`Delete ${exp.title}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {exp.experience_bullets.map((bullet, bIndex) => (
                  <li
                    key={bullet.id}
                    className="group flex items-start gap-2 text-sm"
                  >
                    <span aria-hidden="true" className="text-muted-foreground mt-0.5">
                      •
                    </span>
                    <span className="min-w-0 flex-1">{bullet.content}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <VerificationBadge status={bullet.verification_status} />
                      <VerifyActions
                        status={bullet.verification_status}
                        onVerify={() =>
                          bulletMut.update.mutate({
                            id: bullet.id,
                            patch: { verification_status: 'verified' },
                          })
                        }
                        onReject={() =>
                          bulletMut.update.mutate({
                            id: bullet.id,
                            patch: { verification_status: 'rejected' },
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => move2(exp, bIndex, -1)}
                        disabled={bIndex === 0}
                        aria-label="Move responsibility up"
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => move2(exp, bIndex, 1)}
                        disabled={bIndex === exp.experience_bullets.length - 1}
                        aria-label="Move responsibility down"
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => bulletMut.remove.mutate(bullet.id)}
                        aria-label="Delete responsibility"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <Input
                  value={newBullet[exp.id] ?? ''}
                  onChange={(e) =>
                    setNewBullet((s) => ({ ...s, [exp.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addBullet(exp)
                    }
                  }}
                  placeholder="Add a responsibility…"
                  aria-label={`Add responsibility to ${exp.title}`}
                />
                <Button
                  variant="outline"
                  onClick={() => addBullet(exp)}
                  disabled={!(newBullet[exp.id] ?? '').trim()}
                >
                  <Plus aria-hidden="true" /> Add
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Edit role' : 'Add role'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exp-company">Company</Label>
              <Input id="exp-company" aria-invalid={!!errors.company} {...register('company')} />
              {errors.company && (
                <p className="text-destructive text-xs" role="alert">
                  {errors.company.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exp-title">Job title</Label>
              <Input id="exp-title" aria-invalid={!!errors.title} {...register('title')} />
              {errors.title && (
                <p className="text-destructive text-xs" role="alert">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-location">Location</Label>
              <Input id="exp-location" {...register('location')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-type">Employment type</Label>
              <Input id="exp-type" placeholder="e.g. Permanent" {...register('employment_type')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-start">Start date</Label>
              <Input id="exp-start" type="date" {...register('start_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-end">End date</Label>
              <Input id="exp-end" type="date" {...register('end_date')} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input id="exp-current" type="checkbox" {...register('is_current')} />
              <Label htmlFor="exp-current">I currently work here</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save role' : 'Add role'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </SectionCard>
  )

  function move2(exp: ExperienceWithBullets, index: number, direction: -1 | 1) {
    const a = exp.experience_bullets[index]
    const b = exp.experience_bullets[index + direction]
    if (!a || !b) return
    bulletMut.swap.mutate({
      a: { id: a.id, display_order: a.display_order },
      b: { id: b.id, display_order: b.display_order },
    })
  }
}
