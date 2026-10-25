import supabase from './supabase-client'
import { showToast } from './toast.ts'

// Real accounts keep their data in Supabase (tables in supabase/migrations).
// Demo accounts, and anyone without Supabase keys, stay in this browser only.
export function cloudFor(userId: string | null) {
  return supabase && userId && !userId.startsWith('demo:') ? supabase : null
}

export type Cloud = NonNullable<ReturnType<typeof cloudFor>>

// Sends a change to the account in the background; the screen has already updated
export function pushChange(userId: string | null, change: (cloud: Cloud) => PromiseLike<{ error: unknown }>) {
  const cloud = cloudFor(userId)
  if (!cloud) return
  void Promise.resolve()
    .then(() => change(cloud))
    .then(({ error }) => { if (error) throw error })
    .catch(reportSyncError)
}

// Account changes arrive inside Supabase's auth callback, where starting another
// Supabase call can deadlock, so stores fetch on the next tick instead
export function fetchSoon(task: () => Promise<void>) {
  setTimeout(() => void task(), 0)
}

let lastWarned = 0

// Local changes still apply, so say once in a while that they didn't reach the account
export function reportSyncError(error: unknown) {
  if (import.meta.env.DEV) console.warn('Sync failed', error)
  if (Date.now() - lastWarned < 30_000) return
  lastWarned = Date.now()
  const code = typeof error === 'object' && error && 'code' in error ? error.code : null
  showToast(code === 'PGRST205' || code === 'PGRST202'
    ? 'The database setup is missing. Run the Supabase migration, then reload this page.'
    : "Couldn't reach your account. Changes are kept on this device; reconnect or return to this tab to retry.")
}
