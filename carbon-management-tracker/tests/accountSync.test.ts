import { afterEach, expect, it, vi } from 'vitest'
const db = vi.hoisted(() => ({ write: vi.fn(), calls: [] as unknown[][] }))
vi.mock('../src/cloud', () => ({
  reportSyncError: vi.fn(),
  cloudFor: (owner: string | null) => owner && !owner.startsWith('demo:') ? {
    from: (table: string) => ({
      upsert: (row: unknown) => { db.calls.push([table, 'upsert', row]); return db.write() },
      delete: () => {
        const filters: unknown[] = []
        const query = {
          eq: (...args: unknown[]) => { filters.push(args); return query },
          then: (resolve: (value: unknown) => void) => {
            db.calls.push([table, 'delete', filters])
            return db.write().then(resolve)
          },
        }
        return query
      },
    }),
  } : null,
}))
import { createAccountSync } from '../src/accountSync'
const stores: ReturnType<typeof createAccountSync>[] = []
function store() {
  const s = createAccountSync('log_items')
  stores.push(s)
  return s
}
afterEach(() => {
  stores.forEach((s) => s.setUser(null))
  stores.length = 0
  localStorage.clear()
  db.write.mockReset()
  db.calls = []
})

it('retains failed changes through a reload and retries with the original owner', async () => {
  db.write.mockResolvedValue({ error: new Error('offline') })
  const first = store()
  first.setUser('alice')
  first.enqueue({ type: 'upsert', row: { id: 'entry', kg: 12 } })
  expect(await first.flush()).toBe(false)
  first.setUser(null)
  db.write.mockResolvedValue({ error: null })
  const reloaded = store()
  reloaded.setUser('alice')
  expect(await reloaded.flush()).toBe(true)
  expect(db.calls.at(-1)).toEqual(['log_items', 'upsert', { id: 'entry', kg: 12, user_id: 'alice' }])
  expect(reloaded.pending).toBe(false)
  expect(JSON.parse(localStorage.getItem('pending:log_items:alice')!)).toEqual([])
})

it('retries inserts before their deletion so deleted entries stay deleted', async () => {
  db.write.mockResolvedValue({ error: new Error('offline') })
  const s = store()
  s.setUser('alice')
  s.enqueue({ type: 'upsert', row: { id: 'entry' } })
  await s.flush()
  s.enqueue({ type: 'delete', id: 'entry' })
  await s.flush()
  db.calls = []
  db.write.mockResolvedValue({ error: null })
  await s.flush()
  expect(db.calls).toEqual([
    ['log_items', 'upsert', { id: 'entry', user_id: 'alice' }],
    ['log_items', 'delete', [['user_id', 'alice'], ['id', 'entry']]],
  ])
})

it('does not drain the next account’s outbox using a previous account’s in-flight request', async () => {
  let finish!: (value: { error: null }) => void
  db.write.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    .mockResolvedValue({ error: null })
  const s = store()
  s.setUser('alice')
  s.enqueue({ type: 'upsert', row: { id: 'alice-entry' } })
  s.setUser('bob')
  s.enqueue({ type: 'upsert', row: { id: 'bob-entry' } })
  finish({ error: null })
  await s.flush()
  expect(db.calls).toEqual([
    ['log_items', 'upsert', { id: 'alice-entry', user_id: 'alice' }],
    ['log_items', 'upsert', { id: 'bob-entry', user_id: 'bob' }],
  ])
})

it('leaves demo data in the browser', async () => {
  const s = store()
  s.setUser('demo:alice@example.test')
  s.enqueue({ type: 'upsert', row: { id: 'demo-entry' } })
  expect(await s.flush()).toBe(true)
  expect(db.calls).toEqual([])
})
