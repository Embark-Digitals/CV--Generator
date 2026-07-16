import { describe, expect, it } from 'vitest'
import {
  isAuthPath,
  parseAuthCallback,
  resolveCallbackKind,
} from '@/features/auth/callback'
import { checkPassword, passwordSchema, MIN_PASSWORD_LENGTH } from '@/features/auth/password'
import {
  categorizeAuthError,
  recoveryRequestMessage,
  safeAuthLog,
  setPasswordMessage,
} from '@/features/auth/errors'

describe('parseAuthCallback', () => {
  it('detects an implicit invite callback in the hash', () => {
    const info = parseAuthCallback(
      '#access_token=abc&refresh_token=def&type=invite',
      '',
    )
    expect(info.type).toBe('invite')
    expect(info.hasToken).toBe(true)
    expect(info.isCallback).toBe(true)
  })

  it('detects a recovery callback', () => {
    const info = parseAuthCallback('#access_token=abc&type=recovery', '')
    expect(info.type).toBe('recovery')
    expect(info.isCallback).toBe(true)
  })

  it('detects a PKCE code callback in the query string', () => {
    const info = parseAuthCallback('', '?code=xyz')
    expect(info.hasCode).toBe(true)
    expect(info.isCallback).toBe(true)
  })

  it('detects an error callback (expired link)', () => {
    const info = parseAuthCallback(
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      '',
    )
    expect(info.errorCode).toBe('otp_expired')
    expect(info.errorDescription).toContain('expired')
    expect(info.isCallback).toBe(true)
  })

  it('returns not-a-callback for a plain URL', () => {
    const info = parseAuthCallback('', '')
    expect(info.isCallback).toBe(false)
    expect(info.type).toBeNull()
  })
})

describe('resolveCallbackKind', () => {
  it('routes invited users to set-password', () => {
    expect(
      resolveCallbackKind(parseAuthCallback('#type=invite', ''), true),
    ).toBe('set-password')
  })
  it('routes recovering users to set-password', () => {
    expect(
      resolveCallbackKind(parseAuthCallback('#type=recovery', ''), true),
    ).toBe('set-password')
  })
  it('routes confirmed signups into the app', () => {
    expect(
      resolveCallbackKind(parseAuthCallback('#type=signup', ''), true),
    ).toBe('app')
  })
  it('returns error when the link carries an error', () => {
    expect(
      resolveCallbackKind(parseAuthCallback('#error_code=otp_expired', ''), false),
    ).toBe('error')
  })
  it('returns error when no session could be established', () => {
    expect(
      resolveCallbackKind(parseAuthCallback('#type=invite', ''), false),
    ).toBe('error')
  })
})

describe('isAuthPath', () => {
  it('recognises auth routes', () => {
    expect(isAuthPath('/auth/callback')).toBe(true)
    expect(isAuthPath('/set-password')).toBe(true)
    expect(isAuthPath('/sign-in')).toBe(true)
    expect(isAuthPath('/forgot-password')).toBe(true)
  })
  it('rejects app routes', () => {
    expect(isAuthPath('/dashboard')).toBe(false)
    expect(isAuthPath('/')).toBe(false)
  })
})

describe('password rules', () => {
  it('requires at least the minimum length', () => {
    expect(checkPassword('short', 'short').length).toBe(false)
    expect(checkPassword('x'.repeat(MIN_PASSWORD_LENGTH), 'x'.repeat(MIN_PASSWORD_LENGTH)).length).toBe(true)
  })
  it('checks that both fields match', () => {
    expect(checkPassword('abcdefghij', 'abcdefghij').match).toBe(true)
    expect(checkPassword('abcdefghij', 'different00').match).toBe(false)
    expect(checkPassword('', '').match).toBe(false)
  })
  it('schema rejects short passwords', () => {
    const r = passwordSchema.safeParse({ password: 'short', confirm: 'short' })
    expect(r.success).toBe(false)
  })
  it('schema rejects mismatched passwords', () => {
    const r = passwordSchema.safeParse({ password: 'abcdefghij', confirm: 'zzzzzzzzzz' })
    expect(r.success).toBe(false)
  })
  it('schema accepts a valid matching password', () => {
    const r = passwordSchema.safeParse({ password: 'abcdefghij0', confirm: 'abcdefghij0' })
    expect(r.success).toBe(true)
  })
})

describe('auth error categorization', () => {
  it('classifies 429 as rate_limited', () => {
    expect(categorizeAuthError({ status: 429, code: 'over_email_send_rate_limit', message: 'rate limit' })).toBe('rate_limited')
  })
  it('classifies expired links', () => {
    expect(categorizeAuthError({ status: 401, code: 'otp_expired', message: 'Token has expired' })).toBe('expired')
  })
  it('classifies invalid tokens', () => {
    expect(categorizeAuthError({ status: 401, code: 'validation_failed', message: 'Invalid token' })).toBe('invalid')
  })
  it('classifies server/send failures', () => {
    expect(categorizeAuthError({ status: 500, message: 'Error sending recovery email' })).toBe('send_failed')
  })
  it('never puts email/token into the safe log payload', () => {
    const payload = safeAuthLog('forgot-password', { status: 429, code: 'over_email_send_rate_limit', message: 'user@example.com rate limited' })
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('user@example.com')
    expect(payload.status).toBe(429)
    expect(payload.category).toBe('rate_limited')
  })
  it('gives distinct, non-revealing recovery messages', () => {
    expect(recoveryRequestMessage('rate_limited')).toMatch(/too many/i)
    expect(recoveryRequestMessage('send_failed')).toMatch(/could not send/i)
    // messages never claim an account does or does not exist
    for (const c of ['rate_limited', 'send_failed', 'unknown'] as const) {
      expect(recoveryRequestMessage(c).toLowerCase()).not.toContain('no account')
    }
  })
  it('gives set-password messages for expired/invalid links', () => {
    expect(setPasswordMessage('expired')).toMatch(/no longer valid/i)
    expect(setPasswordMessage('invalid')).toMatch(/no longer valid/i)
  })
})
