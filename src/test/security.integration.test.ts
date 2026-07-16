// @vitest-environment node
// Live security and versioning integration tests against the real Supabase
// project. Requires .env and private/qa-users.txt (both gitignored); the
// whole suite skips when they are absent (e.g. in CI without secrets).
import { readFileSync, existsSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface QaUser {
  email: string
  password: string
  id: string
}

function loadEnv(): Record<string, string> | null {
  if (!existsSync('.env') || !existsSync('private/qa-users.txt')) return null
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  )
}

const env = loadEnv()
const describeLive = env ? describe : describe.skip

describeLive('RLS, storage isolation and version immutability (live)', () => {
  let anon: SupabaseClient
  let u1Client: SupabaseClient
  let u2Client: SupabaseClient
  let u1: QaUser
  let u2: QaUser
  const cleanup: Array<() => PromiseLike<unknown>> = []

  beforeAll(async () => {
    const users = readFileSync('private/qa-users.txt', 'utf8')
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const [email, password, id] = line.split('\t')
        return { email, password, id }
      })
    ;[u1, u2] = users
    const url = env!.VITE_SUPABASE_URL
    const key = env!.VITE_SUPABASE_ANON_KEY
    anon = createClient(url, key)
    u1Client = createClient(url, key)
    u2Client = createClient(url, key)
    const [s1, s2] = await Promise.all([
      u1Client.auth.signInWithPassword({ email: u1.email, password: u1.password }),
      u2Client.auth.signInWithPassword({ email: u2.email, password: u2.password }),
    ])
    if (s1.error || s2.error) throw new Error('QA sign-in failed')
  }, 30_000)

  afterAll(async () => {
    for (const fn of cleanup.reverse()) {
      try {
        await fn()
      } catch {
        // best-effort cleanup
      }
    }
  }, 30_000)

  it('denies unauthenticated access to every core table', async () => {
    for (const table of [
      'profiles',
      'experiences',
      'job_applications',
      'ai_suggestions',
      'cv_versions',
      'user_roles',
    ]) {
      const { data } = await anon.from(table).select('*').limit(5)
      expect(data ?? []).toHaveLength(0)
    }
  })

  it('denies cross-user profile reads', async () => {
    const { data } = await u1Client.from('profiles').select('*').eq('id', u2.id)
    expect(data ?? []).toHaveLength(0)
  })

  it('denies inserting records owned by another user', async () => {
    const { error } = await u1Client
      .from('experiences')
      .insert({ user_id: u2.id, company: 'Spoof Co', title: 'Spoof' })
    expect(error).not.toBeNull()
  })

  it('denies attaching a child to another user parent', async () => {
    const { data: exp, error: expError } = await u1Client
      .from('experiences')
      .insert({ user_id: u1.id, company: 'QA Co', title: 'QA' })
      .select()
      .single()
    expect(expError).toBeNull()
    cleanup.push(() => u1Client.from('experiences').delete().eq('id', exp!.id))

    const { error } = await u2Client.from('experience_bullets').insert({
      user_id: u2.id,
      experience_id: exp!.id,
      content: 'foreign parent',
    })
    expect(error).not.toBeNull()
  })

  it('denies cross-user storage writes and reads', async () => {
    const foreignPath = `${u1.id}/qa/foreign.pdf`
    const { error: writeError } = await u2Client.storage
      .from('source-cvs')
      .upload(foreignPath, new Blob(['x'], { type: 'application/pdf' }))
    expect(writeError).not.toBeNull()

    const ownPath = `${u1.id}/qa/own.pdf`
    const { error: ownError } = await u1Client.storage
      .from('source-cvs')
      .upload(ownPath, new Blob(['x'], { type: 'application/pdf' }), {
        upsert: true,
      })
    expect(ownError).toBeNull()
    cleanup.push(() => u1Client.storage.from('source-cvs').remove([ownPath]))

    const { data: stolen } = await u2Client.storage
      .from('source-cvs')
      .download(ownPath)
    expect(stolen).toBeNull()
  })

  it('locks submitted/locked versions against edits and deletes, and keeps them stable when the draft changes', async () => {
    // Build the ownership chain: application -> tailored CV -> version.
    const { data: app } = await u1Client
      .from('job_applications')
      .insert({ user_id: u1.id, company: 'QA Co', job_title: 'QA Role' })
      .select()
      .single()
    cleanup.push(() =>
      u1Client.from('job_applications').delete().eq('id', app!.id),
    )

    const { data: cv } = await u1Client
      .from('tailored_cvs')
      .insert({
        user_id: u1.id,
        job_application_id: app!.id,
        document: { marker: 'draft-v1' },
      })
      .select()
      .single()

    const { data: version, error: versionError } = await u1Client
      .from('cv_versions')
      .insert({
        user_id: u1.id,
        tailored_cv_id: cv!.id,
        job_application_id: app!.id,
        version_number: 1,
        document: { marker: 'version-v1' },
      })
      .select()
      .single()
    expect(versionError).toBeNull()

    // Lock it.
    const { error: lockError } = await u1Client
      .from('cv_versions')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('id', version!.id)
    expect(lockError).toBeNull()

    // Locked content cannot change.
    const { error: editError } = await u1Client
      .from('cv_versions')
      .update({ document: { marker: 'tampered' } })
      .eq('id', version!.id)
    expect(editError).not.toBeNull()

    // Locked versions cannot be deleted.
    const { error: deleteError } = await u1Client
      .from('cv_versions')
      .delete()
      .eq('id', version!.id)
    expect(deleteError).not.toBeNull()

    // Updating the active draft does not touch the version snapshot.
    await u1Client
      .from('tailored_cvs')
      .update({ document: { marker: 'draft-v2' } })
      .eq('id', cv!.id)
    const { data: reread } = await u1Client
      .from('cv_versions')
      .select('document, status')
      .eq('id', version!.id)
      .single()
    expect(reread!.document).toEqual({ marker: 'version-v1' })

    // locked -> submitted is the only permitted forward transition.
    const { error: submitError } = await u1Client
      .from('cv_versions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', version!.id)
    expect(submitError).toBeNull()

    // submitted -> draft is rejected.
    const { data: downgraded } = await u1Client
      .from('cv_versions')
      .update({ status: 'draft' })
      .eq('id', version!.id)
      .select()
    expect(downgraded ?? []).toHaveLength(0)

    // Archive it so the application cascade delete can clean up
    // (delete of submitted rows is blocked; cascade bypasses via trigger?
    // No — cascaded deletes also fire the trigger, so archive first).
    await u1Client
      .from('cv_versions')
      .update({ status: 'archived' })
      .eq('id', version!.id)
  }, 60_000)

  it('denies cross-user suggestion reads', async () => {
    const { data } = await u2Client.from('ai_suggestions').select('*').limit(5)
    expect(data ?? []).toHaveLength(0)
  })
})
