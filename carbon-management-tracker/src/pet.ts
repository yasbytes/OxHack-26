import thrivingCat from './assets/pet/cat-thriving.png'
import okayCat from './assets/pet/cat-okay.png'
import worriedCat from './assets/pet/cat-worried.png'
import miserableCat from './assets/pet/cat-miserable.png'
import sickCat from './assets/pet/cat-sick.png'

// Mood comes from the last 7 days against a weekly budget, so a good few days
// let the pet recover. The thresholds are fractions of the budget.
export const MOODS = [
  { id: 'thriving', label: 'Thriving', max: 0.75, image: thrivingCat, message: 'is loving life!' },
  { id: 'okay', label: 'Okay', max: 1, image: okayCat, message: 'is doing okay.' },
  { id: 'worried', label: 'Worried', max: 1.3, image: worriedCat, message: 'is getting worried…' },
  { id: 'miserable', label: 'Miserable', max: 1.75, image: miserableCat, message: 'is miserable.' },
  { id: 'sick', label: 'Sick', max: Infinity, image: sickCat, message: 'has collapsed.' },
] as const
export type Mood = (typeof MOODS)[number]

export function moodFor(weekKg: number, budgetKg: number): Mood {
  const ratio = weekKg / budgetKg
  return MOODS.find((m) => ratio < m.max) ?? MOODS[MOODS.length - 1]
}

// A recent meal lifts the mood one level, but never past thriving
export function fedMood(mood: Mood, fed: boolean): Mood {
  if (!fed) return mood
  return MOODS[Math.max(0, MOODS.indexOf(mood) - 1)]
}
