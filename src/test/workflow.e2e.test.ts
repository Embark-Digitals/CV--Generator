// @vitest-environment node
// End-to-end critical workflow at the API level (live project):
// application -> requirements -> tailored CV -> saved version -> lock ->
// submitted -> application linkage. AI steps are exercised separately
// (they require the OPENAI_API_KEY secret); Truth Lock has its own suite.
import { existsSync, readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sampleDocument } from './fixtures'

const ready = existsSync('.env') && existsSync('private/qa-users.txt')
const describeLive = ready ? describe : describe.skip

describeLive('critical workflow (live)', () => {
  let db: SupabaseClient
  let userId: string
  const created: Array<{ table: string; id: string }> = []

  beforeAll(async () => {
    const env = Object.fromEntries(
      readFileSync('.env', 'utf8')
        .split(/\r?\n/)
        .filter((l) => l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    )
    const [email, password, id] = readFileSync('private/qa-users.txt', 'utf8')
      .trim()
      .split(/\r?\n/)[0]
      .split('\t')
    db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
    const { error } = await db.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    userId = id
  }, 30_000)

  afterAll(async () => {
    // Application delete cascades to everything else (versions archived).
    for (const record of created.reverse()) {
      try {
        await db.from(record.table).delete().eq('id', record.id)
      } catch {
        // best effort
      }
    }
  }, 30_000)

  it('carries an application from creation to a locked submitted version', async () => {
    // 1. Create the application with the full advert preserved.
    const advert = 'We need a bookkeeper. Requirements: reconciliations, Pastel.'
    const { data: app, error: appError } = await db
      .from('job_applications')
      .insert({
        user_id: userId,
        company: 'Workflow Co',
        job_title: 'Bookkeeper',
        advert_text: advert,
        status: 'considering',
      })
      .select()
      .single()
    expect(appError).toBeNull()
    created.push({ table: 'job_applications', id: app!.id })

    // 2. Requirements (as the user would after extraction review).
    const { error: reqError } = await db.from('job_requirements').insert([
      {
        user_id: userId,
        job_application_id: app!.id,
        kind: 'skill',
        priority: 'required',
        description: 'Reconciliations',
        source: 'manual',
      },
      {
        user_id: userId,
        job_application_id: app!.id,
        kind: 'system',
        priority: 'required',
        description: 'Pastel',
        source: 'manual',
      },
    ])
    expect(reqError).toBeNull()

    // 3. Tailored CV with the canonical document.
    const document = sampleDocument()
    const { data: cv, error: cvError } = await db
      .from('tailored_cvs')
      .insert({
        user_id: userId,
        job_application_id: app!.id,
        title: 'CV — Bookkeeper',
        document,
      })
      .select()
      .single()
    expect(cvError).toBeNull()

    // 4. Save an immutable version.
    const { data: version, error: versionError } = await db
      .from('cv_versions')
      .insert({
        user_id: userId,
        tailored_cv_id: cv!.id,
        job_application_id: app!.id,
        version_number: 1,
        status: 'ready',
        document,
        visibility_settings: document.visibility,
      })
      .select()
      .single()
    expect(versionError).toBeNull()

    // 5. Lock, then submit (the Applied workflow).
    await db
      .from('cv_versions')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('id', version!.id)
    const { error: submitError } = await db
      .from('cv_versions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', version!.id)
    expect(submitError).toBeNull()

    const appliedAt = new Date().toISOString()
    const { error: linkError } = await db
      .from('job_applications')
      .update({
        status: 'applied',
        applied_at: appliedAt,
        submitted_cv_version_id: version!.id,
      })
      .eq('id', app!.id)
    expect(linkError).toBeNull()

    // 6. The submitted version is immutable and correctly linked.
    const { data: finalApp } = await db
      .from('job_applications')
      .select('status, applied_at, submitted_cv_version_id')
      .eq('id', app!.id)
      .single()
    expect(finalApp!.status).toBe('applied')
    expect(finalApp!.submitted_cv_version_id).toBe(version!.id)

    const { error: tamperError } = await db
      .from('cv_versions')
      .update({ document: { tampered: true } })
      .eq('id', version!.id)
    expect(tamperError).not.toBeNull()

    // Archive so cleanup cascade can delete the application.
    await db
      .from('cv_versions')
      .update({ status: 'archived' })
      .eq('id', version!.id)
  }, 60_000)
})
