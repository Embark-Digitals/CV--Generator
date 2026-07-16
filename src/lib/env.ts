/**
 * Configuration-value hardening for values that end up in HTTP headers.
 *
 * The Supabase anon key is sent by supabase-js as the `apikey` header and as
 * `Authorization: Bearer <key>`, and the project URL becomes the request URL.
 * If any of these values carries a code point the browser cannot put in a
 * header, `fetch` throws before a request is ever sent:
 *
 *   TypeError: Failed to execute 'fetch' on 'Window': Failed to read the
 *   'headers' property from 'RequestInit': String contains non ISO-8859-1
 *   code point.
 *
 * This happens when a credential is pasted/stored with a UTF-8 BOM (U+FEFF),
 * smart quotes, an em/en dash, an ellipsis, or a stray newline — e.g. copied
 * from a BOM-prefixed file or a text field that appended a line break.
 *
 * We therefore sanitise (strip BOM + surrounding whitespace) and then require
 * the result to be header-safe printable ASCII, failing loudly at startup
 * rather than deep inside an opaque fetch call.
 */

/** Strip a leading UTF-8 BOM and trim surrounding whitespace/newlines. */
export function sanitizeConfigValue(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw.replace(/^﻿/, '').trim()
}

/**
 * Returns the first offending character (or null if the value is header-safe).
 * Header values must be printable ASCII (0x20–0x7E); anything else — control
 * chars, the BOM, smart quotes, dashes, ellipses — is rejected.
 */
export function findUnsafeHeaderChar(
  value: string,
): { index: number; code: number } | null {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code > 0x7e) return { index: i, code }
  }
  return null
}

/**
 * Sanitise then assert a required credential is header-safe ASCII. Throws a
 * clear configuration error (never printing the value) if it is missing or
 * contains a character that would break request headers.
 */
export function assertHeaderSafeConfig(name: string, raw: string | undefined | null): string {
  const value = sanitizeConfigValue(raw)
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and set your Supabase project values.`,
    )
  }
  const bad = findUnsafeHeaderChar(value)
  if (bad) {
    throw new Error(
      `${name} contains a non-ASCII or control character ` +
        `(U+${bad.code.toString(16).toUpperCase().padStart(4, '0')} at position ${bad.index}) ` +
        `and cannot be used in a request header. Re-enter it as plain ASCII with no ` +
        `BOM, smart quotes, dashes or line breaks.`,
    )
  }
  return value
}
