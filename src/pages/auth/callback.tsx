import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/providers/auth-provider'
import {
  initialAuthCallback,
  resolveCallbackKind,
  SET_PASSWORD_PATH,
} from '@/features/auth/callback'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Handles the redirect target for Supabase invite / recovery / confirmation
 * links. It establishes the session (via detectSessionInUrl / PKCE exchange
 * in the client), then routes invited and recovering users to set a password,
 * and everyone else into the app. Expired or invalid links get a clear
 * recovery path without revealing whether any email exists.
 */
export function AuthCallbackPage() {
  const { session, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  // The provider surfaced an explicit error in the link (e.g. expired token).
  const linkError = Boolean(initialAuthCallback.errorCode)

  if (session && !linkError) {
    const kind = resolveCallbackKind(initialAuthCallback, true)
    return (
      <Navigate
        to={kind === 'set-password' ? SET_PASSWORD_PATH : '/dashboard'}
        replace
      />
    )
  }

  const noCredentialInUrl =
    !initialAuthCallback.hasToken && !initialAuthCallback.hasCode
  const failed = linkError || (!loading && (timedOut || noCredentialInUrl))

  if (failed) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">This link isn’t valid</CardTitle>
            <CardDescription>
              Invitation and recovery links expire and can only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              Request a new link and we’ll email it to you if an account
              exists.
            </p>
            <Link
              to="/forgot-password"
              className="bg-primary text-primary-foreground inline-flex h-9 w-full items-center justify-center rounded-md px-4 text-sm font-medium"
            >
              Request a new link
            </Link>
            <Link
              to="/sign-in"
              className="text-primary block text-sm underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main
      className="bg-background flex min-h-screen items-center justify-center p-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-muted-foreground text-sm">Completing sign-in…</p>
    </main>
  )
}
