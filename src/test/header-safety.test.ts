import { describe, expect, it } from 'vitest'
import {
  assertHeaderSafeConfig,
  findUnsafeHeaderChar,
  sanitizeConfigValue,
} from '@/lib/env'

// A realistic (fake) JWT-shaped anon key: all header-safe ASCII.
const CLEAN_KEY = 'eyJhbGciOiJIUzI1NiJ9.' + 'a'.repeat(160) + '.signature-part_00'
const BOM = '﻿'

describe('sanitizeConfigValue', () => {
  it('strips a leading UTF-8 BOM', () => {
    expect(sanitizeConfigValue(BOM + CLEAN_KEY)).toBe(CLEAN_KEY)
  })
  it('trims surrounding whitespace and newlines', () => {
    expect(sanitizeConfigValue('  ' + CLEAN_KEY + '\r\n')).toBe(CLEAN_KEY)
    expect(sanitizeConfigValue('\n' + CLEAN_KEY + '  ')).toBe(CLEAN_KEY)
  })
  it('handles empty / nullish input safely', () => {
    expect(sanitizeConfigValue('')).toBe('')
    expect(sanitizeConfigValue(undefined)).toBe('')
    expect(sanitizeConfigValue(null)).toBe('')
  })
})

describe('findUnsafeHeaderChar', () => {
  it('accepts printable ASCII', () => {
    expect(findUnsafeHeaderChar(CLEAN_KEY)).toBeNull()
    expect(findUnsafeHeaderChar('https://abc.supabase.co')).toBeNull()
  })
  it('flags the BOM as the first offender', () => {
    const bad = findUnsafeHeaderChar(BOM + CLEAN_KEY)
    expect(bad).toEqual({ index: 0, code: 0xfeff })
  })
  it('flags smart quotes, em/en dashes and ellipses', () => {
    for (const ch of ['—', '–', '…', '“', '”', '‘', '’']) {
      expect(findUnsafeHeaderChar('X' + ch)).not.toBeNull()
    }
  })
  it('flags control characters', () => {
    expect(findUnsafeHeaderChar('abc\ndef')).not.toBeNull()
  })
})

describe('assertHeaderSafeConfig', () => {
  it('returns the sanitised value for a clean credential (even with BOM/whitespace)', () => {
    expect(assertHeaderSafeConfig('VITE_SUPABASE_ANON_KEY', BOM + CLEAN_KEY + '\n')).toBe(CLEAN_KEY)
  })

  it('heals the exact production corruption (leading BOM + trailing CR/LF)', () => {
    // This is the shape that caused the browser RequestInit.headers error in
    // production; the guard sanitises it back to a clean, header-safe key.
    expect(assertHeaderSafeConfig('VITE_SUPABASE_ANON_KEY', BOM + CLEAN_KEY + '\r\n')).toBe(CLEAN_KEY)
  })

  it('rejects an un-healable embedded non-ASCII char (BOM in the middle)', () => {
    const embedded = CLEAN_KEY.slice(0, 3) + BOM + CLEAN_KEY.slice(3)
    expect(() => assertHeaderSafeConfig('VITE_SUPABASE_ANON_KEY', embedded)).toThrow(
      /non-ASCII or control character/i,
    )
  })

  it('rejects user-facing product copy in a header value (Unicode cannot enter headers)', () => {
    expect(() => assertHeaderSafeConfig('X-Client-Info', 'CV Machine — Password Recovery')).toThrow(
      /U\+2014/, // the em dash
    )
  })

  it('throws a clear error for a missing value', () => {
    expect(() => assertHeaderSafeConfig('VITE_SUPABASE_URL', '')).toThrow(/Missing VITE_SUPABASE_URL/)
    expect(() => assertHeaderSafeConfig('VITE_SUPABASE_URL', undefined)).toThrow(/Missing/)
  })

  it('never includes the credential value in the error message', () => {
    const embedded = CLEAN_KEY.slice(0, 3) + BOM + CLEAN_KEY.slice(3)
    let message = ''
    try {
      assertHeaderSafeConfig('VITE_SUPABASE_ANON_KEY', embedded)
    } catch (e) {
      message = (e as Error).message
    }
    expect(message).not.toContain(CLEAN_KEY)
    expect(message).toContain('U+FEFF')
  })
})
