import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUserId } from '@/features/profile/hooks'
import { tailorKeys } from '@/features/tailor/hooks'
import { applicationKeys } from '@/features/applications/hooks'
import type { CvDocument } from '@/features/tailor/document'
import type { CvVersion, TailoredCv } from '@/types/domain'
import * as api from './api'

export const versionKeys = {
  list: (tailoredCvId: string) => ['versions', tailoredCvId] as const,
  forApplication: (applicationId: string) =>
    ['versions-app', applicationId] as const,
}

export function useVersions(tailoredCvId: string) {
  return useQuery({
    queryKey: versionKeys.list(tailoredCvId),
    queryFn: () => api.fetchVersions(tailoredCvId),
    enabled: !!tailoredCvId,
  })
}

export function useVersionsForApplication(applicationId: string) {
  return useQuery({
    queryKey: versionKeys.forApplication(applicationId),
    queryFn: () => api.fetchVersionsForApplication(applicationId),
    enabled: !!applicationId,
  })
}

export function useVersionMutations(cv: TailoredCv | undefined) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const invalidate = () => {
    if (!cv) return
    void queryClient.invalidateQueries({ queryKey: versionKeys.list(cv.id) })
    void queryClient.invalidateQueries({
      queryKey: versionKeys.forApplication(cv.job_application_id),
    })
    void queryClient.invalidateQueries({ queryKey: tailorKeys.detail(cv.id) })
    void queryClient.invalidateQueries({
      queryKey: applicationKeys.detail(cv.job_application_id),
    })
  }

  const create = useMutation({
    mutationFn: (document: CvDocument) => {
      if (!cv) throw new Error('No tailored CV loaded')
      return api.createVersion(userId, cv, document)
    },
    onSuccess: (version) => {
      invalidate()
      toast.success(`Version ${version.version_number} saved.`)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const lock = useMutation({
    mutationFn: (id: string) => api.lockVersion(id),
    onSuccess: () => {
      invalidate()
      toast.success('Version locked — it can no longer change.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const restore = useMutation({
    mutationFn: (version: CvVersion) => api.restoreVersion(version),
    onSuccess: () => {
      invalidate()
      toast.success('Version restored into the active draft.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteVersion(id),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  })

  return { create, lock, restore, remove }
}

export function useSubmitVersion(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      version,
      appliedAt,
    }: {
      version: CvVersion
      appliedAt: string
    }) => api.submitVersion(version, appliedAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: versionKeys.forApplication(applicationId),
      })
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(applicationId),
      })
      void queryClient.invalidateQueries({ queryKey: ['tailored-cvs'] })
      toast.success('Submitted CV version recorded and locked.')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
