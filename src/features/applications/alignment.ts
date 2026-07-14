import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useUserId } from '@/features/profile/hooks'
import { applicationKeys } from './hooks'
import type { ConfirmationQuestion, JobAnalysisRun } from '@/types/domain'

const analysisSchema = z.object({
  id: z.string(),
  alignment_score: z.number().nullable(),
  summary: z.unknown(),
  created_at: z.string(),
})

export const alignmentKeys = {
  latest: (applicationId: string) => ['analysis', applicationId] as const,
  questions: (applicationId: string) => ['questions', applicationId] as const,
}

export function useLatestAnalysis(applicationId: string) {
  return useQuery({
    queryKey: alignmentKeys.latest(applicationId),
    queryFn: async (): Promise<JobAnalysisRun | null> => {
      const { data, error } = await supabase
        .from('job_analysis_runs')
        .select('*')
        .eq('job_application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!applicationId,
  })
}

export function useConfirmationQuestions(applicationId: string) {
  return useQuery({
    queryKey: alignmentKeys.questions(applicationId),
    queryFn: async (): Promise<ConfirmationQuestion[]> => {
      const { data, error } = await supabase
        .from('confirmation_questions')
        .select('*')
        .eq('job_application_id', applicationId)
        .order('created_at')
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!applicationId,
  })
}

export function useRunAnalysis(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (options?: { force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke(
        'analyze-alignment',
        {
          body: {
            job_application_id: applicationId,
            force: options?.force ?? false,
          },
        },
      )
      if (error) {
        let message =
          'Alignment analysis is unavailable right now. Check that requirements exist and your profile has verified records.'
        try {
          const body = await (error as { context?: Response }).context?.json()
          if (body?.error) message = body.error
        } catch {
          // keep default message
        }
        throw new Error(message)
      }
      const parsed = analysisSchema.safeParse(data?.analysis)
      if (!parsed.success) throw new Error('Unexpected analysis response.')
      return { analysis: parsed.data, cached: Boolean(data?.cached) }
    },
    onSuccess: ({ cached }) => {
      void queryClient.invalidateQueries({
        queryKey: alignmentKeys.latest(applicationId),
      })
      void queryClient.invalidateQueries({
        queryKey: alignmentKeys.questions(applicationId),
      })
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.requirements(applicationId),
      })
      if (cached) toast.info('Nothing changed since the last analysis — showing the stored result.')
      else toast.success('Alignment analysis complete.')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useAnswerQuestion(applicationId: string) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      question,
      answer,
    }: {
      question: ConfirmationQuestion
      answer: string
    }) => {
      // The answer becomes user-confirmed evidence, usable by Truth Lock.
      const { data: evidence, error: evidenceError } = await supabase
        .from('user_confirmed_evidence')
        .insert({
          user_id: userId,
          confirmation_question_id: question.id,
          description: answer,
        })
        .select()
        .single()
      if (evidenceError) throw new Error(evidenceError.message)
      const { error } = await supabase
        .from('confirmation_questions')
        .update({ answer, status: 'answered' })
        .eq('id', question.id)
      if (error) throw new Error(error.message)
      return evidence
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: alignmentKeys.questions(applicationId),
      })
      toast.success(
        'Confirmed — rerun the analysis to include your new evidence.',
      )
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDismissQuestion(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('confirmation_questions')
        .update({ status: 'dismissed' })
        .eq('id', questionId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: alignmentKeys.questions(applicationId),
      }),
    onError: (error: Error) => toast.error(error.message),
  })
}
