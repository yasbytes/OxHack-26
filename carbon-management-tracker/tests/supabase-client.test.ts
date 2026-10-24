import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn(() => ({ auth: {} })))
vi.mock('@supabase/supabase-js', () => ({ createClient }))

beforeEach(() => {
  vi.resetModules()
  createClient.mockClear()
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  vi.stubEnv('VITE_SUPABASE_KEY', '')
})
afterEach(() => vi.unstubAllEnvs())

it('does not crash when connection settings are missing', async () => {
  const { default: client, supabaseConfigurationError } = await import('../src/supabase-client')
  expect(client).toBeNull()
  expect(supabaseConfigurationError).toContain('Set VITE_SUPABASE_URL')
  expect(createClient).not.toHaveBeenCalled()
})

it('configures persistent authentication with a publishable key', async () => {
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_only')
  const { default: client } = await import('../src/supabase-client')
  expect(client).not.toBeNull()
  expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'sb_publishable_test_only', {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
})

it('rejects a server secret key', async () => {
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_secret_test_only')
  const { default: client } = await import('../src/supabase-client')
  expect(client).toBeNull()
  expect(createClient).not.toHaveBeenCalled()
})

it('accepts the existing anon variable but rejects a service-role JWT', async () => {
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'header.' + btoa(JSON.stringify({ role: 'anon' })) + '.signature')
  expect((await import('../src/supabase-client')).default).not.toBeNull()
  vi.resetModules()
  createClient.mockClear()
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'header.' + btoa(JSON.stringify({ role: 'service_role' })) + '.signature')
  expect((await import('../src/supabase-client')).default).toBeNull()
  expect(createClient).not.toHaveBeenCalled()
})

it('rejects an invalid project URL', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_only')
  expect((await import('../src/supabase-client')).default).toBeNull()
})
