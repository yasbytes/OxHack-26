import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function configureSupabase(): { client: SupabaseClient | null; error: string | null } {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  // Accept the variable names used in this project's earlier setup
  const key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_KEY
  )?.trim()

  if (!url || !key) {
    return { client: null, error: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart Vite.' }
  }

  try {
    const parsedUrl = new URL(url)
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error('Invalid URL')
    if (!key.startsWith('sb_publishable_')) {
      const payload = key.split('.')[1]
      const decoded = payload && JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      if (decoded?.role !== 'anon') throw new Error('Invalid public key')
    }
    return {
      client: createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
      error: null,
    }
  } catch {
    return { client: null, error: 'Check the Supabase project URL and publishable (or legacy anon) key in .env.local. Server secret keys are not supported in the browser.' }
  }
}

const configuration = configureSupabase()
export const supabaseConfigurationError = configuration.error
const supabase = configuration.client

if (import.meta.env.DEV && supabaseConfigurationError) {
  console.error(supabaseConfigurationError)
}

export default supabase