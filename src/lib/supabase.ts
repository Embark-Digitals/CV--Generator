import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { assertHeaderSafeConfig } from '@/lib/env'

// Sanitise + validate the credentials that supabase-js places into request
// headers (the anon key becomes `apikey` and `Authorization`, the URL becomes
// the request URL). A stray BOM/smart-quote/newline here makes the browser
// throw "String contains non ISO-8859-1 code point" on the first fetch, so we
// fail fast with a clear configuration error instead.
const supabaseUrl = assertHeaderSafeConfig(
  'VITE_SUPABASE_URL',
  import.meta.env.VITE_SUPABASE_URL as string,
)
const supabaseAnonKey = assertHeaderSafeConfig(
  'VITE_SUPABASE_ANON_KEY',
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    // Plain-ASCII client identifier only — never user-facing product copy.
    headers: { 'X-Client-Info': 'cv-machine-web' },
  },
})
