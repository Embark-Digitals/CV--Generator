import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  checkPassword,
  passwordRequirements,
  passwordSchema,
  type PasswordFormValues,
} from '@/features/auth/password'
import {
  categorizeAuthError,
  safeAuthLog,
  setPasswordMessage,
} from '@/features/auth/errors'
import { initialAuthCallback } from '@/features/auth/callback'

type Status = 'idle' | 'saving' | 'success'

export function SetPasswordPage() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('idle')
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) })

  const password = watch('password') ?? ''
  const confirm = watch('confirm') ?? ''
  const checks = checkPassword(password, confirm)

  if (loading) {
    return (
      <main
        className="bg-background flex min-h-screen items-center justify-center p-4"
        role="status"
        aria-live="polite"
      >
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }

  // A valid invite/recovery session is required to set a password.
  if (!session) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Link expired</CardTitle>
            <CardDescription>
              Your invitation or recovery link is no longer valid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
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

  const isInvite = initialAuthCallback.type === 'invite'

  const onSubmit = async (values: PasswordFormValues) => {
    setServerError(null)
    setStatus('saving')
    const { error } = await updatePassword(values.password)
    if (error) {
      // Log only a safe category/status/code — never the password.
      console.warn('set_password_failed', safeAuthLog('set-password', error))
      setServerError(setPasswordMessage(categorizeAuthError(error)))
      setStatus('idle')
      return
    }
    setStatus('success')
    // Session already carries the updated credentials; enter the app.
    setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
  }

  if (status === 'success') {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="bg-success/15 text-success mx-auto flex h-10 w-10 items-center justify-center rounded-full">
              <Check aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Password set</CardTitle>
            <CardDescription>
              Taking you into CV Machine…
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isInvite ? 'Create your password' : 'Set a new password'}
          </CardTitle>
          <CardDescription>
            {isInvite
              ? 'Welcome to CV Machine. Choose a password to finish setting up your account.'
              : 'Choose a strong password for your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                {...register('confirm')}
              />
              {errors.confirm && (
                <p className="text-destructive text-xs" role="alert">
                  {errors.confirm.message}
                </p>
              )}
            </div>

            <ul className="space-y-1" aria-label="Password requirements">
              {passwordRequirements.map((req) => {
                const met = checks[req.key as keyof typeof checks]
                return (
                  <li
                    key={req.key}
                    className={
                      met
                        ? 'text-success flex items-center gap-1.5 text-xs'
                        : 'text-muted-foreground flex items-center gap-1.5 text-xs'
                    }
                  >
                    {met ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {req.label}
                  </li>
                )
              })}
            </ul>

            {serverError && (
              <p className="text-destructive text-sm" role="alert">
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={status === 'saving'}
            >
              {status === 'saving' ? 'Setting password…' : 'Set password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
