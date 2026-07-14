import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { SectionCard, EmptyState } from './section-card'
import { VerificationBadge, VerifyActions } from './verification'
import { useEntityMutations, useUserId } from '../hooks'
import type { VerificationStatus } from '@/types/domain'

export interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'date' | 'email' | 'textarea'
  required?: boolean
  placeholder?: string
}

interface EntityRow {
  id: string
  display_order: number
  verification_status: VerificationStatus
  [key: string]: unknown
}

interface EntityListSectionProps<T extends EntityRow> {
  title: string
  description?: string
  table: 'education' | 'certifications' | 'skills' | 'references'
  rows: T[]
  isLoading: boolean
  fields: FieldDef[]
  emptyMessage: string
  addLabel: string
  renderPrimary: (row: T) => ReactNode
  renderSecondary?: (row: T) => ReactNode
  /** Extra values merged into every insert (e.g. skills kind). */
  insertExtras?: Record<string, unknown>
}

export function EntityListSection<T extends EntityRow>({
  title,
  description,
  table,
  rows,
  isLoading,
  fields,
  emptyMessage,
  addLabel,
  renderPrimary,
  renderSecondary,
  insertExtras,
}: EntityListSectionProps<T>) {
  const userId = useUserId()
  const mutations = useEntityMutations(table)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const openAdd = () => {
    setEditing(null)
    setValues(Object.fromEntries(fields.map((f) => [f.name, ''])))
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (row: T) => {
    setEditing(row)
    setValues(
      Object.fromEntries(
        fields.map((f) => [f.name, (row[f.name] as string | null) ?? '']),
      ),
    )
    setFormError(null)
    setDialogOpen(true)
  }

  const submit = () => {
    for (const f of fields) {
      if (f.required && !values[f.name]?.trim()) {
        setFormError(`${f.label} is required.`)
        return
      }
    }
    const patch = Object.fromEntries(
      fields.map((f) => [f.name, values[f.name]?.trim() ? values[f.name] : null]),
    )
    if (editing) {
      mutations.update.mutate(
        // Field names come from the FieldDef config for this table.
        { id: editing.id, patch: patch as never },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      mutations.insert.mutate(
        {
          ...patch,
          ...insertExtras,
          user_id: userId,
          source: 'manual',
          verification_status: 'user_confirmed',
          display_order: rows.length,
        } as never,
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  const move = (index: number, direction: -1 | 1) => {
    const a = rows[index]
    const b = rows[index + direction]
    if (!a || !b) return
    mutations.swap.mutate({
      a: { id: a.id, display_order: a.display_order },
      b: { id: b.id, display_order: b.display_order },
    })
  }

  return (
    <SectionCard
      title={title}
      description={description}
      onAdd={openAdd}
      addLabel={addLabel}
    >
      {isLoading ? (
        <p className="text-muted-foreground text-sm" role="status">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        <ul className="divide-y">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{renderPrimary(row)}</div>
                {renderSecondary && (
                  <div className="text-muted-foreground text-sm">
                    {renderSecondary(row)}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <VerificationBadge status={row.verification_status} />
                <VerifyActions
                  status={row.verification_status}
                  onVerify={() =>
                    mutations.update.mutate({
                      id: row.id,
                      patch: { verification_status: 'verified' },
                    })
                  }
                  onReject={() =>
                    mutations.update.mutate({
                      id: row.id,
                      patch: { verification_status: 'rejected' },
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(row)}
                  aria-label="Edit"
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm('Remove this record?'))
                      mutations.remove.mutate(row.id)
                  }}
                  aria-label="Delete"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Edit ${title.toLowerCase()}` : addLabel}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-4"
          noValidate
        >
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={`${table}-${f.name}`}>{f.label}</Label>
              {f.type === 'textarea' ? (
                <Textarea
                  id={`${table}-${f.name}`}
                  value={values[f.name] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    setValues((s) => ({ ...s, [f.name]: e.target.value }))
                  }
                />
              ) : (
                <Input
                  id={`${table}-${f.name}`}
                  type={f.type ?? 'text'}
                  value={values[f.name] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    setValues((s) => ({ ...s, [f.name]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
          {formError && (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </SectionCard>
  )
}
