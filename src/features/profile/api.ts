import { supabase } from '@/lib/supabase'
import type {
  Certification,
  Education,
  ExperienceWithBullets,
  Profile,
  ProfileUpdate,
  Reference,
  Skill,
  VisibilitySettings,
  VisibilityUpdate,
} from '@/types/domain'
import type { TablesInsert, TablesUpdate } from '@/types/database'

function throwOnError<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

// --- profile ---------------------------------------------------------------

export async function fetchProfile(userId: string): Promise<Profile> {
  return throwOnError(
    await supabase.from('profiles').select('*').eq('id', userId).single(),
  )
}

export async function updateProfile(userId: string, patch: ProfileUpdate) {
  return throwOnError(
    await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single(),
  )
}

// --- visibility ------------------------------------------------------------

export async function fetchVisibility(
  userId: string,
): Promise<VisibilitySettings> {
  return throwOnError(
    await supabase
      .from('profile_visibility_settings')
      .select('*')
      .eq('user_id', userId)
      .single(),
  )
}

export async function updateVisibility(
  userId: string,
  patch: VisibilityUpdate,
) {
  return throwOnError(
    await supabase
      .from('profile_visibility_settings')
      .update(patch)
      .eq('user_id', userId)
      .select()
      .single(),
  )
}

// --- experiences (with bullets) ---------------------------------------------

export async function fetchExperiences(
  userId: string,
): Promise<ExperienceWithBullets[]> {
  return throwOnError(
    await supabase
      .from('experiences')
      .select('*, experience_bullets(*)')
      .eq('user_id', userId)
      .order('display_order')
      .order('display_order', { referencedTable: 'experience_bullets' }),
  )
}

// --- generic list entities ---------------------------------------------------

type ListTable =
  | 'experiences'
  | 'experience_bullets'
  | 'education'
  | 'certifications'
  | 'skills'
  | 'references'

export async function insertRow<T extends ListTable>(
  table: T,
  row: TablesInsert<T>,
) {
  return throwOnError(
    // @ts-expect-error — generic table union narrows per call site
    await supabase.from(table).insert(row).select().single(),
  )
}

export async function updateRow<T extends ListTable>(
  table: T,
  id: string,
  patch: TablesUpdate<T>,
) {
  return throwOnError(
    // @ts-expect-error — generic table union narrows per call site
    await supabase.from(table).update(patch).eq('id', id).select().single(),
  )
}

export async function deleteRow(table: ListTable, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchList<T>(
  table: Exclude<ListTable, 'experiences' | 'experience_bullets'>,
  userId: string,
): Promise<T[]> {
  return throwOnError(
    await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('display_order'),
  ) as T[]
}

export const fetchEducation = (userId: string) =>
  fetchList<Education>('education', userId)
export const fetchCertifications = (userId: string) =>
  fetchList<Certification>('certifications', userId)
export const fetchSkills = (userId: string) => fetchList<Skill>('skills', userId)
export const fetchReferences = (userId: string) =>
  fetchList<Reference>('references', userId)

/** Swap display_order between two adjacent records for reordering. */
export async function swapOrder(
  table: ListTable,
  a: { id: string; display_order: number },
  b: { id: string; display_order: number },
) {
  // Two updates; RLS scopes both to the owner.
  await updateRow(table, a.id, {
    display_order: b.display_order,
  } as TablesUpdate<typeof table>)
  await updateRow(table, b.id, {
    display_order: a.display_order,
  } as TablesUpdate<typeof table>)
}
