import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUserId } from '@/features/profile/hooks'
import type { AiSuggestion } from '@/types/domain'
import * as api from './api'
import { applySuggestionToDocument, type CvDocument } from './document'

export const tailorKeys = {
  list: (applicationId: string) => ['tailored-cvs', applicationId] as const,
  detail: (id: string) => ['tailored-cv', id] as const,
  suggestions: (id: string) => ['suggestions', id] as const,
}

export function useTailoredCvs(applicationId: string) {
  return useQuery({
    queryKey: tailorKeys.list(applicationId),
    queryFn: () => api.fetchTailoredCvs(applicationId),
    enabled: !!applicationId,
  })
}

export function useTailoredCv(id: string) {
  return useQuery({
    queryKey: tailorKeys.detail(id),
    queryFn: () => api.fetchTailoredCv(id),
    enabled: !!id,
  })
}

export function useSuggestions(tailoredCvId: string) {
  return useQuery({
    queryKey: tailorKeys.suggestions(tailoredCvId),
    queryFn: () => api.fetchSuggestions(tailoredCvId),
    enabled: !!tailoredCvId,
  })
}

export function useCreateTailoredCv(applicationId: string) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      api.createTailoredCv(userId, applicationId, title),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: tailorKeys.list(applicationId),
      }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useSaveDocument(tailoredCvId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (document: CvDocument) =>
      api.saveDocument(tailoredCvId, document),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: tailorKeys.detail(tailoredCvId),
      }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useGenerateSuggestions(tailoredCvId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.generateSuggestions(tailoredCvId),
    onSuccess: ({ stored, blocked }) => {
      void queryClient.invalidateQueries({
        queryKey: tailorKeys.suggestions(tailoredCvId),
      })
      if (stored === 0 && blocked === 0) {
        toast.info('No new suggestions — the CV already reflects your evidence well.')
      } else {
        toast.success(
          `${stored} suggestions ready for review${
            blocked > 0 ? ` (${blocked} blocked by Truth Lock)` : ''
          }.`,
        )
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

/**
 * Resolve a suggestion. Accepting (or saving a manual edit) applies the text
 * to the draft document — never silently, always from an explicit action.
 */
export function useResolveSuggestion(tailoredCvId: string) {
  const queryClient = useQueryClient()
  const saveDocument = useSaveDocument(tailoredCvId)
  return useMutation({
    mutationFn: async ({
      suggestion,
      action,
      editedText,
      document,
    }: {
      suggestion: AiSuggestion
      action: 'accepted' | 'rejected' | 'manually_edited'
      editedText?: string
      document: CvDocument
    }) => {
      if (action === 'rejected') {
        await api.updateSuggestion(suggestion.id, {
          status: 'rejected',
          resolved_at: new Date().toISOString(),
        })
        return
      }
      const finalText =
        action === 'manually_edited'
          ? (editedText ?? '').trim()
          : suggestion.proposed_text
      if (!finalText) throw new Error('The edited text is empty.')
      const nextDocument = applySuggestionToDocument(
        document,
        {
          target_section: suggestion.target_section,
          target_record_type: suggestion.target_record_type,
          target_record_id: suggestion.target_record_id,
        },
        finalText,
      )
      await saveDocument.mutateAsync(nextDocument)
      await api.updateSuggestion(suggestion.id, {
        status: action,
        final_text: finalText,
        resolved_at: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tailorKeys.suggestions(tailoredCvId),
      })
      void queryClient.invalidateQueries({
        queryKey: tailorKeys.detail(tailoredCvId),
      })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
