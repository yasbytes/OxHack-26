import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'
import { coinsEarned, START_COINS } from './coins.ts'
import { getLogItems, useLog } from './logStore.ts'
import { getProfile, useProfile, weeklyBudgetFor } from './profileStore.ts'
import { footprintFor } from './footprint.ts'
import { moodFor } from './pet.ts'
import { cloudFor, fetchSoon, pushChange, reportSyncError } from './cloud.ts'
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
  // When the last meal stops cheering the cat up (ms since 1970)
  fedUntil: number
  // Food revives a collapsed cat once: this is when that meal wears off, and 0
  // while the revive is still unused. It comes back once the cat recovers.
  reviveUntil: number
}

const EMPTY: ShopState = { spent: 0, owned: { treats: 0, bowl: 0 }, fedUntil: 0, reviveUntil: 0 }

let userId: string | null = null
let storageKey: string | null = null

function load(): ShopState {
  if (!storageKey) return EMPTY
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return EMPTY
    // Wallets saved before coins came from the log kept a balance instead; start those afresh
    const { spent, owned, fedUntil, reviveUntil } = JSON.parse(saved) as Partial<ShopState>
    return {
      spent: spent ?? 0,
      owned: { ...EMPTY.owned, ...owned },
      fedUntil: fedUntil ?? 0,
      reviveUntil: reviveUntil ?? 0,
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
  storageKey = nextKey
  state = load()
  listeners.forEach((l) => l())
  fetchSoon(pull)
}

type ShopRow = {
  spent: number
  owned: Partial<ShopState['owned']>
  fed_until: number
  revive_until: number
}

// The account's wallet wins; an account with none yet saves this browser's
async function pull() {
  const cloud = cloudFor(userId)
  if (!cloud) return
  const key = storageKey
  try {
    const { data, error } = await cloud.from('shop_state').select('spent, owned, fed_until, revive_until').maybeSingle()
    if (error) throw error
    if (storageKey !== key) return
    if (!data) {
      if (state !== EMPTY) push(state)
      return
    }
    const row = data as ShopRow
    save({
      spent: row.spent,
      owned: { ...EMPTY.owned, ...row.owned },
      fedUntil: Number(row.fed_until),
      reviveUntil: Number(row.revive_until),
    }, false)
  } catch (error) {
    reportSyncError(error)
  }
}

function push(next: ShopState) {
  pushChange(userId, (cloud) =>
    cloud.from('shop_state').upsert({
      spent: next.spent,
      owned: next.owned,
      fed_until: next.fedUntil,
      revive_until: next.reviveUntil,
      updated_at: new Date().toISOString(),
    }),
  )
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

// The cat's mood from this week's log alone, before any food
function weekMood(log = getLogItems(), monthlyLimitKg = getProfile().monthlyLimitKg) {
  return moodFor(footprintFor(log).weekKg, weeklyBudgetFor(monthlyLimitKg))
}

export function feedItem(item: ShopItem, petName: string) {
  if (state.owned[item.id] < 1) return
  const name = petName || 'Your cat'
  const now = Date.now()
  const collapsed = weekMood().id === 'sick'
  // A collapsed cat gets one revive; more food then waits until it recovers
  if (collapsed && state.reviveUntil > 0) {
    showToast(`Food won't revive ${name} again. Cut this week's footprint instead.`)
    return
  }
  // Feeding again tops the time up rather than stacking a second mood level
  const fedUntil = Math.max(state.fedUntil, now) + item.boostHours * HOUR_MS
  save({
    ...state,
    owned: { ...state.owned, [item.id]: state.owned[item.id] - 1 },
    fedUntil,
    reviveUntil: collapsed ? fedUntil : state.reviveUntil,
  })
  showToast(
    collapsed
      ? `${name} came round! Food only does that once, so cut this week's footprint.`
      : `${name} loved the ${item.name.toLowerCase()}!`,
  )
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
  const { fedUntil, reviveUntil } = useShop()
  const log = useLog()
  const { monthlyLimitKg } = useProfile()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const collapsed = useMemo(() => weekMood(log, monthlyLimitKg).id === 'sick', [log, monthlyLimitKg])
  const reviving = reviveUntil > now
  // Once the cat has recovered and the revive has worn off, the next collapse gets a new one
  useEffect(() => {
    if (!collapsed && reviveUntil > 0 && !reviving) save({ ...state, reviveUntil: 0 })
  }, [collapsed, reviveUntil, reviving])
  const hoursLeft = Math.ceil((fedUntil - now) / HOUR_MS)
  return { fed: fedUntil > now, hoursLeft, reviving, reviveUsed: reviveUntil > 0 }
}
