import { History, Lock, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CvDocument } from '@/features/tailor/document'
import type { CvStatus, TailoredCv } from '@/types/domain'
import { useVersionMutations, useVersions } from './hooks'

const statusVariants: Record<
  CvStatus,
  'warning' | 'default' | 'secondary' | 'success' | 'outline'
> = {
  draft: 'warning',
  ready: 'default',
  locked: 'secondary',
  submitted: 'success',
  archived: 'outline',
}

export function VersionsPanel({
  cv,
  document,
}: {
  cv: TailoredCv
  document: CvDocument
}) {
  const { data: versions = [] } = useVersions(cv.id)
  const mutations = useVersionMutations(cv)

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="h-4 w-4" aria-hidden="true" /> Versions
        </h2>
        <Button
          size="sm"
          variant="outline"
          disabled={mutations.create.isPending}
          onClick={() => mutations.create.mutate(document)}
        >
          <Save aria-hidden="true" />
          {mutations.create.isPending ? 'Saving…' : 'Save version'}
        </Button>
      </div>
      {versions.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No saved versions yet. Save a version before applying so the exact
          submitted CV is preserved forever.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {versions.map((version) => {
            const immutable =
              version.status === 'locked' || version.status === 'submitted'
            return (
              <li
                key={version.id}
                className="rounded-md border px-2.5 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">v{version.version_number}</span>
                  <Badge variant={statusVariants[version.status]}>
                    {version.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {new Date(version.created_at).toLocaleString()}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Replace the active draft with version ${version.version_number}? The current draft content is overwritten (versions themselves never change).`,
                        )
                      )
                        mutations.restore.mutate(version)
                    }}
                  >
                    <RotateCcw aria-hidden="true" /> Restore
                  </Button>
                  {!immutable && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => mutations.lock.mutate(version.id)}
                      >
                        <Lock aria-hidden="true" /> Lock
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          if (window.confirm('Delete this unlocked version?'))
                            mutations.remove.mutate(version.id)
                        }}
                      >
                        <Trash2 aria-hidden="true" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
