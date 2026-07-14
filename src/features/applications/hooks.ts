import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUserId } from '@/features/profile/hooks'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import * as api from './api'

export const applicationKeys = {
  list: (userId: string) => ['applications', userId] as const,
  detail: (id: string) => ['application', id] as const,
  requirements: (id: string) => ['requirements', id] as const,
  notes: (id: string) => ['notes', id] as const,
}

export function useApplications() {
  const userId = useUserId()
  return useQuery({
    queryKey: applicationKeys.list(userId),
    queryFn: () => api.fetchApplications(userId),
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => api.fetchApplication(id),
    enabled: !!id,
  })
}

export function useRequirements(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.requirements(applicationId),
    queryFn: () => api.fetchRequirements(applicationId),
    enabled: !!applicationId,
  })
}

export function useNotes(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.notes(applicationId),
    queryFn: () => api.fetchNotes(applicationId),
    enabled: !!applicationId,
  })
}

function onError(error: Error) {
  toast.error(error.message || 'Something went wrong.')
}

export function useCreateApplication() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (row: Omit<TablesInsert<'job_applications'>, 'user_id'>) =>
      api.createApplication({ ...row, user_id: userId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: applicationKeys.list(userId) }),
    onError,
  })
}

export function useUpdateApplication(id: string) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: TablesUpdate<'job_applications'>) =>
      api.updateApplication(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: applicationKeys.list(userId) })
    },
    onError,
  })
}

export function useDeleteApplication() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteApplication(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: applicationKeys.list(userId) }),
    onError,
  })
}

export function useRequirementMutations(applicationId: string) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: applicationKeys.requirements(applicationId),
    })

  const insert = useMutation({
    mutationFn: (
      row: Omit<
        TablesInsert<'job_requirements'>,
        'user_id' | 'job_application_id'
      >,
    ) =>
      api.insertRequirement({
        ...row,
        user_id: userId,
        job_application_id: applicationId,
      }),
    onSuccess: invalidate,
    onError,
  })
  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: TablesUpdate<'job_requirements'>
    }) => api.updateRequirement(id, patch),
    onSuccess: invalidate,
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteRequirement(id),
    onSuccess: invalidate,
    onError,
  })
  return { insert, update, remove }
}

export function useNoteMutations(applicationId: string) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: applicationKeys.notes(applicationId),
    })
  const insert = useMutation({
    mutationFn: (content: string) =>
      api.insertNote({
        user_id: userId,
        job_application_id: applicationId,
        content,
      }),
    onSuccess: invalidate,
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: invalidate,
    onError,
  })
  return { insert, remove }
}
