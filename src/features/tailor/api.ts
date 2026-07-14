import { supabase } from '@/lib/supabase'
import type { AiSuggestion, TailoredCv } from '@/types/domain'
import type { Json, TablesUpdate } from '@/types/database'
import {
  buildCvDocument,
  cvDocumentSchema,
  type CvDocument,
} from './document'
import * as profileApi from '@/features/profile/api'

function throwOnError<T>(result: {
  data: T | null
  error: { message: string } | null
}): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

export async function fetchTailoredCvs(
  applicationId: string,
): Promise<TailoredCv[]> {
  return throwOnError(
    await supabase
      .from('tailored_cvs')
      .select('*')
      .eq('job_application_id', applicationId)
      .order('created_at', { ascending: false }),
  )
}

export async function fetchTailoredCv(id: string): Promise<TailoredCv> {
  return throwOnError(
    await supabase.from('tailored_cvs').select('*').eq('id', id).single(),
  )
}

/** Parse the stored document JSON, failing loudly if it is malformed. */
export function parseDocument(cv: TailoredCv): CvDocument {
  const parsed = cvDocumentSchema.safeParse(cv.document)
  if (!parsed.success) {
    throw new Error(
      'This tailored CV has an unreadable document. Create a new tailored CV.',
    )
  }
  return parsed.data
}

/**
 * Create a tailored CV for an application: snapshot the verified Master
 * Career Profile into a fresh CvDocument.
 */
export async function createTailoredCv(
  userId: string,
  applicationId: string,
  title: string,
): Promise<TailoredCv> {
  const [profile, visibility, experiences, education, certifications, skills, references] =
    await Promise.all([
      profileApi.fetchProfile(userId),
      profileApi.fetchVisibility(userId),
      profileApi.fetchExperiences(userId),
      profileApi.fetchEducation(userId),
      profileApi.fetchCertifications(userId),
      profileApi.fetchSkills(userId),
      profileApi.fetchReferences(userId),
    ])
  const document = buildCvDocument({
    profile,
    visibility,
    experiences,
    education,
    certifications,
    skills,
    references,
  })
  if (document.experiences.length === 0 && !document.summary) {
    throw new Error(
      'Your Master Career Profile has no verified content yet. Verify your profile before tailoring.',
    )
  }
  return throwOnError(
    await supabase
      .from('tailored_cvs')
      .insert({
        user_id: userId,
        job_application_id: applicationId,
        title,
        document: document as unknown as Json,
      })
      .select()
      .single(),
  )
}

export async function updateTailoredCv(
  id: string,
  patch: TablesUpdate<'tailored_cvs'>,
): Promise<TailoredCv> {
  return throwOnError(
    await supabase
      .from('tailored_cvs')
      .update(patch)
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function saveDocument(
  id: string,
  document: CvDocument,
): Promise<TailoredCv> {
  return updateTailoredCv(id, { document: document as unknown as Json })
}

export async function deleteTailoredCv(id: string) {
  const { error } = await supabase.from('tailored_cvs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- suggestions ------------------------------------------------------------

export async function fetchSuggestions(
  tailoredCvId: string,
): Promise<AiSuggestion[]> {
  return throwOnError(
    await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('tailored_cv_id', tailoredCvId)
      .order('created_at', { ascending: false }),
  )
}

export async function updateSuggestion(
  id: string,
  patch: TablesUpdate<'ai_suggestions'>,
): Promise<AiSuggestion> {
  return throwOnError(
    await supabase
      .from('ai_suggestions')
      .update(patch)
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function generateSuggestions(
  tailoredCvId: string,
): Promise<{ stored: number; blocked: number }> {
  const { data, error } = await supabase.functions.invoke('suggest-changes', {
    body: { tailored_cv_id: tailoredCvId },
  })
  if (error) {
    let message = 'Suggestion generation is unavailable right now.'
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) message = body.error
    } catch {
      // keep default
    }
    throw new Error(message)
  }
  return { stored: data?.stored ?? 0, blocked: data?.blocked ?? 0 }
}

export async function askAssistant(
  tailoredCvId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<{ reply: string; pendingSuggestions: number }> {
  const { data, error } = await supabase.functions.invoke('assistant', {
    body: { tailored_cv_id: tailoredCvId, message, history },
  })
  if (error) {
    let msg = 'The assistant is unavailable right now.'
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) msg = body.error
    } catch {
      // keep default
    }
    throw new Error(msg)
  }
  return {
    reply: data?.reply ?? '',
    pendingSuggestions: data?.pending_suggestions ?? 0,
  }
}
