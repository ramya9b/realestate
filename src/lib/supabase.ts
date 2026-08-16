import { createClient } from '@supabase/supabase-js'

// No hardcoded fallback. The previous version shipped a project URL and key as
// defaults, which meant a missing .env.local silently pointed the app at the
// old flat-listing database instead of failing.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env.local and fill both in.'
  )
}

export const supabase = createClient(url, key)
