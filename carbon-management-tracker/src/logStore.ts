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
  // Filled in once the backend calculates emissions
  kg: number | null
}

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

let items: LogItem[] = []
const listeners = new Set<() => void>()

export function setLogUser(userId: string | null) {
  const nextKey = userId ? `carbon-log:${userId}` : null
  if (storageKey === nextKey) return
  storageKey = nextKey
  items = load()
  listeners.forEach((listener) => listener())
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

export function addLogItem(item: Omit<LogItem, 'id' | 'loggedAt' | 'kg'>) {
  save([{ ...item, id: crypto.randomUUID(), loggedAt: Date.now(), kg: null }, ...items])
  showToast('Saved to History')
}

export function updateLogItem(id: string, changes: Pick<LogItem, 'date' | 'title' | 'detail'>) {
  // Edited entries need recalculating, so any old figure is cleared
  save(items.map((i) => (i.id === id ? { ...i, ...changes, kg: null } : i)))
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
