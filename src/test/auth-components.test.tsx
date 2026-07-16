import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { AuthError } from '@supabase/supabase-js'

// Controllable mock of the auth provider used by all auth components.
const mockAuth = {
  session: null as unknown,
  user: null as unknown,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
}

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Import AFTER the mock is registered.
const { ProtectedRoute } = await import('@/components/auth/protected-route')
const { SetPasswordPage } = await import('@/pages/auth/set-password')
const { ForgotPasswordPage } = await import('@/pages/auth/forgot-password')

beforeEach(() => {
  mockAuth.session = null
  mockAuth.user = null
  mockAuth.loading = false
  mockAuth.signIn.mockReset()
  mockAuth.signOut.mockReset()
  mockAuth.resetPassword.mockReset()
  mockAuth.updatePassword.mockReset()
})
afterEach(cleanup)

function renderAt(ui: React.ReactNode, initial = '/') {
  return render(<MemoryRouter initialEntries={[initial]}>{ui}</MemoryRouter>)
}

describe('ProtectedRoute (route guard)', () => {
  const tree = (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<div>PROTECTED CONTENT</div>} />
      </Route>
      <Route path="/sign-in" element={<div>SIGN IN SCREEN</div>} />
    </Routes>
  )

  it('redirects unauthenticated users to sign-in', () => {
    mockAuth.session = null
    renderAt(tree, '/dashboard')
    expect(screen.getByText('SIGN IN SCREEN')).toBeInTheDocument()
  })

  it('shows a loading state while the session resolves', () => {
    mockAuth.loading = true
    renderAt(tree, '/dashboard')
    expect(screen.queryByText('PROTECTED CONTENT')).not.toBeInTheDocument()
    expect(screen.queryByText('SIGN IN SCREEN')).not.toBeInTheDocument()
  })

  it('renders protected content for an authenticated user', () => {
    mockAuth.session = { user: { id: 'u1' } }
    renderAt(tree, '/dashboard')
    expect(screen.getByText('PROTECTED CONTENT')).toBeInTheDocument()
  })
})

describe('SetPasswordPage', () => {
  it('shows an expired-link message when there is no session', () => {
    mockAuth.session = null
    renderAt(<SetPasswordPage />, '/set-password')
    expect(screen.getByText(/link expired/i)).toBeInTheDocument()
    expect(screen.getByText(/request a new link/i)).toBeInTheDocument()
  })

  it('rejects a password shorter than 10 characters', async () => {
    mockAuth.session = { user: { id: 'u1' } }
    renderAt(<SetPasswordPage />, '/set-password')
    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: /set password/i }))
    // "Use at least 10 characters" is the validation error (distinct from the
    // "At least 10 characters" requirements-checklist label).
    expect(await screen.findByText(/use at least 10 characters/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    mockAuth.session = { user: { id: 'u1' } }
    renderAt(<SetPasswordPage />, '/set-password')
    await userEvent.type(screen.getByLabelText('New password'), 'abcdefghij0')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'DIFFERENT000')
    await userEvent.click(screen.getByRole('button', { name: /set password/i }))
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).not.toHaveBeenCalled()
  })

  it('accepts a valid password and shows success', async () => {
    mockAuth.session = { user: { id: 'u1' } }
    mockAuth.updatePassword.mockResolvedValue({ error: null })
    renderAt(<SetPasswordPage />, '/set-password')
    await userEvent.type(screen.getByLabelText('New password'), 'abcdefghij0')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'abcdefghij0')
    await userEvent.click(screen.getByRole('button', { name: /set password/i }))
    await waitFor(() =>
      expect(mockAuth.updatePassword).toHaveBeenCalledWith('abcdefghij0'),
    )
    expect(await screen.findByText(/password set/i)).toBeInTheDocument()
  })

  it('surfaces a safe error when the update fails', async () => {
    mockAuth.session = { user: { id: 'u1' } }
    mockAuth.updatePassword.mockResolvedValue({
      error: { status: 401, code: 'otp_expired', message: 'expired' } as AuthError,
    })
    renderAt(<SetPasswordPage />, '/set-password')
    await userEvent.type(screen.getByLabelText('New password'), 'abcdefghij0')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'abcdefghij0')
    await userEvent.click(screen.getByRole('button', { name: /set password/i }))
    expect(await screen.findByText(/no longer valid/i)).toBeInTheDocument()
  })
})

describe('ForgotPasswordPage', () => {
  it('rejects an invalid email', async () => {
    renderAt(<ForgotPasswordPage />, '/forgot-password')
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /send recovery/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(mockAuth.resetPassword).not.toHaveBeenCalled()
  })

  it('shows a generic success message that never reveals account existence', async () => {
    mockAuth.resetPassword.mockResolvedValue({ error: null })
    renderAt(<ForgotPasswordPage />, '/forgot-password')
    await userEvent.type(screen.getByLabelText('Email'), 'someone@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send recovery/i }))
    expect(await screen.findByText(/if that address has an account/i)).toBeInTheDocument()
  })

  it('shows a distinct wait message on rate limit (not the same generic error)', async () => {
    mockAuth.resetPassword.mockResolvedValue({
      error: { status: 429, code: 'over_email_send_rate_limit', message: 'rate limit' } as AuthError,
    })
    renderAt(<ForgotPasswordPage />, '/forgot-password')
    await userEvent.type(screen.getByLabelText('Email'), 'someone@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send recovery/i }))
    expect(await screen.findByText(/too many times/i)).toBeInTheDocument()
  })
})
