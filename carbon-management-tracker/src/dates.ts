export const DAY_MS = 86_400_000

// YYYY-MM-DD in the person's own time zone. toISOString() would give the UTC
// date, which is a day out in the evening west of London or after midnight in summer.
export function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Whole days from one local midnight to another. Rounding absorbs the hour
// gained or lost when the clocks change.
export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}
