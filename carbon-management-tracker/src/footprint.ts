import { useLog, type LogItem } from './logStore.ts'
import { CATEGORY_KG, WEEKLY_KG, YEAR_TONNES } from './sampleData.ts'

const DAY_MS = 86_400_000

// Whole days between an entry's date and today (0 = today)
function daysAgo(date: string, today: Date) {
  return Math.round((today.getTime() - new Date(`${date}T00:00`).getTime()) / DAY_MS)
}

// Each entry's kg spread across the days it covers, as [daysAgo, kg] pairs.
// A monthly bill counts a 30th per day so one bill doesn't swamp a single week.
function dailyShares(item: LogItem, today: Date): [number, number][] {
  if (item.kg === null) return []
  const days = item.spreadDays ?? 1
  const end = daysAgo(item.date, today)
  return Array.from({ length: days }, (_, i) => [end + i, item.kg! / days])
}

// Sample numbers plus everything logged, so logging moves every figure
export function useFootprint() {
  const log = useLog()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weeklyKg = [...WEEKLY_KG]
  const categoryKg = CATEGORY_KG.map((c) => ({ ...c, kg: c.kg as number }))
  let yearKg = YEAR_TONNES * 1000

  for (const item of log) {
    const category = categoryKg.find((c) => c.id === item.kind)
    for (const [ago, kg] of dailyShares(item, today)) {
      if (ago < 0) continue
      const week = Math.floor(ago / 7)
      if (week < weeklyKg.length) weeklyKg[weeklyKg.length - 1 - week] += kg
      if (category && ago < 28) category.kg += kg
      if (ago <= dayOfYear(today)) yearKg += kg
    }
  }

  return {
    yearTonnes: yearKg / 1000,
    weekKg: weeklyKg[weeklyKg.length - 1],
    weeklyKg: weeklyKg.map((kg) => Math.round(kg)),
    categoryKg: categoryKg.map((c) => ({ ...c, kg: Math.round(c.kg) })),
  }
}

function dayOfYear(today: Date) {
  return Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / DAY_MS)
}
