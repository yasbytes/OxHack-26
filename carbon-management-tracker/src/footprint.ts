import { useLog, type LogItem } from './logStore.ts'
import { daysBetween } from './dates.ts'

export const CATEGORIES = [
  { id: 'travel', label: 'Travel & Transport' },
  { id: 'energy', label: 'Home & Energy' },
  { id: 'food', label: 'Food & Diet' },
] as const
export type CategoryId = (typeof CATEGORIES)[number]['id']

function startOfDay(date: Date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

// Whole days between an entry's date and today (0 = today)
export function daysAgo(date: string, today: Date) {
  return daysBetween(new Date(`${date}T00:00`), today)
}

// Each entry's kg spread across the days it covers, as [daysAgo, kg] pairs.
// A monthly bill counts a 30th per day so one bill doesn't swamp a single week.
export function dailyShares(item: LogItem, today: Date): [number, number][] {
  if (item.kg === null) return []
  const days = item.spreadDays ?? 1
  const end = daysAgo(item.date, today)
  return Array.from({ length: days }, (_, i) => [end + i, item.kg! / days])
}

// Every figure comes from what's been logged; nothing is made up
export function footprintFor(log: LogItem[], now = new Date()) {
  const today = startOfDay(now)
  const dayOfYear = daysBetween(new Date(today.getFullYear(), 0, 1), today)
  const daysInYear = daysBetween(
    new Date(today.getFullYear(), 0, 1),
    new Date(today.getFullYear() + 1, 0, 1),
  )
  const dayOfMonth = today.getDate()

  // Last 8 weeks, oldest first; the final one is the last 7 days
  const weeklyKg = Array<number>(8).fill(0)
  const categoryKg = CATEGORIES.map((c) => ({ ...c, kg: 0 }))
  let monthKg = 0
  let yearKg = 0
  // The earliest day this year with anything logged, so the pace isn't diluted
  // by the months before someone started using the app
  let firstAgo = -1

  for (const item of log) {
    const category = categoryKg.find((c) => c.id === item.kind)
    for (const [ago, kg] of dailyShares(item, today)) {
      if (ago < 0) continue
      const week = Math.floor(ago / 7)
      if (week < weeklyKg.length) weeklyKg[weeklyKg.length - 1 - week] += kg
      if (category && ago < 28) category.kg += kg
      if (ago < dayOfMonth) monthKg += kg
      if (ago <= dayOfYear) {
        yearKg += kg
        firstAgo = Math.max(firstAgo, ago)
      }
    }
  }

  const daysTracked = firstAgo + 1
  const paceKgPerDay = daysTracked > 0 ? yearKg / daysTracked : 0
  const daysLeft = daysInYear - dayOfYear - 1

  return {
    yearTonnes: yearKg / 1000,
    projectedTonnes: (yearKg + paceKgPerDay * daysLeft) / 1000,
    paceKgPerDay,
    monthKg,
    weekKg: weeklyKg[weeklyKg.length - 1],
    weeklyKg: weeklyKg.map((kg) => Math.round(kg)),
    categoryKg: categoryKg.map((c) => ({ ...c, kg: Math.round(c.kg) })),
  }
}

export function useFootprint() {
  return footprintFor(useLog())
}
