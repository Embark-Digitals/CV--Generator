import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/features/profile/components/section-card'
import { StatusBadge, statusLabels, statusOrder } from '@/features/applications/status'
import {
  useApplication,
  useDeleteApplication,
  useNoteMutations,
  useNotes,
  useRequirementMutations,
  useRequirements,
  useUpdateApplication,
} from '@/features/applications/hooks'
import { extractRequirements } from '@/features/applications/api'
import { useQueryClient } from '@tanstack/react-query'
import { applicationKeys } from '@/features/applications/hooks'
import type {
  AlignmentStatus,
  ApplicationStatus,
  JobRequirement,
  RequirementKind,
} from '@/types/domain'

const kindLabels: Record<RequirementKind, string> = {
  qualification: 'Qualification',
  experience: 'Experience',
  skill: 'Skill',
  system: 'System / software',
  responsibility: 'Responsibility',
  regulatory: 'Regulatory',
  licence: 'Licence',
  industry_term: 'Industry term',
  submission: 'Submission instruction',
  other: 'Other',
}

const alignmentLabels: Record<AlignmentStatus, string> = {
  supported: 'Supported',
  partially_supported: 'Partially supported',
  not_evidenced: 'Not evidenced',
  needs_confirmation: 'Needs confirmation',
}

const alignmentVariants: Record<
  AlignmentStatus,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  supported: 'success',
  partially_supported: 'warning',
  not_evidenced: 'destructive',
  needs_confirmation: 'secondary',
}

export function AlignmentBadge({ status }: { status: AlignmentStatus }) {
  return (
    <Badge variant={alignmentVariants[status]}>{alignmentLabels[status]}</Badge>
  )
}

function AdvertEditor({
  value,
  onSave,
  saving,
}: {
  value: string
  onSave: (text: string) => void
  saving: boolean
}) {
  const [text, setText] = useState(value)
  const dirty = text !== value
  return (
    <div className="space-y-2">
      <Textarea
        rows={12}
        value={text}
        placeholder="Paste the advertisement text…"
        aria-label="Advertisement text"
        onChange={(e) => setText(e.target.value)}
        className="font-mono text-xs"
      />
      <div className="flex items-center justify-end gap-3">
        {dirty && (
          <p className="text-warning text-xs" role="status">
            Unsaved changes
          </p>
        )}
        <Button size="sm" disabled={!dirty || saving} onClick={() => onSave(text)}>
          {saving ? 'Saving…' : 'Save advert text'}
        </Button>
      </div>
    </div>
  )
}

function RequirementRow({
  requirement,
  onUpdate,
  onDelete,
}: {
  requirement: JobRequirement
  onUpdate: (patch: Partial<JobRequirement>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(requirement.description)

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Requirement description"
            />
            <Button
              size="sm"
              onClick={() => {
                if (description.trim()) {
                  onUpdate({ description: description.trim() })
                  setEditing(false)
                }
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="text-left text-sm hover:underline"
            onClick={() => {
              setDescription(requirement.description)
              setEditing(true)
            }}
            aria-label={`Edit requirement: ${requirement.description}`}
          >
            {requirement.description}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{kindLabels[requirement.kind]}</Badge>
          {requirement.alignment && (
            <AlignmentBadge status={requirement.alignment} />
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Select
          className="h-8 w-28 text-xs"
          value={requirement.priority}
          aria-label="Requirement priority"
          onChange={(e) =>
            onUpdate({ priority: e.target.value as 'required' | 'preferred' })
          }
        >
          <option value="required">Required</option>
          <option value="preferred">Preferred</option>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Remove requirement"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}

export function ApplicationDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: app, isLoading } = useApplication(id)
  const { data: requirements = [] } = useRequirements(id)
  const { data: notes = [] } = useNotes(id)
  const updateApp = useUpdateApplication(id)
  const deleteApp = useDeleteApplication()
  const reqMut = useRequirementMutations(id)
  const noteMut = useNoteMutations(id)

  const [newRequirement, setNewRequirement] = useState('')
  const [newRequirementKind, setNewRequirementKind] =
    useState<RequirementKind>('skill')
  const [newNote, setNewNote] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [showAdvert, setShowAdvert] = useState(false)

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Loading application…
      </p>
    )
  }
  if (!app) {
    return (
      <div className="space-y-3">
        <p className="text-sm">Application not found.</p>
        <Link to="/applications" className="text-primary text-sm underline-offset-4 hover:underline">
          Back to applications
        </Link>
      </div>
    )
  }

  const runExtraction = async () => {
    if (!app.advert_text?.trim()) {
      toast.error('Add the advertisement text first.')
      return
    }
    setExtracting(true)
    try {
      const extraction = await extractRequirements(id)
      let order = requirements.length
      for (const req of extraction.requirements) {
        await reqMut.insert.mutateAsync({
          kind: (Object.keys(kindLabels) as RequirementKind[]).includes(
            req.kind as RequirementKind,
          )
            ? (req.kind as RequirementKind)
            : 'other',
          priority: req.priority,
          description: req.description,
          source: 'ai',
          display_order: order++,
        })
      }
      const patch: Record<string, string> = {}
      if (!app.location && extraction.location) patch.location = extraction.location
      if (!app.employment_type && extraction.employment_type)
        patch.employment_type = extraction.employment_type
      if (!app.seniority && extraction.seniority) patch.seniority = extraction.seniority
      if (!app.closing_date && extraction.closing_date && /^\d{4}-\d{2}-\d{2}$/.test(extraction.closing_date))
        patch.closing_date = extraction.closing_date
      if (Object.keys(patch).length > 0) updateApp.mutate(patch)
      await queryClient.invalidateQueries({
        queryKey: applicationKeys.requirements(id),
      })
      toast.success(
        `${extraction.requirements.length} requirements extracted. Review and correct them below.`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Extraction failed.')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/applications"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All applications
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {app.job_title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {app.company}
            {app.location ? ` · ${app.location}` : ''}
            {app.closing_date ? ` · closes ${app.closing_date}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={app.status} />
          <Label htmlFor="status-select" className="sr-only">
            Application status
          </Label>
          <Select
            id="status-select"
            className="w-40"
            value={app.status}
            onChange={(e) =>
              updateApp.mutate({
                status: e.target.value as ApplicationStatus,
                ...(e.target.value === 'applied' && !app.applied_at
                  ? { applied_at: new Date().toISOString() }
                  : {}),
              })
            }
          >
            {statusOrder.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Job advertisement</CardTitle>
              <CardDescription>
                The original advertisement is preserved in full.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvert((v) => !v)}
              aria-expanded={showAdvert}
            >
              {showAdvert ? 'Hide advert' : 'Show advert'}
            </Button>
          </CardHeader>
          {showAdvert && (
            <CardContent>
              <AdvertEditor
                value={app.advert_text ?? ''}
                onSave={(text) => updateApp.mutate({ advert_text: text })}
                saving={updateApp.isPending}
              />
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>
                Requirements{' '}
                {requirements.length > 0 && (
                  <Badge variant="secondary">{requirements.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Extracted requirements are suggestions — edit, remove or add
                until they match the advert.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => void runExtraction()}
              disabled={extracting}
            >
              <Sparkles aria-hidden="true" />
              {extracting ? 'Extracting…' : 'Extract with AI'}
            </Button>
          </CardHeader>
          <CardContent>
            {requirements.length === 0 ? (
              <EmptyState>
                No requirements yet. Use AI extraction or add them manually.
              </EmptyState>
            ) : (
              <ul className="divide-y">
                {requirements.map((req) => (
                  <RequirementRow
                    key={req.id}
                    requirement={req}
                    onUpdate={(patch) =>
                      reqMut.update.mutate({ id: req.id, patch })
                    }
                    onDelete={() => reqMut.remove.mutate(req.id)}
                  />
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Select
                className="w-44"
                value={newRequirementKind}
                aria-label="New requirement kind"
                onChange={(e) =>
                  setNewRequirementKind(e.target.value as RequirementKind)
                }
              >
                {Object.entries(kindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                className="min-w-52 flex-1"
                placeholder="Add a missed requirement…"
                value={newRequirement}
                aria-label="New requirement description"
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRequirement.trim()) {
                    e.preventDefault()
                    reqMut.insert.mutate({
                      kind: newRequirementKind,
                      description: newRequirement.trim(),
                      source: 'manual',
                      display_order: requirements.length,
                    })
                    setNewRequirement('')
                  }
                }}
              />
              <Button
                variant="outline"
                disabled={!newRequirement.trim()}
                onClick={() => {
                  reqMut.insert.mutate({
                    kind: newRequirementKind,
                    description: newRequirement.trim(),
                    source: 'manual',
                    display_order: requirements.length,
                  })
                  setNewRequirement('')
                }}
              >
                <Plus aria-hidden="true" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tailored CVs</CardTitle>
            <CardDescription>
              Job Alignment analysis and tailored CV versions arrive in the
              next build phases.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                rows={2}
                placeholder="Add a note…"
                value={newNote}
                aria-label="New note"
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={!newNote.trim()}
                onClick={() => {
                  noteMut.insert.mutate(newNote.trim())
                  setNewNote('')
                }}
              >
                Add
              </Button>
            </div>
            {notes.length > 0 && (
              <ul className="divide-y">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="flex items-start justify-between gap-2 py-2 text-sm"
                  >
                    <div>
                      <p className="whitespace-pre-wrap">{note.content}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => noteMut.remove.mutate(note.id)}
                      aria-label="Delete note"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => {
              if (
                window.confirm(
                  'Delete this application and everything attached to it? This cannot be undone.',
                )
              ) {
                deleteApp.mutate(id, {
                  onSuccess: () => navigate('/applications'),
                })
              }
            }}
          >
            Delete application
          </Button>
        </div>
      </div>
    </div>
  )
}
