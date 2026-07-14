import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AiSuggestion } from '@/types/domain'

const sectionLabels: Record<string, string> = {
  summary: 'Professional summary',
  headline: 'Headline',
  experience_bullet: 'Responsibility',
}

export function SuggestionCard({
  suggestion,
  onResolve,
  busy,
}: {
  suggestion: AiSuggestion
  onResolve: (
    action: 'accepted' | 'rejected' | 'manually_edited',
    editedText?: string,
  ) => void
  busy: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(suggestion.proposed_text)

  return (
    <li className="rounded-md border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">
          {sectionLabels[suggestion.target_record_type ?? ''] ??
            suggestion.target_section}
        </Badge>
        {suggestion.confidence != null && (
          <Badge variant="secondary">
            {Math.round(suggestion.confidence * 100)}% confidence
          </Badge>
        )}
        <Badge variant="success">
          {suggestion.evidence_ids.length} evidence{' '}
          {suggestion.evidence_ids.length === 1 ? 'record' : 'records'}
        </Badge>
      </div>

      {suggestion.original_text && (
        <div className="mb-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Current
          </p>
          <p className="text-muted-foreground text-sm line-through decoration-1">
            {suggestion.original_text}
          </p>
        </div>
      )}

      <div className="mb-2">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Suggested
        </p>
        {editing ? (
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Edit suggested text"
          />
        ) : (
          <p className="text-sm">{suggestion.proposed_text}</p>
        )}
      </div>

      <p className="text-muted-foreground mb-3 text-xs">
        <span className="font-medium">Why:</span> {suggestion.reason}
      </p>

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button
              size="sm"
              disabled={busy || !text.trim()}
              onClick={() => {
                onResolve('manually_edited', text)
                setEditing(false)
              }}
            >
              <Check aria-hidden="true" /> Apply my edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setText(suggestion.proposed_text)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={busy} onClick={() => onResolve('accepted')}>
              <Check aria-hidden="true" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onResolve('rejected')}
            >
              <X aria-hidden="true" /> Reject
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
