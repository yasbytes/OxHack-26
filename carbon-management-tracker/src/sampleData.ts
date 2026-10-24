// Placeholder numbers shared by Home and Insights so they agree with each other.
// Swap these for backend data once emissions are calculated.

export const YEAR_TONNES = 5.6
// The yearly footprint the user has to stay under (UK average is about 10 t)
export const LIMIT_TONNES = 6
export const WEEKLY_BUDGET_KG = Math.round((LIMIT_TONNES * 1000) / 52)

// Last 8 weeks, oldest first; the final week is this week
export const WEEKLY_KG = [92, 128, 110, 105, 134, 98, 121, 100]
export const WEEK_KG = WEEKLY_KG[WEEKLY_KG.length - 1]

// Last 4 weeks split by section
export const CATEGORY_KG = [
  { id: 'travel', label: 'Travel & Transport', kg: 210 },
  { id: 'energy', label: 'Home & Energy', kg: 148 },
  { id: 'food', label: 'Food & Diet', kg: 95 },
] as const

export const COINS = 120
