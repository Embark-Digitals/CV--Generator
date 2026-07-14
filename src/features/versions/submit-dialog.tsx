import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { useSubmitVersion, useVersionsForApplication } from './hooks'

/**
 * Shown when an application becomes Applied: asks which saved CV version was
 * actually submitted, locks it permanently, and records the application date.
 */
export function SubmitVersionDialog({
  applicationId,
  open,
  onClose,
}: {
  applicationId: string
  open: boolean
  onClose: () => void
}) {
  const { data: versions = [] } = useVersionsForApplication(applicationId)
  const submit = useSubmitVersion(applicationId)
  const [versionId, setVersionId] = useState('')
  const [appliedDate, setAppliedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )

  const candidates = versions.filter((v) => v.status !== 'archived')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Which CV version did you submit?"
      description="The submitted version is locked permanently so you always know exactly what the employer received."
    >
      {candidates.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm">
            No saved CV versions exist for this application yet. Open the
            tailored CV and save a version first — you can record the
            submission afterwards from the application page.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const version = candidates.find((v) => v.id === versionId)
            if (!version) return
            submit.mutate(
              {
                version,
                appliedAt: new Date(`${appliedDate}T12:00:00`).toISOString(),
              },
              { onSuccess: onClose },
            )
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="submitted-version">CV version</Label>
            <Select
              id="submitted-version"
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
              required
            >
              <option value="" disabled>
                Choose the submitted version…
              </option>
              {candidates.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {v.status} —{' '}
                  {new Date(v.created_at).toLocaleDateString()}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="applied-date">Application date</Label>
            <Input
              id="applied-date"
              type="date"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Not now
            </Button>
            <Button type="submit" disabled={!versionId || submit.isPending}>
              {submit.isPending ? 'Recording…' : 'Lock and record'}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  )
}
