import { useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { askAssistant } from './api'
import { tailorKeys } from './hooks'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function AssistantPanel({ tailoredCvId }: { tailoredCvId: string }) {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const send = async () => {
    const message = input.trim()
    if (!message || busy) return
    setBusy(true)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: message }])
    try {
      const { reply, pendingSuggestions } = await askAssistant(
        tailoredCvId,
        message,
        messages.slice(-10),
      )
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      if (pendingSuggestions > 0) {
        void queryClient.invalidateQueries({
          queryKey: tailorKeys.suggestions(tailoredCvId),
        })
        toast.info(
          `${pendingSuggestions} change${pendingSuggestions === 1 ? '' : 's'} proposed — review in the suggestions list.`,
        )
      }
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assistant failed.')
      setMessages((m) => m.slice(0, -1))
      setInput(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-64 flex-col">
      <div
        ref={logRef}
        className="flex-1 space-y-3 overflow-y-auto pr-1"
        role="log"
        aria-label="Assistant conversation"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Ask about this job, your evidence, or request a change — anything
            it proposes still comes to you as a reviewable suggestion.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'bg-primary text-primary-foreground ml-6 rounded-lg px-3 py-2 text-sm'
                : 'bg-muted mr-6 rounded-lg px-3 py-2 text-sm'
            }
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <p className="text-muted-foreground text-xs" role="status">
            Thinking…
          </p>
        )}
      </div>
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Textarea
          rows={2}
          value={input}
          placeholder="Message the assistant…"
          aria-label="Message the assistant"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
          <SendHorizontal aria-hidden="true" />
        </Button>
      </form>
    </div>
  )
}
