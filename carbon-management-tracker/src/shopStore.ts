import { useEffect, useState, useSyncExternalStore } from 'react'
import { showToast } from './toast.ts'
import foodBowl from './assets/shop/food-bowl.png'
import catTreats from './assets/shop/cat-treats.png'

// Front end only: coins and food live in this browser, one wallet per account,
// until the backend keeps them

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

// Every activity logged earns this many coins
export const LOG_REWARD = 10
const START_COINS = 120
const HOUR_MS = 3_600_000

export type ShopState = {
  coins: number
  owned: Record<ShopItemId, number>
  // When the last meal stops cheering the cat up (ms since 1970)
  fedUntil: number
}

const EMPTY: ShopState = { coins: START_COINS, owned: { treats: 0, bowl: 0 }, fedUntil: 0 }

let storageKey: string | null = null

function load(): ShopState {
  if (!storageKey) return EMPTY
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return EMPTY
    const parsed = JSON.parse(saved) as Partial<ShopState>
    return { ...EMPTY, ...parsed, owned: { ...EMPTY.owned, ...parsed.owned } }
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

export function earnCoins(amount: number) {
  save({ ...state, coins: state.coins + amount })
}

export function buyItem(item: ShopItem) {
  if (state.coins < item.price) {
    showToast(`You need ${item.price - state.coins} more coins`)
    return
  }
  save({
    ...state,
    coins: state.coins - item.price,
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
  return useSyncExternalStore(subscribe, () => state)
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
