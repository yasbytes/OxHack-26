import { useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'
import { cloudFor, fetchSoon, reportSyncError } from './cloud.ts'

// Friends are other accounts. A request is sent by username or email and shared totals only
// appear once the other person accepts. Each friend's numbers are worked out in
// the database from their own log (friends_overview in supabase/migrations).

export type Friend = {
  id: string
  name: string
  username: string | null
  weekKg: number
  yearTonnes: number
  // Each friend's own yearly limit, so their cat's mood is fair to them
  limitTonnes: number
}

export type FriendRequest = {
  id: string
  name: string
  username: string | null
  direction: 'incoming' | 'outgoing'
}

type FriendsState = {
  // 'local' means a demo account, which has nobody to be friends with
  status: 'local' | 'loading' | 'ready' | 'error'
  friends: Friend[]
  requests: FriendRequest[]
}

type OverviewRow = {
  user_id: string
  name: string
  username: string | null
  status: 'friend' | 'incoming' | 'outgoing'
  week_kg: number | null
  year_kg: number | null
  monthly_limit_kg: number | null
}

const LOCAL: FriendsState = { status: 'local', friends: [], requests: [] }

let userId: string | null = null
let state: FriendsState = LOCAL
const listeners = new Set<() => void>()

function set(next: FriendsState) {
  state = next
  listeners.forEach((l) => l())
}

export function setFriendsUser(nextUserId: string | null) {
  if (userId === nextUserId) return
  userId = nextUserId
  set(cloudFor(userId) ? { status: 'loading', friends: [], requests: [] } : LOCAL)
  fetchSoon(refreshFriends)
}

export async function refreshFriends() {
  const cloud = cloudFor(userId)
  if (!cloud) return
  const owner = userId
  try {
    const { data, error } = await cloud.rpc('friends_overview')
    if (error) throw error
    if (userId !== owner) return
    const rows = data as OverviewRow[]
    set({
      status: 'ready',
      friends: rows
        .filter((r) => r.status === 'friend')
        .map((r) => ({
          id: r.user_id,
          name: r.name,
          username: r.username,
          weekKg: Math.round(r.week_kg ?? 0),
          yearTonnes: Math.round(r.year_kg ?? 0) / 1000,
          limitTonnes: ((r.monthly_limit_kg ?? 365) * 12) / 1000,
        })),
      requests: rows
        .filter((r) => r.status !== 'friend')
        .map((r) => ({
          id: r.user_id,
          name: r.name,
          username: r.username,
          direction: r.status as FriendRequest['direction'],
        })),
    })
  } catch (error) {
    if (userId !== owner) return
    set({ ...state, status: 'error' })
    reportSyncError(error)
  }
}

// Messages for the errors raised by send_friend_request
const REQUEST_ERRORS: Record<string, string> = {
  no_account: 'Nobody has that username or email yet.',
  is_you: "That's your own email.",
  already_friends: "You're already friends.",
  already_sent: 'You already sent them a request.',
}

// Returns an error message, or null once the request is sent or accepted
export async function sendFriendRequest(usernameOrEmail: string): Promise<string | null> {
  const cloud = cloudFor(userId)
  if (!cloud) return 'Friends need a real account.'
  try {
    const { data, error } = await cloud.rpc('send_friend_request', { friend: usernameOrEmail })
    if (error) {
      const known = Object.keys(REQUEST_ERRORS).find((code) => error.message.includes(code))
      if (known) return REQUEST_ERRORS[known]
      throw error
    }
    showToast(data === 'accepted' ? "They'd already asked, so you're now friends" : 'Friend request sent')
    await refreshFriends()
    return null
  } catch (error) {
    reportSyncError(error)
    return "Couldn't send the request. Try again in a moment."
  }
}

async function call(fn: string, args: Record<string, unknown>, done: string) {
  const cloud = cloudFor(userId)
  if (!cloud) return
  try {
    const { error } = await cloud.rpc(fn, args)
    if (error) throw error
    showToast(done)
    await refreshFriends()
  } catch (error) {
    reportSyncError(error)
  }
}

export function respondToRequest(request: FriendRequest, accept: boolean) {
  return call(
    'respond_friend_request',
    { friend_id: request.id, accept },
    accept ? `You and ${request.name} are now friends` : 'Request declined',
  )
}

// Unfriends, or cancels a request you sent
export function removeFriend(friend: { id: string; name: string }) {
  return call('remove_friend', { friend_id: friend.id }, `${friend.name} removed`)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFriends() {
  return useSyncExternalStore(subscribe, () => state)
}
