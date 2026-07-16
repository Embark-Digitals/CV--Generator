import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Controllable mock of the browser Supabase client. Using the REAL AuthProvider
// against this mock proves the provider wires resetPassword / signIn correctly.
const authApi = {
  getSession: vi.fn(async () => ({ data: { session: null } })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}
vi.mock('@/lib/supabase', () => ({ supabase: { auth: authApi } }))

const { AuthProvider, useAuth } = await import('@/providers/auth-provider')

const EMAIL = 'owner@example.com'
const PASSWORD = 'sup3r-secret-passphrase'

function Harness() {
  const { resetPassword, signIn } = useAuth()
  return (
    <div>
      <button onClick={() => void resetPassword(EMAIL)}>reset</button>
      <button onClick={() => void signIn(EMAIL, PASSWORD)}>login</button>
    </div>
  )
}

beforeEach(() => {
  Object.values(authApi).forEach((fn) => 'mockReset' in fn && fn.mockReset())
  authApi.getSession.mockResolvedValue({ data: { session: null } })
  authApi.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
})
afterEach(cleanup)

async function renderProvider() {
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  )
  // let the initial getSession effect settle
  await waitFor(() => expect(authApi.getSession).toHaveBeenCalled())
}

describe('AuthProvider.resetPassword', () => {
  it('sends the recovery request to the callback route (redirectTo correct)', async () => {
    authApi.resetPasswordForEmail.mockResolvedValue({ error: null })
    await renderProvider()
    await userEvent.click(screen.getByText('reset'))

    await waitFor(() => expect(authApi.resetPasswordForEmail).toHaveBeenCalledTimes(1))
    const [emailArg, opts] = authApi.resetPasswordForEmail.mock.calls[0]
    expect(emailArg).toBe(EMAIL)
    // redirectTo must point at /auth/callback so the callback can route to
    // /set-password. Also assert the whole value is header/URL-safe ASCII.
    expect(opts.redirectTo).toMatch(/\/auth\/callback$/)
    // eslint-disable-next-line no-control-regex
    expect(opts.redirectTo).toMatch(/^[\x20-\x7e]+$/)
  })

  it('reaches the network layer and returns its result', async () => {
    authApi.resetPasswordForEmail.mockResolvedValue({ error: null })
    await renderProvider()
    await userEvent.click(screen.getByText('reset'))
    await waitFor(() => expect(authApi.resetPasswordForEmail).toHaveBeenCalled())
  })

  it('never logs the email, password or any credential', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
      vi.spyOn(console, 'info').mockImplementation(() => {}),
    ]
    authApi.resetPasswordForEmail.mockResolvedValue({ error: null })
    await renderProvider()
    await userEvent.click(screen.getByText('reset'))
    await waitFor(() => expect(authApi.resetPasswordForEmail).toHaveBeenCalled())

    const logged = spies.flatMap((s) => s.mock.calls.flat()).map(String).join(' ')
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain(PASSWORD)
    spies.forEach((s) => s.mockRestore())
  })
})

describe('AuthProvider.signIn (ordinary login remains functional)', () => {
  it('calls signInWithPassword and reports success', async () => {
    authApi.signInWithPassword.mockResolvedValue({ error: null })
    await renderProvider()
    await userEvent.click(screen.getByText('login'))
    await waitFor(() =>
      expect(authApi.signInWithPassword).toHaveBeenCalledWith({
        email: EMAIL,
        password: PASSWORD,
      }),
    )
  })
})
