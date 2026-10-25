import { useSyncExternalStore } from 'react'

// Front end only: the profile lives in this browser until auth and the backend exist

export const DIETS = [
  { id: 'meat', label: 'I eat meat and plant foods', food: 'other_meat' },
  { id: 'pescatarian', label: 'I eat fish, but not meat', food: 'fish' },
  { id: 'vegetarian', label: "I don't eat meat or fish", food: 'vegetarian' },
  { id: 'vegan', label: 'I eat plant-based foods only', food: 'vegan' },
] as const
export type Diet = (typeof DIETS)[number]['id']

export type Profile = {
  name: string
  email: string
  household: number
  diet: Diet
  // The monthly footprint from travel, home energy and food the user has to stay under
  monthlyLimitKg: number
}

// The average UK person's travel, home energy and food, the parts this app
// tracks: about 5,480 kg a year (Defra 2023, ANNUAL_BASE_KG in backend/app/factors.py).
// The whole UK footprint is about 10 t, but most of it is shopping and services.
export const UK_AVERAGE_MONTHLY_KG = 456
// Everyone aims at least 20% below average, and at most 90% below (MIN_REDUCTION
// and MAX_REDUCTION in factors.py)
export const MAX_MONTHLY_LIMIT_KG = Math.round(UK_AVERAGE_MONTHLY_KG * 0.8)
export const MIN_MONTHLY_LIMIT_KG = Math.round(UK_AVERAGE_MONTHLY_KG * 0.1)

const DEFAULT_PROFILE: Profile = {
  name: '',
  email: '',
  household: 1,
  diet: 'meat',
  monthlyLimitKg: MAX_MONTHLY_LIMIT_KG,
}

const STORAGE_KEY = 'profile'

function load(): Profile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_PROFILE
    const parsed = JSON.parse(saved) as Partial<Profile> & { limitTonnes?: number }
    // Profiles saved before the limit went monthly stored a yearly figure in tonnes
    if (parsed.monthlyLimitKg === undefined && parsed.limitTonnes !== undefined) {
      parsed.monthlyLimitKg = Math.round((parsed.limitTonnes * 1000) / 12)
    }
    delete parsed.limitTonnes
    if (parsed.monthlyLimitKg !== undefined) {
      parsed.monthlyLimitKg = Math.min(
        Math.max(parsed.monthlyLimitKg, MIN_MONTHLY_LIMIT_KG),
        MAX_MONTHLY_LIMIT_KG,
      )
    }
    return { ...DEFAULT_PROFILE, ...parsed }
  } catch {
    return DEFAULT_PROFILE
  }
}

let profile = load()

export function getProfile() {
  return profile
}
const listeners = new Set<() => void>()

export function updateProfile(changes: Partial<Profile>) {
  profile = { ...profile, ...changes }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Storage can be blocked (private windows); the profile still works for this visit
  }
  listeners.forEach((l) => l())
}

// "sam.jones@…" → "Sam", for people who log in without registering a name
export function nameFromEmail(email: string) {
  const first = email.split('@')[0].split(/[._-]/)[0]
  return first ? first[0].toUpperCase() + first.slice(1) : ''
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProfile() {
  return useSyncExternalStore(subscribe, () => profile)
}

// The cat works weekly and the year chart works yearly, so both are derived
// from the monthly limit the user sets
export function useLimits() {
  const { monthlyLimitKg } = useProfile()
  return {
    monthlyLimitKg,
    weeklyBudgetKg: Math.round((monthlyLimitKg * 12) / 52),
    limitTonnes: Math.round(monthlyLimitKg * 12) / 1000,
  }
}
