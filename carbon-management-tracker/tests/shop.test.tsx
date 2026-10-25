import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../src/toast', () => ({ showToast: vi.fn() }))
import { addLogItem, setLogUser } from '../src/logStore'
import { buyItem, feedItem, setShopUser, SHOP_ITEMS, useFed, useShop } from '../src/shopStore'

function savedShop() {
  return JSON.parse(localStorage.getItem('shop:alice') ?? '{}') as { owned: { treats: number } }
}
import { fedMood, MOODS } from '../src/pet'
import { localDate } from '../src/dates'

const [treats, bowl] = SHOP_ITEMS

beforeEach(() => { setShopUser('alice'); setLogUser('alice') })
afterEach(() => { cleanup(); setShopUser(null); setLogUser(null); localStorage.clear() })

it('buys food with coins and feeds it to the cat', () => {
  const { result } = renderHook(() => ({ shop: useShop(), fed: useFed() }))
  expect(result.current.shop.coins).toBe(120)
  act(() => buyItem(treats))
  expect(result.current.shop.coins).toBe(105)
  expect(result.current.shop.owned.treats).toBe(1)
  expect(result.current.fed.fed).toBe(false)
  act(() => feedItem(treats, 'Tom'))
  expect(result.current.shop.owned.treats).toBe(0)
  expect(result.current.shop.fedUntil).toBeGreaterThan(Date.now())
})

it("won't spend coins you don't have", () => {
  const { result } = renderHook(useShop)
  act(() => { buyItem(bowl); buyItem(bowl); buyItem(bowl); buyItem(bowl) })
  expect(result.current.owned.bowl).toBe(3)
  expect(result.current.coins).toBe(0)
})

it('earns coins for finished days under budget and keeps a wallet per account', () => {
  const { result } = renderHook(useShop)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  act(() => addLogItem({ kind: 'travel', date: localDate(yesterday), title: 'Bike', detail: '', kg: 0 }))
  expect(result.current.coins).toBe(150)
  // Today's entries wait until the day is over
  act(() => addLogItem({ kind: 'travel', date: localDate(), title: 'Walk', detail: '', kg: 0 }))
  expect(result.current.coins).toBe(150)
  act(() => setShopUser('bob'))
  act(() => setLogUser('bob'))
  expect(result.current.coins).toBe(120)
  act(() => setShopUser('alice'))
  act(() => setLogUser('alice'))
  expect(result.current.coins).toBe(150)
})

it('a meal lifts the mood one level, but not past thriving', () => {
  expect(fedMood(MOODS[2], true)).toBe(MOODS[1])
  expect(fedMood(MOODS[0], true)).toBe(MOODS[0])
  expect(fedMood(MOODS[2], false)).toBe(MOODS[2])
  // A collapsed cat is healed to okay whenever it's fed
  expect(fedMood(MOODS[4], true)).toBe(MOODS[1])
  expect(fedMood(MOODS[4], false)).toBe(MOODS[4])
})

it('food heals a collapsed cat every time', () => {
  const { result } = renderHook(useFed)
  act(() => { buyItem(treats); buyItem(treats) })
  // Way over this week's budget
  act(() => addLogItem({ kind: 'travel', date: localDate(), title: 'Flight', detail: '', kg: 1000 }))
  act(() => feedItem(treats, 'Tom'))
  expect(result.current.fed).toBe(true)
  // A second meal works too and tops up the time
  act(() => feedItem(treats, 'Tom'))
  expect(savedShop().owned.treats).toBe(0)
  // Two 6-hour treats, give or take the few ms the test takes
  expect(savedShop().fedUntil - Date.now()).toBeGreaterThan(11.99 * 3_600_000)
})
