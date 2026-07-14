// Verified-evidence catalogue: the only career facts AI functions may see
// or cite. Pending/rejected records never enter it. Reads go through the
// user-scoped client, so ownership is enforced by RLS.
import type { EvidenceItem } from './truth-lock.ts'

interface DbLike {
  from: (table: string) => any
}

const VERIFIED = ['verified', 'user_confirmed']

export async function buildEvidenceCatalogue(ctx: {
  db: DbLike
  userId: string
}): Promise<EvidenceItem[]> {
  const items: EvidenceItem[] = []

  const { data: experiences } = await ctx.db
    .from('experiences')
    .select(
      'id, company, title, start_date, end_date, is_current, verification_status',
    )
    .in('verification_status', VERIFIED)
  for (const e of experiences ?? []) {
    items.push({
      id: e.id,
      kind: 'experience',
      text: `${e.title} at ${e.company} (${e.start_date ?? '?'} to ${e.is_current ? 'present' : (e.end_date ?? '?')})`,
    })
  }

  const { data: bullets } = await ctx.db
    .from('experience_bullets')
    .select('id, content, verification_status, experiences(company, title)')
    .in('verification_status', VERIFIED)
  for (const b of bullets ?? []) {
    const exp = b.experiences
    items.push({
      id: b.id,
      kind: 'responsibility',
      text: `${b.content} — during ${exp?.title ?? 'role'} at ${exp?.company ?? 'employer'}`,
    })
  }

  const { data: education } = await ctx.db
    .from('education')
    .select(
      'id, institution, qualification, field_of_study, verification_status',
    )
    .in('verification_status', VERIFIED)
  for (const e of education ?? []) {
    items.push({
      id: e.id,
      kind: 'qualification',
      text: `${e.qualification}${e.field_of_study ? ` in ${e.field_of_study}` : ''} — ${e.institution}`,
    })
  }

  const { data: certifications } = await ctx.db
    .from('certifications')
    .select('id, name, issuer, verification_status')
    .in('verification_status', VERIFIED)
  for (const c of certifications ?? []) {
    items.push({
      id: c.id,
      kind: 'certification',
      text: `${c.name}${c.issuer ? ` (${c.issuer})` : ''}`,
    })
  }

  const { data: skills } = await ctx.db
    .from('skills')
    .select('id, name, kind, verification_status')
    .in('verification_status', VERIFIED)
  for (const s of skills ?? []) {
    items.push({ id: s.id, kind: s.kind, text: s.name })
  }

  const { data: confirmed } = await ctx.db
    .from('user_confirmed_evidence')
    .select('id, description')
  for (const u of confirmed ?? []) {
    items.push({ id: u.id, kind: 'user_confirmed', text: u.description })
  }

  return items
}

/**
 * System/software names demanded by the job that the user has NO verified
 * evidence for — Truth Lock fails any proposal that mentions them.
 */
export function unverifiedSystemsFor(
  requirements: Array<{ kind: string; description: string }>,
  evidence: EvidenceItem[],
): string[] {
  const verifiedText = evidence
    .map((e) => e.text.toLowerCase())
    .join(' \n ')
  return requirements
    .filter((r) => r.kind === 'system')
    .map((r) => r.description.trim())
    .filter((name) => name.length >= 2 && !verifiedText.includes(name.toLowerCase()))
}
