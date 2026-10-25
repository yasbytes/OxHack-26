import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'
import { coinsEarned, START_COINS } from './coins.ts'
import { getLogItems, useLog } from './logStore.ts'
import { getProfile, useProfile } from './profileStore.ts'
import foodBowl from './assets/shop/food-bowl.png'
import catTreats from './assets/shop/cat-treats.png'

// Front end only: spending and food live in this browser, one wallet per account,
// until the backend keeps them. Coins earned come from the log (coins.ts).

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
}

const EMPTY: ShopState = { spent: 0, owned: { treats: 0, bowl: 0 }, fedUntil: 0 }

let storageKey: string | null = null

function load(): ShopState {
  if (!storageKey) return EMPTY
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return EMPTY
    // Wallets saved before coins came from the log kept a balance instead; start those afresh
    const { spent, owned, fedUntil } = JSON.parse(saved) as Partial<ShopState>
    return { spent: spent ?? 0, owned: { ...EMPTY.owned, ...owned }, fedUntil: fedUntil ?? 0 }
  } catch {
    return EMPTY
  }
}

let state = load()
const listeners = new Set<() => void>()

export function setShopUser(userId: string | null) {
  const nextKey = userId ? `shop:${userId}` : null
  if (storageKey === nextKey) return
  storageKey = nextKey
  state = load()
  listeners.forEach((l) => l())
}

function save(next: ShopState) {
  state = next
  try {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be blocked (private windows); the shop still works for this visit
  }
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

export function feedItem(item: ShopItem, petName: string) {
  if (state.owned[item.id] < 1) return
  // Feeding again tops the time up rather than stacking a second mood level
  const fedUntil = Math.max(state.fedUntil, Date.now()) + item.boostHours * HOUR_MS
  save({ ...state, owned: { ...state.owned, [item.id]: state.owned[item.id] - 1 }, fedUntil })
  showToast(`${petName || 'Your cat'} loved the ${item.name.toLowerCase()}!`)
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
