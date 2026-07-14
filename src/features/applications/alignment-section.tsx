import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  useAnswerQuestion,
  useConfirmationQuestions,
  useDismissQuestion,
  useLatestAnalysis,
  useRunAnalysis,
} from './alignment'
import type { ConfirmationQuestion } from '@/types/domain'

const DISCLAIMER =
  'Job Alignment is an internal guidance measure. It does not guarantee ATS acceptance, recruiter approval or an interview.'

interface SummaryCounts {
  supported?: number
  partially_supported?: number
  not_evidenced?: number
  needs_confirmation?: number
}

function QuestionRow({
  question,
  onAnswer,
  onDismiss,
  busy,
}: {
  question: ConfirmationQuestion
  onAnswer: (answer: string) => void
  onDismiss: () => void
  busy: boolean
}) {
  const [answer, setAnswer] = useState('')
  return (
    <li className="rounded-md border p-3">
      <p className="text-sm font-medium">{question.question}</p>
      {question.status === 'answered' ? (
        <p className="text-muted-foreground mt-1 text-sm">
          Answered: {question.answer}
        </p>
      ) : question.status === 'dismissed' ? (
        <p className="text-muted-foreground mt-1 text-sm">Dismissed</p>
      ) : (
        <div className="mt-2 space-y-2">
          <Textarea
            rows={2}
            value={answer}
            placeholder="Describe your actual experience with this — be specific and truthful…"
            aria-label={`Answer: ${question.question}`}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!answer.trim() || busy}
              onClick={() => onAnswer(answer.trim())}
            >
              Confirm as evidence
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>
              I don't have this
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

export function AlignmentSection({
  applicationId,
  hasRequirements,
}: {
  applicationId: string
  hasRequirements: boolean
}) {
  const { data: analysis } = useLatestAnalysis(applicationId)
  const { data: questions = [] } = useConfirmationQuestions(applicationId)
  const runAnalysis = useRunAnalysis(applicationId)
  const answerQuestion = useAnswerQuestion(applicationId)
  const dismissQuestion = useDismissQuestion(applicationId)

  const counts = ((analysis?.summary as { counts?: SummaryCounts }) ?? {})
    .counts
  const openQuestions = questions.filter((q) => q.status === 'pending')
  const answeredQuestions = questions.filter((q) => q.status !== 'pending')

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Job Alignment</CardTitle>
          <CardDescription>
            How well your verified evidence covers this job's requirements.
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => runAnalysis.mutate({ force: !!analysis })}
          disabled={runAnalysis.isPending || !hasRequirements}
        >
          <Sparkles aria-hidden="true" />
          {runAnalysis.isPending
            ? 'Analysing…'
            : analysis
              ? 'Re-analyse'
              : 'Analyse alignment'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasRequirements && (
          <p className="text-muted-foreground text-sm">
            Add or extract the job's requirements first.
          </p>
        )}

        {analysis && (
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p
                className="text-3xl font-semibold tabular-nums"
                aria-label={`Job alignment ${analysis.alignment_score ?? 0} percent`}
              >
                {analysis.alignment_score ?? 0}%
              </p>
              <p className="text-muted-foreground text-xs">
                analysed {new Date(analysis.created_at).toLocaleString()}
              </p>
            </div>
            {counts && (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground text-xs">Strong matches</dt>
                  <dd className="text-success font-medium">
                    {counts.supported ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Partial matches</dt>
                  <dd className="text-warning font-medium">
                    {counts.partially_supported ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Missing evidence</dt>
                  <dd className="text-destructive font-medium">
                    {counts.not_evidenced ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">To confirm</dt>
                  <dd className="font-medium">
                    {counts.needs_confirmation ?? 0}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}

        {analysis && (
          <p className="text-muted-foreground text-xs">
            Per-requirement results are shown as badges in the Requirements
            section above.
          </p>
        )}

        {openQuestions.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">
              Confirmation questions ({openQuestions.length})
            </h3>
            <ul className="space-y-2">
              {openQuestions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  busy={answerQuestion.isPending || dismissQuestion.isPending}
                  onAnswer={(answer) =>
                    answerQuestion.mutate({ question: q, answer })
                  }
                  onDismiss={() => dismissQuestion.mutate(q.id)}
                />
              ))}
            </ul>
          </div>
        )}

        {answeredQuestions.length > 0 && openQuestions.length === 0 && (
          <p className="text-muted-foreground text-xs">
            {answeredQuestions.length} confirmation question
            {answeredQuestions.length === 1 ? '' : 's'} resolved.
          </p>
        )}

        <p className="text-muted-foreground border-t pt-3 text-xs">
          {DISCLAIMER}
        </p>
      </CardContent>
    </Card>
  )
}
