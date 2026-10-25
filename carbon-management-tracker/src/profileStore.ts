import { useSyncExternalStore } from 'react'
import { cloudFor, fetchSoon, pushChange, reportSyncError } from './cloud.ts'

// One profile per account: cached in this browser and, for real accounts, kept
// in the profiles table

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
  petName: string
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
  petName: '',
}

// Saved before profiles were kept per account; the first account to log in on
// this browser takes them over
const LEGACY_KEY = 'profile'
const LEGACY_PET_NAME_KEY = 'pet-name'

type ProfileRow = {
  name: string
  household: number
  diet: Diet
  monthly_limit_kg: number
  pet_name: string
}

function toRow(p: Profile): ProfileRow {
  return {
    name: p.name,
    household: p.household,
    diet: p.diet,
    monthly_limit_kg: p.monthlyLimitKg,
    pet_name: p.petName,
  }
}

function clean(parsed: Partial<Profile> & { limitTonnes?: number }): Profile {
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
  if (parsed.household !== undefined) {
    parsed.household = Math.min(Math.max(Math.round(parsed.household) || 1, 1), 20)
  }
  return { ...DEFAULT_PROFILE, ...parsed }
}

let userId: string | null = null
let storageKey: string | null = null

function readLegacy(): Profile | null {
  const saved = localStorage.getItem(LEGACY_KEY)
  const petName = localStorage.getItem(LEGACY_PET_NAME_KEY)
  if (saved === null && petName === null) return null
  localStorage.removeItem(LEGACY_KEY)
  localStorage.removeItem(LEGACY_PET_NAME_KEY)
  return clean({ ...(saved ? JSON.parse(saved) : {}), ...(petName ? { petName } : {}) })
}

function load(): Profile {
  if (!storageKey) return DEFAULT_PROFILE
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) return clean(JSON.parse(saved))
    const legacy = readLegacy()
    if (legacy) localStorage.setItem(storageKey, JSON.stringify(legacy))
    return legacy ?? DEFAULT_PROFILE
  } catch {
    return DEFAULT_PROFILE
  }
}

let profile = load()

export function getProfile() {
  return profile
}
const listeners = new Set<() => void>()

function save(next: Profile) {
  profile = next
  try {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(profile))
  } catch {
    // Storage can be blocked (private windows); the profile still works for this visit
  }
  listeners.forEach((l) => l())
}

export function setProfileUser(nextUserId: string | null) {
  const nextKey = nextUserId ? `profile:${nextUserId}` : null
  if (storageKey === nextKey) return
  userId = nextUserId
  storageKey = nextKey
  profile = load()
  listeners.forEach((l) => l())
  fetchSoon(pull)
}

// The account's saved profile wins; an account with none yet saves this browser's
async function pull() {
  const cloud = cloudFor(userId)
  if (!cloud) return
  const key = storageKey
  try {
    const { data, error } = await cloud.from('profiles').select('*').maybeSingle()
    if (error) throw error
    if (storageKey !== key) return
    if (!data) {
      if (profile !== DEFAULT_PROFILE) pushChange(userId, (c) => c.from('profiles').upsert(toRow(profile)))
      return
    }
    const row = data as ProfileRow
    save(clean({
      ...profile,
      name: row.name,
      household: row.household,
      diet: row.diet,
      monthlyLimitKg: row.monthly_limit_kg,
      petName: row.pet_name,
    }))
  } catch (error) {
    reportSyncError(error)
  }
}

export function updateProfile(changes: Partial<Profile>) {
  save({ ...profile, ...changes })
  const saved = profile
  pushChange(userId, (cloud) =>
    cloud.from('profiles').upsert({ ...toRow(saved), updated_at: new Date().toISOString() }),
  )
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
