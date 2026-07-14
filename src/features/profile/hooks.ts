import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import * as api from './api'

export const profileKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  visibility: (userId: string) => ['visibility', userId] as const,
  experiences: (userId: string) => ['experiences', userId] as const,
  education: (userId: string) => ['education', userId] as const,
  certifications: (userId: string) => ['certifications', userId] as const,
  skills: (userId: string) => ['skills', userId] as const,
  references: (userId: string) => ['references', userId] as const,
}

export function useUserId(): string {
  const { user } = useAuth()
  if (!user) throw new Error('useUserId requires an authenticated user')
  return user.id
}

export function useProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.profile(userId),
    queryFn: () => api.fetchProfile(userId),
  })
}

export function useVisibility() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.visibility(userId),
    queryFn: () => api.fetchVisibility(userId),
  })
}

export function useExperiences() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.experiences(userId),
    queryFn: () => api.fetchExperiences(userId),
  })
}

export function useEducation() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.education(userId),
    queryFn: () => api.fetchEducation(userId),
  })
}

export function useCertifications() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.certifications(userId),
    queryFn: () => api.fetchCertifications(userId),
  })
}

export function useSkills() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.skills(userId),
    queryFn: () => api.fetchSkills(userId),
  })
}

export function useReferences() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.references(userId),
    queryFn: () => api.fetchReferences(userId),
  })
}

function useInvalidatingMutation<TVars>(
  keys: readonly (readonly unknown[])[],
  fn: (vars: TVars) => Promise<unknown>,
  options?: Pick<UseMutationOptions<unknown, Error, TVars>, 'onSuccess'>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (...args) => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key })
      options?.onSuccess?.(...args)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Something went wrong saving your change.')
    },
  })
}

export function useUpdateProfile() {
  const userId = useUserId()
  return useInvalidatingMutation(
    [profileKeys.profile(userId)],
    (patch: TablesUpdate<'profiles'>) => api.updateProfile(userId, patch),
    { onSuccess: () => toast.success('Profile saved') },
  )
}

export function useUpdateVisibility() {
  const userId = useUserId()
  return useInvalidatingMutation(
    [profileKeys.visibility(userId)],
    (patch: TablesUpdate<'profile_visibility_settings'>) =>
      api.updateVisibility(userId, patch),
    { onSuccess: () => toast.success('Visibility defaults saved') },
  )
}

type EntityTable =
  | 'experiences'
  | 'experience_bullets'
  | 'education'
  | 'certifications'
  | 'skills'
  | 'references'

const tableKeys: Record<EntityTable, keyof typeof profileKeys> = {
  experiences: 'experiences',
  experience_bullets: 'experiences',
  education: 'education',
  certifications: 'certifications',
  skills: 'skills',
  references: 'references',
}

export function useEntityMutations<T extends EntityTable>(table: T) {
  const userId = useUserId()
  const key = profileKeys[tableKeys[table]](userId)

  const insert = useInvalidatingMutation([key], (row: TablesInsert<T>) =>
    api.insertRow(table, { ...row, user_id: userId }),
  )
  const update = useInvalidatingMutation(
    [key],
    ({ id, patch }: { id: string; patch: TablesUpdate<T> }) =>
      api.updateRow(table, id, patch),
  )
  const remove = useInvalidatingMutation([key], (id: string) =>
    api.deleteRow(table, id),
  )
  const swap = useInvalidatingMutation(
    [key],
    (pair: {
      a: { id: string; display_order: number }
      b: { id: string; display_order: number }
    }) => api.swapOrder(table, pair.a, pair.b),
  )
  return { insert, update, remove, swap }
}
