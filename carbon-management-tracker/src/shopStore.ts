import { createAccountSync } from './accountSync'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'
import { coinsEarned, START_COINS } from './coins.ts'
import { getLogItems, useLog } from './logStore.ts'
import { getProfile, useProfile } from './profileStore.ts'
import { footprintFor } from './footprint.ts'
import { moodFor } from './pet.ts'
import { cloudFor, fetchSoon, reportSyncError } from './cloud.ts'
import foodBowl from './assets/shop/food-bowl.png'
import catTreats from './assets/shop/cat-treats.png'

// One wallet per account, cached in this browser and kept in the shop_state table
// for real accounts. Coins earned come from the log (coins.ts), so only spending is saved.

export const SHOP_ITEMS = [
  {
    id: 'treats',
    name: 'Cat treats',
    price: 15,
    boostHours: 6,
    image: catTreats,
    description: 'A quick snack. Cheers your cat up by one mood for 6 hours.',
  },
  {
    id: 'bowl',
    name: 'Bowl of food',
    price: 40,
    boostHours: 24,
    image: foodBowl,
    description: 'A full meal. Cheers your cat up by one mood for a whole day.',
  },
] as const
export type ShopItem = (typeof SHOP_ITEMS)[number]
export type ShopItemId = ShopItem['id']

const HOUR_MS = 3_600_000

export type ShopState = {
  // Total spent in the shop; the balance is what's been earned minus this
  spent: number
  owned: Record<ShopItemId, number>
  // When the last meal stops cheering the cat up (ms since 1970). A fed cat
  // also heals after collapsing, as often as it's fed.
  fedUntil: number
}

const EMPTY: ShopState = { spent: 0, owned: { treats: 0, bowl: 0 }, fedUntil: 0 }

const sync = createAccountSync('shop_state')
let userId: string | null = null
let storageKey: string | null = null

function load(): ShopState {
  if (!storageKey) return EMPTY
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return EMPTY
    // Wallets saved before coins came from the log kept a balance instead; start those afresh
    const { spent, owned, fedUntil } = JSON.parse(saved) as Partial<ShopState>
    return {
      spent: spent ?? 0,
      owned: { ...EMPTY.owned, ...owned },
      fedUntil: fedUntil ?? 0,
    }
  } catch {
    return EMPTY
  }
}

let state = load()
const listeners = new Set<() => void>()

export function setShopUser(nextUserId: string | null) {
  const nextKey = nextUserId ? `shop:${nextUserId}` : null
  if (storageKey === nextKey) return
  userId = nextUserId
  sync.setUser(nextUserId)
  storageKey = nextKey
  state = load()
  listeners.forEach((l) => l())
  fetchSoon(pull)
}

type ShopRow = {
  spent: number
  owned: Partial<ShopState['owned']>
  fed_until: number
}

// The account's wallet wins; an account with none yet saves this browser's
async function pull() {
  const cloud = cloudFor(userId)
  if (!cloud) return
  const key = storageKey
  const owner = userId
  const revision = sync.revision
  try {
    if (!await sync.flush() || storageKey !== key) return
    const { data, error } = await cloud.from('shop_state').select('spent, owned, fed_until').eq('user_id', owner!).maybeSingle()
    if (error) throw error
    if (storageKey !== key || sync.revision !== revision || sync.pending) return
    if (!data) {
      if (state !== EMPTY) push(state)
      return
    }
    const row = data as ShopRow
    save({
      spent: row.spent,
      owned: { ...EMPTY.owned, ...row.owned },
      fedUntil: Number(row.fed_until),
    }, false)
  } catch (error) {
    reportSyncError(error)
  }
}

function push(next: ShopState) {
  sync.enqueue({ type: 'upsert', row: {
      spent: next.spent,
      owned: next.owned,
      fed_until: next.fedUntil,
      updated_at: new Date().toISOString(),
    } })
}

function save(next: ShopState, sync = true) {
  state = next
  try {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be blocked (private windows); the shop still works for this visit
  }
  if (sync) push(state)
  listeners.forEach((l) => l())
}

function balance(earned: number, spent: number) {
  return START_COINS + earned - spent
}

export function buyItem(item: ShopItem) {
  const coins = balance(coinsEarned(getLogItems(), getProfile().monthlyLimitKg), state.spent)
  if (coins < item.price) {
    showToast(`You need ${item.price - coins} more coins`)
    return
  }
  save({
    ...state,
    spent: state.spent + item.price,
    owned: { ...state.owned, [item.id]: state.owned[item.id] + 1 },
  })
  showToast(`Bought ${item.name.toLowerCase()} · −${item.price} coins`)
}

// The cat's mood from this month's log alone, before any food
function monthMood(log = getLogItems(), monthlyLimitKg = getProfile().monthlyLimitKg) {
  return moodFor(footprintFor(log).monthKg, monthlyLimitKg)
}

export function feedItem(item: ShopItem, petName: string) {
  if (state.owned[item.id] < 1) return
  const name = petName || 'Your cat'
  const now = Date.now()
  const collapsed = monthMood().id === 'sick'
  // Feeding again tops the time up rather than stacking a second mood level
  const fedUntil = Math.max(state.fedUntil, now) + item.boostHours * HOUR_MS
  save({
    ...state,
    owned: { ...state.owned, [item.id]: state.owned[item.id] - 1 },
    fedUntil,
  })
  showToast(collapsed ? `${name} is healing!` : `${name} loved the ${item.name.toLowerCase()}!`)
}

export function resetShop() {
  save(EMPTY)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useShop() {
  const shop = useSyncExternalStore(subscribe, () => state)
  const log = useLog()
  const { monthlyLimitKg } = useProfile()
  const earned = useMemo(() => coinsEarned(log, monthlyLimitKg), [log, monthlyLimitKg])
  return { ...shop, coins: balance(earned, shop.spent) }
}

// Whether the cat is still enjoying its last meal, checked again every minute
export function useFed() {
  const { fedUntil } = useShop()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const hoursLeft = Math.ceil((fedUntil - now) / HOUR_MS)
  return { fed: fedUntil > now, hoursLeft }
}
