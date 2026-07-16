import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/providers/auth-provider'
import {
  categorizeAuthError,
  recoveryRequestMessage,
  safeAuthLog,
} from '@/features/auth/errors'
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

const schema = z.object({
  email: z.email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    const { error } = await resetPassword(values.email)
    if (error) {
      const category = categorizeAuthError(error)
      // Safe log: category/status/code only — never the email address.
      console.warn('recovery_request_failed', safeAuthLog('forgot-password', error))
      // Rate limits and delivery failures get distinct, non-revealing copy.
      setServerError(recoveryRequestMessage(category))
      return
    }
    // Generic success — never reveals whether the address has an account.
    setSent(true)
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Password recovery</CardTitle>
          <CardDescription>
            Enter your account email and we will send a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center" role="status">
              <p className="text-sm">
                If that address has an account, a recovery email is on its way.
              </p>
              <Link
                to="/sign-in"
                className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-destructive text-xs" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>
              {serverError && (
                <p className="text-destructive text-sm" role="alert">
                  {serverError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send recovery email'}
              </Button>
              <p className="text-center text-sm">
                <Link
                  to="/sign-in"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
