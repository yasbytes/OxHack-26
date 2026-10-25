import type { LogItem } from './logStore.ts'
//this is for the insights
const DAY_MS = 86_400_000

export type ChartPoint = { day: number; tonnes: number; projected: boolean; note?: string }
export type MonthRow = { label: string; kg: number; runningKg: number; projected: boolean }
export type YearData = {
  year: number
  daysInYear: number
  daysElapsed: number
  daysLeft: number
  windowDays: number
  dailyAvgKg: number
  soFarKg: number
  projectedKg: number
  months: MonthRow[]
  points: ChartPoint[]
}

// Real log entries only. `day` on a point means "days elapsed at the end of that day",
// so 0 = start of 1 Jan and daysInYear = end of 31 Dec.
export function buildYear(log: LogItem[], now: Date = new Date(), maxWindow = 90): YearData {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const year = today.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const dayIndex = (d: Date) => Math.round((d.getTime() - jan1.getTime()) / DAY_MS)
  const daysInYear = dayIndex(new Date(year + 1, 0, 1))
  const daysElapsed = dayIndex(today) + 1
  const daysLeft = daysInYear - daysElapsed

  // kg for every day of the year so far (bills are spread back over their days, like footprint.ts)
  const perDay = new Array<number>(daysInYear).fill(0)
  for (const item of log) {
    if (item.kg === null) continue
    const span = item.spreadDays ?? 1
    const entry = new Date(`${item.date}T00:00`)
    for (let i = 0; i < span; i++) {
      const idx = dayIndex(new Date(entry.getFullYear(), entry.getMonth(), entry.getDate() - i))
      if (idx >= 0 && idx < daysElapsed) perDay[idx] += item.kg / span
    }
  }
  const sum = (from: number, to: number) => {
    let total = 0
    for (let i = Math.max(from, 0); i <= Math.min(to, daysInYear - 1); i++) total += perDay[i]
    return total
  }

  const soFarKg = sum(0, daysElapsed - 1)
  // Average over the days since the first logged entry (at least 30, at most 90),
  // so a new user isn't diluted by empty days
  const firstIdx = perDay.findIndex((kg) => kg > 0)
  const dataDays = firstIdx === -1 ? daysElapsed : daysElapsed - firstIdx
  const windowDays = Math.min(daysElapsed, Math.max(30, Math.min(maxWindow, dataDays)))
  const dailyAvgKg = sum(daysElapsed - windowDays, daysElapsed - 1) / windowDays
  const projectedKg = soFarKg + dailyAvgKg * daysLeft

  const months: MonthRow[] = []
  const points: ChartPoint[] = [{ day: 0, tonnes: 0, projected: false }]
  let running = 0

  for (let m = 0; m < 12; m++) {
    const first = dayIndex(new Date(year, m, 1))
    const last = dayIndex(new Date(year, m + 1, 0))
    const label = new Date(year, m, 1).toLocaleDateString(undefined, { month: 'short' })
    const actualKg = sum(first, Math.min(last, daysElapsed - 1))
    const futureDays = Math.max(0, last - Math.max(first, daysElapsed) + 1)
    const kg = actualKg + dailyAvgKg * futureDays
    running += kg
    months.push({ label, kg, runningKg: running, projected: futureDays > 0 })

    const pos = last + 1
    if (pos <= daysElapsed) {
      points.push({ day: pos, tonnes: running / 1000, projected: false, note: `${label}: ${Math.round(kg)} kg` })
    } else {
      if (first < daysElapsed) {
        // The current month: mark today before the projection carries on
        points.push({
          day: daysElapsed,
          tonnes: soFarKg / 1000,
          projected: false,
          note: `${label} so far: ${Math.round(actualKg)} kg`,
        })
      }
      points.push({ day: pos, tonnes: running / 1000, projected: true, note: `${label}: about ${Math.round(kg)} kg` })
    }
  }

  return { year, daysInYear, daysElapsed, daysLeft, windowDays, dailyAvgKg, soFarKg, projectedKg, months, points }
}
