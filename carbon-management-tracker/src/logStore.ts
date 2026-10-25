import { useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'
import { cloudFor, fetchSoon, pushChange, reportSyncError, type Cloud } from './cloud.ts'

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
  // Front-end estimate for now; null when it can't be worked out (free text)
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
  storageKey = nextKey
  items = load()
  listeners.forEach((listener) => listener())
  fetchSoon(pull)
}

// Bring in the account's entries. The first time an account syncs, whatever
// this browser already had for it is uploaded instead of thrown away.
async function pull() {
  const cloud = cloudFor(userId)
  if (!cloud) return
  const key = storageKey
  const startedAt = Date.now()
  try {
    const { data, error } = await cloud.from('log_items').select('*').order('logged_at', { ascending: false })
    if (error) throw error
    if (storageKey !== key) return
    const remote = (data as LogRow[]).map(fromRow)
    if (remote.length === 0 && items.length > 0) {
      const { error: uploadError } = await cloud.from('log_items').upsert(items.map(toRow))
      if (uploadError) throw uploadError
      return
    }
    // Keep anything logged while the request was on its way
    const remoteIds = new Set(remote.map((i) => i.id))
    const fresh = items.filter((i) => i.loggedAt >= startedAt && !remoteIds.has(i.id))
    save([...fresh, ...remote])
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

function push(change: (cloud: Cloud) => PromiseLike<{ error: unknown }>) {
  pushChange(userId, change)
}

export function addLogItem(item: Omit<LogItem, 'id' | 'loggedAt'>) {
  const id = crypto.randomUUID()
  lastAddedId = id
  const added = { ...item, id, loggedAt: Date.now() }
  save([added, ...items])
  push((cloud) => cloud.from('log_items').insert(toRow(added)))
  showToast(
    item.kg === null ? 'Saved to History' : `Saved · ${item.kg.toFixed(1)} kg CO₂e`,
  )
}

export function updateLogItem(id: string, changes: Pick<LogItem, 'date' | 'title' | 'detail'>) {
  // Only the wording and date can change, so the estimate still applies
  save(items.map((i) => (i.id === id ? { ...i, ...changes } : i)))
  push((cloud) => cloud.from('log_items').update(changes).eq('id', id))
  showToast('Changes saved')
}

export function clearLog() {
  lastAddedId = null
  const owner = userId
  save([])
  push((cloud) => cloud.from('log_items').delete().eq('user_id', owner!))
}

export function deleteLogItem(id: string) {
  save(items.filter((i) => i.id !== id))
  push((cloud) => cloud.from('log_items').delete().eq('id', id))
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
