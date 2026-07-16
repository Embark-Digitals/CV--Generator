// Shared request context for CV Machine Edge Functions.
// Every function: validates the caller's JWT, then acts through a
// user-scoped Supabase client so Row Level Security applies to ALL database
// access inside functions as well.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface RequestContext {
  userId: string
  /** User-scoped client — RLS enforced. */
  db: SupabaseClient
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function corsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  return null
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Validate the JWT and build a user-scoped (RLS-enforced) client. */
export async function requireUser(req: Request): Promise<RequestContext> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing authorization')
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const db = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data, error } = await db.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (error || !data.user) {
    throw new HttpError(401, 'Invalid or expired session')
  }
  return { userId: data.user.id, db }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type AiRunKind =
  | 'profile_extraction'
  | 'job_extraction'
  | 'alignment'
  | 'suggestion'
  | 'assistant'

/**
 * Safe usage logging: hashes, token counts and status only — never raw
 * prompt or response content.
 */
type AiRunStatus = 'pending' | 'success' | 'error' | 'timeout' | 'rate_limited'

/**
 * Map an internal provider error code to a valid ai_run_status enum value.
 * The precise category (e.g. 'truncated', 'quota', 'invalid_response') is
 * preserved separately in the error_code column — only 'timeout' and
 * 'rate_limited' have their own enum status; everything else is 'error'.
 */
export function enumStatusFor(code: string): AiRunStatus {
  return code === 'timeout' || code === 'rate_limited' ? code : 'error'
}

export async function logAiRun(
  ctx: RequestContext,
  entry: {
    kind: AiRunKind
    model: string
    status: AiRunStatus
    inputHash?: string
    promptTokens?: number
    completionTokens?: number
    durationMs?: number
    errorCode?: string
  },
): Promise<string | null> {
  const { data } = await ctx.db
    .from('ai_runs')
    .insert({
      user_id: ctx.userId,
      kind: entry.kind,
      model: entry.model,
      status: entry.status,
      input_hash: entry.inputHash ?? null,
      prompt_tokens: entry.promptTokens ?? null,
      completion_tokens: entry.completionTokens ?? null,
      duration_ms: entry.durationMs ?? null,
      error_code: entry.errorCode ?? null,
    })
    .select('id')
    .single()
  return data?.id ?? null
}

/** Move a previously-inserted ai_run to a terminal state. */
export async function updateAiRun(
  ctx: RequestContext,
  id: string,
  entry: {
    status: AiRunStatus
    promptTokens?: number
    completionTokens?: number
    durationMs?: number
    errorCode?: string
  },
): Promise<void> {
  await ctx.db
    .from('ai_runs')
    .update({
      status: entry.status,
      prompt_tokens: entry.promptTokens ?? null,
      completion_tokens: entry.completionTokens ?? null,
      duration_ms: entry.durationMs ?? null,
      error_code: entry.errorCode ?? null,
    })
    .eq('id', id)
}

/**
 * True if an equivalent AI run for the same input is already in flight (a
 * 'pending' row created very recently). Used to reject duplicate submissions
 * (e.g. an impatient retry click) before spending another provider call.
 */
export async function hasPendingRun(
  ctx: RequestContext,
  kind: AiRunKind,
  inputHash: string,
  withinMs = 120_000,
): Promise<boolean> {
  const since = new Date(Date.now() - withinMs).toISOString()
  const { data } = await ctx.db
    .from('ai_runs')
    .select('id')
    .eq('kind', kind)
    .eq('input_hash', inputHash)
    .eq('status', 'pending')
    .gte('created_at', since)
    .limit(1)
  return !!(data && data.length)
}

/** Wrap a handler with CORS, auth and consistent error responses. */
export function serveWithContext(
  handler: (req: Request, ctx: RequestContext) => Promise<Response>,
) {
  Deno.serve(async (req) => {
    const preflight = corsPreflight(req)
    if (preflight) return preflight
    try {
      const ctx = await requireUser(req)
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message }, err.status)
      }
      console.error('Unhandled function error:', err instanceof Error ? err.message : 'unknown')
      return json({ error: 'Internal error' }, 500)
    }
  })
}
