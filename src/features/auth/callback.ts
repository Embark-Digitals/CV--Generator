// Detection and routing logic for Supabase auth callbacks (invite, recovery,
// email confirmation, magic link). Pure and framework-free so it is unit
// tested directly and reused by the callback route.

export interface AuthCallbackInfo {
  /** invite | recovery | signup | magiclink | email_change | null */
  type: string | null
  errorCode: string | null
  errorDescription: string | null
  /** PKCE flow: ?code=... present */
  hasCode: boolean
  /** Implicit flow: #access_token=... present */
  hasToken: boolean
  /** True when the URL carries any auth-callback signal. */
  isCallback: boolean
}

function pick(a: URLSearchParams, b: URLSearchParams, key: string): string | null {
  return a.get(key) ?? b.get(key)
}

/** Parse an auth callback out of the URL hash and/or query string. */
export function parseAuthCallback(hash: string, search: string): AuthCallbackInfo {
  const h = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const type = pick(h, q, 'type')
  const errorCode = pick(h, q, 'error_code') ?? pick(h, q, 'error')
  const errorDescription = pick(h, q, 'error_description')
  const hasCode = q.has('code')
  const hasToken = h.has('access_token')
  const isCallback = Boolean(type || errorCode || hasCode || hasToken)
  return { type, errorCode, errorDescription, hasCode, hasToken, isCallback }
}

export type CallbackKind = 'set-password' | 'app' | 'error'

/**
 * Decide where a resolved callback should send the user. Call only once the
 * auth session state is settled (not mid-load).
 */
export function resolveCallbackKind(
  info: AuthCallbackInfo,
  hasSession: boolean,
): CallbackKind {
  if (info.errorCode) return 'error'
  if (!hasSession) return 'error'
  // Invited and recovering users must establish a password before entering.
  if (info.type === 'invite' || info.type === 'recovery') return 'set-password'
  return 'app'
}

export const AUTH_CALLBACK_PATH = '/auth/callback'
export const SET_PASSWORD_PATH = '/set-password'
export const SIGN_IN_PATH = '/sign-in'
export const FORGOT_PASSWORD_PATH = '/forgot-password'

const AUTH_PATHS = [
  AUTH_CALLBACK_PATH,
  SET_PASSWORD_PATH,
  '/reset-password',
  SIGN_IN_PATH,
  FORGOT_PASSWORD_PATH,
]

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

// Captured once, synchronously, at module load — before the Supabase client's
// asynchronous detectSessionInUrl clears the hash from the URL.
export const initialAuthCallback: AuthCallbackInfo =
  typeof window !== 'undefined'
    ? parseAuthCallback(window.location.hash, window.location.search)
    : parseAuthCallback('', '')

let consumed = false

/**
 * True when the app loaded on a non-auth path already carrying a callback
 * (e.g. an invite that redirected to the Site URL root) and should be routed
 * to the callback handler once.
 */
export function shouldRouteToCallback(pathname: string): boolean {
  return !consumed && initialAuthCallback.isCallback && !isAuthPath(pathname)
}

export function markCallbackConsumed(): void {
  consumed = true
}
