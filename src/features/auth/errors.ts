// Safe categorization of Supabase auth errors. Produces user-facing messages
// that never reveal whether an email exists, and log payloads that never
// contain the email, token or password — only a category, status and code.

export interface MinimalAuthError {
  status?: number
  code?: string | null
  message?: string
}

export type AuthErrorCategory =
  | 'rate_limited'
  | 'expired'
  | 'invalid'
  | 'send_failed'
  | 'unknown'

export function categorizeAuthError(
  error: MinimalAuthError | null | undefined,
): AuthErrorCategory {
  if (!error) return 'unknown'
  const status = error.status
  const code = (error.code ?? '').toLowerCase()
  const msg = (error.message ?? '').toLowerCase()

  if (
    status === 429 ||
    code.includes('over_') ||
    code.includes('rate') ||
    msg.includes('rate limit') ||
    msg.includes('too many') ||
    msg.includes('seconds')
  ) {
    return 'rate_limited'
  }
  if (code.includes('expired') || msg.includes('expired')) return 'expired'
  if (
    code.includes('otp') ||
    code.includes('invalid') ||
    msg.includes('invalid') ||
    msg.includes('token')
  ) {
    return 'invalid'
  }
  if (
    (status && status >= 500) ||
    msg.includes('smtp') ||
    (msg.includes('email') && msg.includes('send'))
  ) {
    return 'send_failed'
  }
  return 'unknown'
}

/** Message for the Forgot Password page. Never reveals account existence. */
export function recoveryRequestMessage(category: AuthErrorCategory): string {
  switch (category) {
    case 'rate_limited':
      return 'You have requested this too many times. Please wait a few minutes and try again.'
    case 'send_failed':
      return 'We could not send the recovery email right now. Please try again later.'
    default:
      return 'We could not process that request right now. Please try again later.'
  }
}

/** Message for the Set Password page when updating the password fails. */
export function setPasswordMessage(category: AuthErrorCategory): string {
  switch (category) {
    case 'expired':
    case 'invalid':
      return 'This link is no longer valid. Request a new link and try again.'
    case 'rate_limited':
      return 'Too many attempts. Please wait a few minutes and try again.'
    default:
      return 'We could not set your password. Please try again.'
  }
}

/** Structured, safe log payload — contains no email, token or password. */
export function safeAuthLog(
  context: string,
  error: MinimalAuthError | null | undefined,
): { context: string; category: AuthErrorCategory; status: number | null; code: string | null } {
  return {
    context,
    category: categorizeAuthError(error),
    status: error?.status ?? null,
    code: error?.code ?? null,
  }
}
