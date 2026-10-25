import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../src/toast', () => ({ showToast: vi.fn() }))

// A tiny stand-in for the Supabase tables: every call is recorded, reads come from `rows`
const db = vi.hoisted(() => {
  const state = { rows: {} as Record<string, unknown[]>, calls: [] as unknown[][] }
  function table(name: string) {
    let first = 0
    let last = Infinity
    const query = {
      select: () => query,
      order: () => query,
      range: (from: number, to: number) => { first = from; last = to; return query },
      eq: (...args: unknown[]) => { state.calls.push([name, 'eq', ...args]); return query },
      maybeSingle: () => Promise.resolve({ data: state.rows[name]?.[0] ?? null, error: null }),
      insert: (row: unknown) => { state.calls.push([name, 'insert', row]); return Promise.resolve({ error: null }) },
      upsert: (row: unknown) => { state.calls.push([name, 'upsert', row]); return Promise.resolve({ error: null }) },
      update: (row: unknown) => { state.calls.push([name, 'update', row]); return query },
      delete: () => { state.calls.push([name, 'delete']); return query },
      then: (resolve: (v: unknown) => void) => resolve({ data: (state.rows[name] ?? []).slice(first, last + 1), error: null }),
    }
    return query
  }
  const handlers: (() => void)[] = []
  const channel = { on: (_e: string, _f: unknown, h: () => void) => { handlers.push(h); return channel }, subscribe: () => channel }
  return {
    state,
    handlers,
    client: { from: table, rpc: vi.fn(), channel: vi.fn(() => channel), removeChannel: vi.fn(() => Promise.resolve('ok')) },
  }
})
vi.mock('../src/supabase-client', () => ({ default: db.client }))

import { addLogItem, deleteLogItem, setLogUser, useLog } from '../src/logStore'
import { getProfile, setProfileUser, updateProfile } from '../src/profileStore'
import { setFriendsUser, useFriends } from '../src/friendsStore'
import { buildYear } from '../src/monthly'

beforeEach(() => { db.state.rows = {}; db.state.calls = []; db.handlers.length = 0 })
afterEach(() => {
  cleanup()
  setLogUser(null)
  setProfileUser(null)
  setFriendsUser(null)
  localStorage.clear()
})

it("loads an account's entries from the database", async () => {
  db.state.rows.log_items = [
    { id: 'r1', kind: 'food', date: '2026-10-20', logged_at: 5, title: 'Lunch: Vegan', detail: '', kg: 0.7, spread_days: null },
  ]
  const { result } = renderHook(useLog)
  act(() => setLogUser('alice'))
  await waitFor(() => expect(result.current).toHaveLength(1))
  expect(result.current[0]).toEqual({ id: 'r1', kind: 'food', date: '2026-10-20', loggedAt: 5, title: 'Lunch: Vegan', detail: '', kg: 0.7 })
})

it('loads more than one page of activity into the graph', async () => {
  db.state.rows.log_items = Array.from({ length: 1001 }, (_, i) => ({
    id: `entry-${i}`, kind: 'travel', date: '2026-10-20', logged_at: i,
    title: 'Train', detail: '', kg: 1, spread_days: null,
  }))
  const { result } = renderHook(useLog)
  act(() => setLogUser('alice'))
  await waitFor(() => expect(result.current).toHaveLength(1001))
  expect(buildYear(result.current, new Date(2026, 9, 25)).soFarKg).toBe(1001)
})

it('does not restore cached entries after the account history was cleared elsewhere', async () => {
  localStorage.setItem('synced:carbon-log:alice', 'yes')
  localStorage.setItem('carbon-log:alice', JSON.stringify([
    { id: 'old', kind: 'travel', date: '2026-10-20', loggedAt: 1, title: 'Train', detail: '', kg: 1 },
  ]))
  const { result } = renderHook(useLog)
  act(() => setLogUser('alice'))
  await waitFor(() => expect(result.current).toEqual([]))
  expect(db.state.calls.some((c) => c[1] === 'upsert')).toBe(false)
})

it("uploads this browser's entries the first time an account syncs", async () => {
  localStorage.setItem('carbon-log:alice', JSON.stringify([
    { id: 'l1', kind: 'travel', date: '2026-10-20', loggedAt: 1, title: 'Bus', detail: '', kg: 1 },
  ]))
  setLogUser('alice')
  await waitFor(() => expect(db.state.calls.some((c) => c[1] === 'upsert')).toBe(true))
  expect(db.state.calls.find((c) => c[1] === 'upsert')![2]).toEqual(
    { id: 'l1', kind: 'travel', date: '2026-10-20', logged_at: 1, title: 'Bus', detail: '', kg: 1, spread_days: null, user_id: 'alice' },
  )
})

it('writes new and deleted entries to the database', async () => {
  setLogUser('alice')
  await new Promise((r) => setTimeout(r, 10))
  addLogItem({ kind: 'travel', date: '2026-10-24', title: 'Train', detail: '', kg: 0.4 })
  await waitFor(() => expect(db.state.calls.some((c) => c[1] === 'upsert')).toBe(true))
  const inserted = db.state.calls.find((c) => c[1] === 'upsert')![2] as { id: string }
  deleteLogItem(inserted.id)
  await waitFor(() => expect(db.state.calls).toContainEqual(['log_items', 'eq', 'id', inserted.id]))
})

it("demo accounts never touch the database", async () => {
  setLogUser('demo:a@b.com')
  addLogItem({ kind: 'travel', date: '2026-10-24', title: 'Train', detail: '', kg: 0.4 })
  await new Promise((r) => setTimeout(r, 10))
  expect(db.state.calls).toEqual([])
})

it('keeps profiles per account and takes the saved one from the database', async () => {
  localStorage.setItem('profile', JSON.stringify({ name: 'Old', monthlyLimitKg: 300 }))
  localStorage.setItem('pet-name', 'Tom')
  db.state.rows.profiles = [{ name: 'Alice', household: 2, diet: 'vegan', monthly_limit_kg: 200, pet_name: 'Mog' }]
  setProfileUser('alice')
  // The old browser-wide profile moves to the first account, and nobody else
  expect(getProfile()).toMatchObject({ name: 'Old', monthlyLimitKg: 300, petName: 'Tom' })
  expect(localStorage.getItem('profile')).toBeNull()
  await waitFor(() => expect(getProfile().name).toBe('Alice'))
  expect(getProfile()).toMatchObject({ household: 2, diet: 'vegan', monthlyLimitKg: 200, petName: 'Mog' })
  updateProfile({ petName: 'Felix' })
  await waitFor(() => expect(db.state.calls.at(-1)).toMatchObject(['profiles', 'upsert', { pet_name: 'Felix' }]))
  setProfileUser('bob')
  expect(getProfile().name).toBe('')
})

it("lists friends and requests from the database, rounding each friend's totals", async () => {
  db.client.rpc.mockResolvedValue({
    data: [
      { user_id: 'b', name: 'Bob', username: 'bob', status: 'friend', week_kg: 41.6, year_kg: 2345, monthly_limit_kg: 250 },
      { user_id: 'c', name: 'Cat', username: null, status: 'incoming', week_kg: null, year_kg: null, monthly_limit_kg: null },
    ],
    error: null,
  })
  const { result } = renderHook(useFriends)
  act(() => setFriendsUser('alice'))
  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(result.current.friends).toEqual([{ id: 'b', name: 'Bob', username: 'bob', weekKg: 42, yearTonnes: 2.345, limitTonnes: 3 }])
  expect(result.current.requests).toEqual([{ id: 'c', name: 'Cat', username: null, direction: 'incoming' }])
})

it('shows a request as soon as someone sends one', async () => {
  db.client.rpc.mockResolvedValue({ data: [], error: null })
  const { result } = renderHook(useFriends)
  act(() => setFriendsUser('bob'))
  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(db.client.channel).toHaveBeenCalledWith('friendships:bob')
  db.client.rpc.mockResolvedValue({
    data: [{ user_id: 'a', name: 'Alice', username: 'alice', status: 'incoming', week_kg: null, year_kg: null, monthly_limit_kg: null }],
    error: null,
  })
  act(() => db.handlers.forEach((h) => h()))
  await waitFor(() => expect(result.current.requests).toEqual([{ id: 'a', name: 'Alice', username: 'alice', direction: 'incoming' }]))
})

it('sends friend requests by username or email', async () => {
  const { sendFriendRequest } = await import('../src/friendsStore')
  setFriendsUser('alice')
  db.client.rpc.mockResolvedValueOnce({ data: 'sent', error: null }).mockResolvedValue({ data: [], error: null })
  expect(await sendFriendRequest('@bob')).toBeNull()
  expect(db.client.rpc).toHaveBeenCalledWith('send_friend_request', { friend: '@bob' })
  db.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'no_account' } })
  expect(await sendFriendRequest('nobody')).toBe('Nobody has that username or email yet.')
})

it('checks usernames before saving them', async () => {
  const { saveUsername } = await import('../src/profileStore')
  setProfileUser('alice')
  expect(await saveUsername('no')).toMatch(/3 to 20/)
  expect(await saveUsername('@Alex_K')).toBeNull()
  expect(getProfile().username).toBe('alex_k')
  expect(db.state.calls).toContainEqual(['profiles', 'upsert', expect.objectContaining({ username: 'alex_k' })])
})
