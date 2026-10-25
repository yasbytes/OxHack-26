import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../src/toast', () => ({ showToast: vi.fn() }))
import { addLogItem, setLogUser } from '../src/logStore'
import { buyItem, feedItem, setShopUser, SHOP_ITEMS, useFed, useShop } from '../src/shopStore'
import { fedMood, MOODS } from '../src/pet'

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

it('earns coins for logging and keeps a wallet per account', () => {
  const { result } = renderHook(useShop)
  act(() => addLogItem({ kind: 'travel', date: '2026-10-24', title: 'Bike', detail: '', kg: 0 }))
  expect(result.current.coins).toBe(130)
  act(() => setShopUser('bob'))
  expect(result.current.coins).toBe(120)
  act(() => setShopUser('alice'))
  expect(result.current.coins).toBe(130)
})

it('a meal lifts the mood one level, but not past thriving', () => {
  expect(fedMood(MOODS[2], true)).toBe(MOODS[1])
  expect(fedMood(MOODS[0], true)).toBe(MOODS[0])
  expect(fedMood(MOODS[2], false)).toBe(MOODS[2])
})
