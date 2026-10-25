import { createAccountSync } from './accountSync'
import { useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'
import { cloudFor, fetchSoon, reportSyncError } from './cloud.ts'

// Entries are cached in this browser per account, and real accounts keep them
// in the log_items table too, so they follow the user to other devices

export type LogKind = 'travel' | 'energy' | 'food' | 'quick'

export type LogItem = {
  id: string
  kind: LogKind
  // The day the activity happened, as YYYY-MM-DD
  date: string
  loggedAt: number
  title: string
  detail: string
  // kg CO₂e; null when it can't be worked out (free text)
  kg: number | null
  // Bills cover a stretch of days ending on `date`; everything else is 1 day
  spreadDays?: number
}

type LogRow = {
  id: string
  kind: LogKind
  date: string
  logged_at: number
  title: string
  detail: string
  kg: number | null
  spread_days: number | null
}

function toRow(item: LogItem): LogRow {
  return {
    id: item.id,
    kind: item.kind,
    date: item.date,
    logged_at: item.loggedAt,
    title: item.title,
    detail: item.detail,
    kg: item.kg ?? null,
    spread_days: item.spreadDays ?? null,
  }
}

function fromRow(row: LogRow): LogItem {
  return {
    id: row.id,
    kind: row.kind,
    date: row.date,
    loggedAt: Number(row.logged_at),
    title: row.title,
    detail: row.detail,
    kg: row.kg,
    ...(row.spread_days ? { spreadDays: row.spread_days } : {}),
  }
}

const sync = createAccountSync('log_items')
let userId: string | null = null
let storageKey: string | null = null

function load(): LogItem[] {
  if (!storageKey) return []
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? (JSON.parse(saved) as LogItem[]) : []
  } catch {
    return []
  }
}

let items = load()

export function getLogItems() {
  return items
}
// The entry just logged this visit, so the log panel can show its result
let lastAddedId: string | null = null
const listeners = new Set<() => void>()

export function setLogUser(nextUserId: string | null) {
  const nextKey = nextUserId ? `carbon-log:${nextUserId}` : null
  if (storageKey === nextKey) return
  userId = nextUserId
  sync.setUser(nextUserId)
  storageKey = nextKey
  items = load()
  lastAddedId = null
  listeners.forEach((listener) => listener())
  fetchSoon(pull)
}

// Bring in the account's entries. The first time an account syncs, whatever
// this browser already had for it is uploaded instead of thrown away.
async function pull() {
  const cloud = cloudFor(userId)
  if (!cloud) return
  const key = storageKey
  const owner = userId
  const revision = sync.revision
  try {
    if (!await sync.flush() || storageKey !== key) return
    // Supabase limits each response. Read every page so older activity still
    // contributes to the graph and rewards after a long logging history.
    const rows: LogRow[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await cloud.from('log_items').select('*')
        .eq('user_id', owner!).order('logged_at', { ascending: false }).order('id')
        .range(offset, offset + pageSize - 1)
      if (error) throw error
      if (storageKey !== key || sync.revision !== revision) return
      rows.push(...(data as LogRow[]))
      if (data.length < pageSize) break
    }
    if (storageKey !== key || sync.revision !== revision || sync.pending) return
    const remote = rows.map(fromRow)
    let firstSync = true
    try { firstSync = localStorage.getItem(`synced:${key}`) !== 'yes' } catch { /* optional marker */ }
    if (firstSync && remote.length === 0 && items.length > 0) {
      for (const item of items) sync.enqueue({ type: 'upsert', row: toRow(item) })
    } else {
      save(remote)
    }
    try { localStorage.setItem(`synced:${key}`, 'yes') } catch { /* optional marker */ }
  } catch (error) {
    reportSyncError(error)
  }
}

function save(next: LogItem[]) {
  if (!storageKey) return
  items = next
  try {
    localStorage.setItem(storageKey, JSON.stringify(items))
  } catch {
    // Storage can be blocked (private windows); the log still works for this visit
  }
  listeners.forEach((l) => l())
}

export function addLogItem(item: Omit<LogItem, 'id' | 'loggedAt'>) {
  const id = crypto.randomUUID()
  lastAddedId = id
  const added = { ...item, id, loggedAt: Date.now() }
  save([added, ...items])
  sync.enqueue({ type: 'upsert', row: toRow(added) })
  showToast(
    item.kg === null ? 'Saved to History' : `Saved · ${item.kg.toFixed(1)} kg CO₂e`,
  )
}

export function updateLogItem(id: string, changes: Pick<LogItem, 'date' | 'title' | 'detail'>) {
  // Only the wording and date can change, so the estimate still applies
  save(items.map((i) => (i.id === id ? { ...i, ...changes } : i)))
  const updated = items.find((item) => item.id === id)
  if (updated) sync.enqueue({ type: 'upsert', row: toRow(updated) })
  showToast('Changes saved')
}

export function clearLog() {
  lastAddedId = null
  save([])
  sync.enqueue({ type: 'delete' })
}

export function deleteLogItem(id: string) {
  save(items.filter((i) => i.id !== id))
  sync.enqueue({ type: 'delete', id })
  showToast('Entry deleted')
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLog() {
  return useSyncExternalStore(subscribe, () => items)
}

export function useLastAdded() {
  const id = useSyncExternalStore(subscribe, () => lastAddedId)
  return useLog().find((i) => i.id === id) ?? null
}

export function clearLastAdded() {
  lastAddedId = null
  listeners.forEach((l) => l())
}
