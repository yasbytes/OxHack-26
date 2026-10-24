import { useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'

// Front end only: friends live in this browser, and their footprints are made up
// from their name so the same friend always shows the same numbers. The backend
// should replace this with real friend requests and each friend's real totals.

export type Friend = {
  id: string
  name: string
  weekKg: number
  yearTonnes: number
  // Each friend's own yearly limit, so their cat's mood is fair to them
  limitTonnes: number
}

const STORAGE_KEY = 'friends'

// Simple string hash so a given name always produces the same sample numbers
function hash(text: string) {
  let h = 0
  for (const ch of text.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function sampleFootprint(name: string) {
  const h = hash(name)
  return {
    weekKg: 55 + (h % 140),
    yearTonnes: Math.round((3 + ((h >> 8) % 70) / 10) * 10) / 10,
    limitTonnes: 6,
  }
}

function makeFriend(name: string): Friend {
  return { id: crypto.randomUUID(), name, ...sampleFootprint(name) }
}

function load(): Friend[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as Friend[]) : []
  } catch {
    return []
  }
}

let friends = load()
const listeners = new Set<() => void>()

function save(next: Friend[]) {
  friends = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends))
  } catch {
    // Storage can be blocked (private windows); friends still work for this visit
  }
  listeners.forEach((l) => l())
}

// Returns false when someone with that name is already a friend
export function addFriend(name: string) {
  if (friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) return false
  save([...friends, makeFriend(name)])
  showToast(`${name} added`)
  return true
}

export function removeFriend(id: string) {
  const friend = friends.find((f) => f.id === id)
  save(friends.filter((f) => f.id !== id))
  if (friend) showToast(`${friend.name} removed`)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFriends() {
  return useSyncExternalStore(subscribe, () => friends)
}
