import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FileDown,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useApplication } from '@/features/applications/hooks'
import {
  useGenerateSuggestions,
  useResolveSuggestion,
  useSaveDocument,
  useSuggestions,
  useTailoredCv,
} from '@/features/tailor/hooks'
import { parseDocument } from '@/features/tailor/api'
import {
  sectionTitles,
  type CvDocument,
  type SectionKey,
} from '@/features/tailor/document'
import { AtsClassicPreview } from '@/features/tailor/ats-preview'
import { SuggestionCard } from '@/features/tailor/suggestion-card'
import { AssistantPanel } from '@/features/tailor/assistant-panel'
import { exportCv } from '@/features/tailor/export'
import { useUserId } from '@/features/profile/hooks'
import { cn } from '@/lib/utils'

type MobileTab = 'sections' | 'preview' | 'review' | 'assistant'

function SectionsPanel({
  document: doc,
  onChange,
  disabled,
}: {
  document: CvDocument
  onChange: (next: CvDocument) => void
  disabled: boolean
}) {
  const move = (index: number, direction: -1 | 1) => {
    const order = [...doc.sectionOrder]
    const target = index + direction
    if (target < 0 || target >= order.length) return
    ;[order[index], order[target]] = [order[target], order[index]]
    onChange({ ...doc, sectionOrder: order })
  }
  return (
    <div className="space-y-1">
      <h2 className="mb-2 text-sm font-semibold">CV sections</h2>
      {doc.sectionOrder.map((key, index) => (
        <div
          key={key}
          className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2"
        >
          <span className="text-sm">{sectionTitles[key as SectionKey]}</span>
          <span className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Move ${sectionTitles[key as SectionKey]} up`}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={disabled || index === doc.sectionOrder.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Move ${sectionTitles[key as SectionKey]} down`}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Switch
              checked={doc.sectionVisibility[key as SectionKey] ?? true}
              disabled={disabled}
              aria-label={`Show ${sectionTitles[key as SectionKey]} section`}
              onChange={(e) =>
                onChange({
                  ...doc,
                  sectionVisibility: {
                    ...doc.sectionVisibility,
                    [key]: e.target.checked,
                  },
                })
              }
            />
          </span>
        </div>
      ))}
    </div>
  )
}

export function TailorPage() {
  const { id = '', versionId = '' } = useParams()
  const userId = useUserId()
  const { data: app } = useApplication(id)
  const { data: cv, isLoading, error } = useTailoredCv(versionId)
  const { data: suggestions = [] } = useSuggestions(versionId)
  const saveDocument = useSaveDocument(versionId)
  const generate = useGenerateSuggestions(versionId)
  const resolve = useResolveSuggestion(versionId)
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview')
  const [rightTab, setRightTab] = useState<'review' | 'assistant'>('review')
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)

  const document = useMemo(() => {
    if (!cv) return null
    try {
      return parseDocument(cv)
    } catch {
      return null
    }
  }, [cv])

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Loading tailoring workspace…
      </p>
    )
  }
  if (error || !cv || !document) {
    return (
      <div className="space-y-3">
        <p className="text-sm">This tailored CV could not be loaded.</p>
        <Link
          to={`/applications/${id}`}
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          Back to the application
        </Link>
      </div>
    )
  }

  const editable = cv.status === 'draft' || cv.status === 'ready'
  const pending = suggestions.filter((s) => s.status === 'pending')

  const onDocumentChange = (next: CvDocument) => saveDocument.mutate(next)

  const reviewPanel = (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          Suggestions{' '}
          {pending.length > 0 && <Badge>{pending.length} pending</Badge>}
        </h2>
        <Button
          size="sm"
          disabled={!editable || generate.isPending}
          onClick={() => generate.mutate()}
        >
          <Sparkles aria-hidden="true" />
          {generate.isPending ? 'Generating…' : 'Suggest changes'}
        </Button>
      </div>
      {pending.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No pending suggestions. Generate suggestions or ask the assistant.
          Every accepted change stays traceable to your verified evidence.
        </p>
      ) : (
        <ul className="space-y-3 overflow-y-auto pr-1">
          {pending.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              busy={resolve.isPending || !editable}
              onResolve={(action, editedText) =>
                resolve.mutate({
                  suggestion: s,
                  action,
                  editedText,
                  document,
                })
              }
            />
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            to={`/applications/${id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {app ? `${app.job_title} — ${app.company}` : 'Application'}
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">
            {cv.title}{' '}
            <Badge variant={editable ? 'warning' : 'secondary'}>
              {cv.status}
            </Badge>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {saveDocument.isPending && (
            <p className="text-muted-foreground text-xs" role="status">
              Saving…
            </p>
          )}
          {(['pdf', 'docx'] as const).map((format) => (
            <Button
              key={format}
              variant="outline"
              size="sm"
              disabled={exporting !== null || !app}
              onClick={async () => {
                if (!app) return
                setExporting(format)
                try {
                  const fileName = await exportCv({
                    userId,
                    tailoredCvId: versionId,
                    jobApplicationId: id,
                    document,
                    jobTitle: app.job_title,
                    company: app.company,
                    format,
                  })
                  toast.success(`Exported ${fileName}`)
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : 'Export failed.',
                  )
                } finally {
                  setExporting(null)
                }
              }}
            >
              <FileDown aria-hidden="true" />
              {exporting === format
                ? 'Exporting…'
                : `Export ${format.toUpperCase()}`}
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="mb-4 flex gap-1 lg:hidden" role="tablist">
        {(
          [
            ['sections', 'Details'],
            ['preview', 'Preview'],
            ['review', `Review${pending.length ? ` (${pending.length})` : ''}`],
            ['assistant', 'Assistant'],
          ] as Array<[MobileTab, string]>
        ).map(([tab, label]) => (
          <button
            key={tab}
            role="tab"
            aria-selected={mobileTab === tab}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              mobileTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent',
            )}
            onClick={() => setMobileTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
        <aside
          className={cn('lg:block', mobileTab === 'sections' ? 'block' : 'hidden')}
        >
          <SectionsPanel
            document={document}
            onChange={onDocumentChange}
            disabled={!editable}
          />
        </aside>

        <div
          className={cn(
            'min-w-0 overflow-auto rounded-md bg-neutral-200 p-4 dark:bg-neutral-800 lg:block',
            mobileTab === 'preview' ? 'block' : 'hidden',
          )}
        >
          <AtsClassicPreview document={document} />
        </div>

        <aside
          className={cn(
            'min-h-0 lg:block',
            mobileTab === 'review' || mobileTab === 'assistant'
              ? 'block'
              : 'hidden',
          )}
        >
          <div className="mb-3 hidden gap-1 lg:flex" role="tablist">
            {(
              [
                ['review', `Review${pending.length ? ` (${pending.length})` : ''}`],
                ['assistant', 'Assistant'],
              ] as Array<['review' | 'assistant', string]>
            ).map(([tab, label]) => (
              <button
                key={tab}
                role="tab"
                aria-selected={rightTab === tab}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  rightTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent',
                )}
                onClick={() => setRightTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="hidden h-[calc(100%-3rem)] lg:block">
            {rightTab === 'review' ? (
              reviewPanel
            ) : (
              <AssistantPanel tailoredCvId={versionId} />
            )}
          </div>
          <div className="lg:hidden">
            {mobileTab === 'review' && reviewPanel}
            {mobileTab === 'assistant' && (
              <AssistantPanel tailoredCvId={versionId} />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
