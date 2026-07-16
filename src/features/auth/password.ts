import { z } from 'zod'

// Matches the Supabase project's minimum_password_length (config.toml).
export const MIN_PASSWORD_LENGTH = 10

export const passwordRequirements = [
  { key: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters` },
  { key: 'match', label: 'Both passwords match' },
] as const

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

export type PasswordFormValues = z.infer<typeof passwordSchema>

export interface PasswordChecks {
  length: boolean
  match: boolean
}

/** Live requirement checks for the set-password UI. Never logs the value. */
export function checkPassword(password: string, confirm: string): PasswordChecks {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    match: password.length > 0 && password === confirm,
  }
}
