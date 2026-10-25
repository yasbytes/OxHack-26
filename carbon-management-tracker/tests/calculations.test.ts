import { afterEach, describe, expect, it, vi } from 'vitest'
import { billKg, foodKg, homeEstimateKg, travelKg } from '../src/estimates'
import { localDate } from '../src/dates'
import { footprintFor } from '../src/footprint'
import { coinsEarned, rewardMultiplier } from '../src/coins'
import type { LogItem } from '../src/logStore'

let n = 0
function entry(date: string, kg: number | null, extra: Partial<LogItem> = {}): LogItem {
  return { id: String(n++), kind: 'travel', date, title: '', detail: '', kg, loggedAt: 0, ...extra }
}
// Local dates relative to a fixed "now", so tests don't depend on the clock
function day(now: Date, offset: number) {
  const d = new Date(now)
  d.setDate(d.getDate() + offset)
  return localDate(d)
}

describe('estimates', () => {
  it('uses the distance for every travel mode', () => {
    expect(travelKg({ mode: 'flight', fuelType: null, distance: 5600, unit: 'km' })).toBeCloseTo(840)
    expect(travelKg({ mode: 'train', fuelType: null, distance: 100, unit: 'km' })).toBeCloseTo(3.5)
    expect(travelKg({ mode: 'bicycle', fuelType: null, distance: 10, unit: 'km' })).toBe(0)
    expect(travelKg({ mode: 'car', fuelType: 'Petrol', distance: 10, unit: 'mi' })).toBeCloseTo(2.736, 2)
  })

  it('follows the grid for electric cars, as factors.py does', () => {
    expect(travelKg({ mode: 'car', fuelType: 'Electric', distance: 100, unit: 'km' })).toBeCloseTo(2.62)
  })

  it('converts LPG litres with LPG energy content, not oil', () => {
    expect(billKg('lpg', 100, 'litres', 1, 30)).toBeCloseTo(100 * 7.1 * 0.214)
    expect(billKg('oil', 100, 'litres', 1, 30)).toBeCloseTo(100 * 10.3 * 0.247)
  })

  it('takes the standing charge off a £ bill and splits it between people', () => {
    // £60 of gas for a month: £9.60 of it is the standing charge
    expect(billKg('gas', 60, '£', 1, 30)).toBeCloseTo(((60 - 9.6) / 0.06) * 0.183)
    expect(billKg('gas', 60, '£', 2, 30)).toBeCloseTo(((60 - 9.6) / 0.06) * 0.183 / 2)
    // A bill smaller than the standing charge used no energy, rather than negative energy
    expect(billKg('electricity', 5, '£', 1, 30)).toBe(0)
  })

  it('estimates a typical home with the 2026 grid factor', () => {
    expect(homeEstimateKg('Semi-detached house', '3', 'Gas boiler', 1)).toBeCloseTo(
      (2700 * 0.131 + 11500 * 0.183) / 12,
    )
  })

  it('puts vegetarian meals below meat', () => {
    expect(foodKg('vegetarian', 'Dinner', 1)).toBeLessThan(foodKg('other_meat', 'Dinner', 1))
  })
})

describe('dates', () => {
  afterEach(() => { vi.useRealTimers() })

  it("uses the person's own date, not the UTC one", () => {
    vi.useFakeTimers()
    // Just after midnight in summer: in the UK (and anywhere east of London) the
    // UTC date is still the day before
    vi.setSystemTime(new Date(2026, 6, 1, 0, 30))
    expect(localDate()).toBe('2026-07-01')
  })
})

describe('footprint', () => {
  const now = new Date(2026, 6, 1, 12)

  it('starts from zero with nothing logged', () => {
    const f = footprintFor([], now)
    expect(f.yearTonnes).toBe(0)
    expect(f.projectedTonnes).toBe(0)
    expect(f.weekKg).toBe(0)
  })

  it('counts 1 January in the year total after the clocks change', () => {
    expect(footprintFor([entry('2026-01-01', 10)], now).yearTonnes).toBeCloseTo(0.01)
  })

  it("projects from the pace since logging began, not since 1 January", () => {
    // 10 kg a day for the last 10 days (today included)
    const log = Array.from({ length: 10 }, (_, i) => entry(day(now, -i), 10))
    const f = footprintFor(log, now)
    expect(f.paceKgPerDay).toBeCloseTo(10)
    // 100 kg so far plus 10 kg for each of the 183 days left in 2026
    expect(f.projectedTonnes).toBeCloseTo((100 + 10 * 183) / 1000)
  })

  it('spreads a bill over the days it covers', () => {
    const f = footprintFor([entry(day(now, 0), 70, { kind: 'energy', spreadDays: 7 })], now)
    expect(f.weekKg).toBeCloseTo(70)
    expect(f.categoryKg.find((c) => c.id === 'energy')?.kg).toBe(70)
  })
})

describe('coins', () => {
  const now = new Date(2026, 9, 25, 9)
  const limit = 365 // 12 kg a day

  it('pays for finished days under budget, capped at 30', () => {
    expect(coinsEarned([entry(day(now, -1), 0)], limit, now)).toBe(30)
    // 2 kg under budget: 2 × 5 coins
    expect(coinsEarned([entry(day(now, -1), 10)], limit, now)).toBe(10)
    expect(coinsEarned([entry(day(now, -1), 50)], limit, now)).toBe(0)
  })

  it("doesn't pay for today yet, or for days with nothing logged", () => {
    expect(coinsEarned([entry(day(now, 0), 0)], limit, now)).toBe(0)
    expect(coinsEarned([], limit, now)).toBe(0)
  })

  it("can't be farmed by logging the same day over and over", () => {
    const once = coinsEarned([entry(day(now, -1), 1)], limit, now)
    const many = coinsEarned(Array.from({ length: 5 }, () => entry(day(now, -1), 1)), limit, now)
    expect(many).toBeLessThanOrEqual(once)
  })

  it('adds a month bonus for a finished month logged on most days and under the limit', () => {
    const september = Array.from({ length: 30 }, (_, i) =>
      entry(`2026-09-${String(i + 1).padStart(2, '0')}`, 5),
    )
    // 30 days × min(7 kg saved × 5, 30) + 100 bonus
    expect(coinsEarned(september, limit, now)).toBe(30 * 30 + 100)
    // Logged on too few days: no bonus
    expect(coinsEarned(september.slice(0, 20), limit, now)).toBe(20 * 30)
  })

  it('rewards tougher limits more', () => {
    expect(rewardMultiplier(365)).toBeCloseTo(1)
    expect(rewardMultiplier(46)).toBeCloseTo(2.4, 1)
  })
})

describe('monthly limit', () => {
  afterEach(() => { localStorage.clear(); vi.resetModules() })

  it('pulls limits saved under the old 830 kg average down to 20% below the real one', async () => {
    localStorage.setItem('profile', JSON.stringify({ monthlyLimitKg: 830 }))
    vi.resetModules()
    const { getProfile, setProfileUser, MAX_MONTHLY_LIMIT_KG } = await import('../src/profileStore')
    setProfileUser('alice')
    expect(MAX_MONTHLY_LIMIT_KG).toBe(365)
    expect(getProfile().monthlyLimitKg).toBe(365)
  })

  it('starts new profiles at the most allowed', async () => {
    vi.resetModules()
    const { getProfile } = await import('../src/profileStore')
    expect(getProfile().monthlyLimitKg).toBe(365)
  })
})
