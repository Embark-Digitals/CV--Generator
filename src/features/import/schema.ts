import { z } from 'zod'

/**
 * Structured candidate profile returned by the extract-profile Edge
 * Function. Everything is optional — extraction is best-effort and the user
 * verifies each record before it enters the Master Career Profile.
 */
export const candidateProfileSchema = z.object({
  personal: z
    .object({
      full_name: z.string().nullish(),
      first_name: z.string().nullish(),
      last_name: z.string().nullish(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
      address_line: z.string().nullish(),
      city: z.string().nullish(),
      region: z.string().nullish(),
      postal_code: z.string().nullish(),
      country: z.string().nullish(),
      date_of_birth: z.string().nullish(),
      gender: z.string().nullish(),
      nationality: z.string().nullish(),
      drivers_licence: z.string().nullish(),
    })
    .nullish(),
  headline: z.string().nullish(),
  professional_summary: z.string().nullish(),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        location: z.string().nullish(),
        employment_type: z.string().nullish(),
        start_date: z.string().nullish(),
        end_date: z.string().nullish(),
        is_current: z.boolean().nullish(),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        qualification: z.string(),
        field_of_study: z.string().nullish(),
        start_date: z.string().nullish(),
        end_date: z.string().nullish(),
        grade: z.string().nullish(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().nullish(),
        issue_date: z.string().nullish(),
        expiry_date: z.string().nullish(),
      }),
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  systems: z.array(z.string()).default([]),
  references: z
    .array(
      z.object({
        name: z.string(),
        relationship: z.string().nullish(),
        company: z.string().nullish(),
        email: z.string().nullish(),
        phone: z.string().nullish(),
      }),
    )
    .default([]),
})

export type CandidateProfile = z.infer<typeof candidateProfileSchema>
