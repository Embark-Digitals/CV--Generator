import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the browser Supabase client so we can drive extract-profile responses.
const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke } },
}))

const { extractProfile, extractionMessage, ExtractionError } = await import(
  '@/features/import/api'
)

beforeEach(() => invoke.mockReset())
afterEach(() => vi.restoreAllMocks())

const CATEGORIES = [
  'timeout',
  'rate_limited',
  'quota',
  'truncated',
  'invalid_response',
  'in_progress',
  'unavailable',
] as const

describe('extractionMessage', () => {
  it('gives a distinct, safe message for every category', () => {
    const seen = new Set<string>()
    for (const c of CATEGORIES) {
      const m = extractionMessage(c)
      expect(m.length).toBeGreaterThan(0)
      // Never leak the misleading old copy or raw provider/stack text.
      expect(m).not.toMatch(/once the AI service is configured/i)
      expect(m).not.toMatch(/openai|token|stack|undefined/i)
      seen.add(m)
    }
    expect(seen.size).toBe(CATEGORIES.length) // all distinct
  })
  it('falls back to the temporarily-unavailable message for unknown input', () => {
    expect(extractionMessage('something-else')).toBe(extractionMessage('unavailable'))
  })
})

describe('extractProfile error mapping', () => {
  it('REGRESSION: a 502 truncated response surfaces as an ExtractionError(truncated)', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        context: new Response(
          JSON.stringify({ error: 'Profile extraction failed', category: 'truncated' }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        ),
      },
    })
    await expect(extractProfile('doc-1')).rejects.toMatchObject({
      name: 'ExtractionError',
      category: 'truncated',
      message: extractionMessage('truncated'),
    })
  })

  it('maps a 409 in-progress duplicate to ExtractionError(in_progress)', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ category: 'in_progress' }), { status: 409 }),
      },
    })
    const err = await extractProfile('doc-1').catch((e) => e)
    expect(err).toBeInstanceOf(ExtractionError)
    expect(err.category).toBe('in_progress')
  })

  it('defaults to unavailable when no category can be read', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'network down' } })
    const err = await extractProfile('doc-1').catch((e) => e)
    expect(err).toBeInstanceOf(ExtractionError)
    expect(err.category).toBe('unavailable')
  })

  it('returns the parsed candidate on success', async () => {
    invoke.mockResolvedValue({
      data: {
        candidate: {
          personal: { full_name: 'Synthetic Person' },
          experiences: [{ company: 'Acme', title: 'Clerk', bullets: ['Did tasks'] }],
        },
      },
      error: null,
    })
    const result = await extractProfile('doc-1')
    expect(result.experiences[0].company).toBe('Acme')
    expect(result.skills).toEqual([]) // schema defaults applied
  })

  it('treats a malformed candidate payload as invalid_response', async () => {
    invoke.mockResolvedValue({
      data: { candidate: { experiences: [{ title: 'missing company' }] } },
      error: null,
    })
    const err = await extractProfile('doc-1').catch((e) => e)
    expect(err).toBeInstanceOf(ExtractionError)
    expect(err.category).toBe('invalid_response')
  })
})
