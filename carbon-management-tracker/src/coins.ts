import type { LogItem } from './logStore.ts'
import { dailyShares } from './footprint.ts'
import { localDate } from './dates.ts'
import { UK_AVERAGE_MONTHLY_KG } from './profileStore.ts'

// Coins reward staying under budget, following the Rewards section of
// backend/app/factors.py. They're worked out from the log rather than handed
// out per entry, so deleting and re-logging something earns nothing extra.

export const START_COINS = 120
const COINS_PER_KG = 5 // per kg below the daily budget
export const BASE_MAX_COINS_PER_DAY = 30
export const BASE_MONTH_BONUS = 100
const STRETCH_MULTIPLIER_SLOPE = 2
const MIN_LOGGED_DAYS_SHARE = 0.8

// Tougher limits earn more: 1× at 20% below the average, 2.4× at 90% below
export function rewardMultiplier(monthlyLimitKg: number) {
  const reduction = Math.min(Math.max(1 - monthlyLimitKg / UK_AVERAGE_MONTHLY_KG, 0.2), 0.9)
  return 1 + (reduction - 0.2) * STRETCH_MULTIPLIER_SLOPE
}

export function dailyBudgetKg(monthlyLimitKg: number) {
  return (monthlyLimitKg * 12) / 365
}

// Only finished days count, so a day's coins can't be grabbed with one small
// entry in the morning. A day counts once it has at least one entry.
export function coinsEarned(log: LogItem[], monthlyLimitKg: number, now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayKey = localDate(today)
  const multiplier = rewardMultiplier(monthlyLimitKg)
  const budget = dailyBudgetKg(monthlyLimitKg)

  // kg per day, keyed by date, with bills spread over the days they cover
  const kgByDay = new Map<string, number>()
  for (const item of log) {
    for (const [ago, kg] of dailyShares(item, today)) {
      const day = new Date(today)
      day.setDate(day.getDate() - ago)
      const key = localDate(day)
      kgByDay.set(key, (kgByDay.get(key) ?? 0) + kg)
    }
  }
  // Unknown estimates are not zero emissions and cannot earn under-budget rewards.
  const loggedDays = new Set(log.filter((item) => item.kg !== null).map((item) => item.date).filter((date) => date < todayKey))

  let coins = 0
  for (const day of loggedDays) {
    const saved = Math.max(0, budget - (kgByDay.get(day) ?? 0))
    coins += Math.min(saved * COINS_PER_KG, BASE_MAX_COINS_PER_DAY) * multiplier
  }

  // Month-end bonus for a finished month under the limit, logged on most days
  const months = new Set([...loggedDays].map((day) => day.slice(0, 7)))
  for (const month of months) {
    if (month >= todayKey.slice(0, 7)) continue
    const [year, monthIndex] = month.split('-').map(Number)
    const daysInMonth = new Date(year, monthIndex, 0).getDate()
    const logged = [...loggedDays].filter((day) => day.startsWith(month)).length
    let monthKg = 0
    for (const [day, kg] of kgByDay) if (day.startsWith(month)) monthKg += kg
    if (logged >= daysInMonth * MIN_LOGGED_DAYS_SHARE && monthKg <= monthlyLimitKg) {
      coins += BASE_MONTH_BONUS * multiplier
    }
  }

  return Math.floor(coins)
}
