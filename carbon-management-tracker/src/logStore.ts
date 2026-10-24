import { useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'

// Front end only: entries live in this browser until the backend exists

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

const STORAGE_KEY = 'carbon-log'

function load(): LogItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as LogItem[]) : []
  } catch {
    return []
  }
}

let items = load()
// The entry just logged this visit, so the log panel can show its result
let lastAddedId: string | null = null
const listeners = new Set<() => void>()

function save(next: LogItem[]) {
  items = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage can be blocked (private windows); the log still works for this visit
  }
  listeners.forEach((l) => l())
}

export function addLogItem(item: Omit<LogItem, 'id' | 'loggedAt'>) {
  const id = crypto.randomUUID()
  lastAddedId = id
  save([{ ...item, id, loggedAt: Date.now() }, ...items])
  showToast(
    item.kg === null ? 'Saved to History' : `Saved · ${item.kg.toFixed(1)} kg CO₂e`,
  )
}

export function updateLogItem(id: string, changes: Pick<LogItem, 'date' | 'title' | 'detail'>) {
  // Only the wording and date can change, so the estimate still applies
  save(items.map((i) => (i.id === id ? { ...i, ...changes } : i)))
  showToast('Changes saved')
}

export function deleteLogItem(id: string) {
  save(items.filter((i) => i.id !== id))
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
