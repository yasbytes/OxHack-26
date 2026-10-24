// Placeholder numbers shared by Home and Insights so they agree with each other.
// Swap these for backend data once emissions are calculated.

export const YEAR_TONNES = 5.6
// The yearly limit and weekly budget come from the profile (profileStore.ts)

// Last 8 weeks, oldest first; the final week is this week
export const WEEKLY_KG = [92, 128, 110, 105, 134, 98, 121, 100]

// Last 4 weeks split by section
export const CATEGORY_KG = [
  { id: 'travel', label: 'Travel & Transport', kg: 210 },
  { id: 'energy', label: 'Home & Energy', kg: 148 },
  { id: 'food', label: 'Food & Diet', kg: 95 },
] as const

export const COINS = 120
