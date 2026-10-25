import thrivingCat from './assets/pet/cat-thriving.png'
import okayCat from './assets/pet/cat-okay.png'
import worriedCat from './assets/pet/cat-worried.png'
import miserableCat from './assets/pet/cat-miserable.png'
import sickCat from './assets/pet/cat-sick.png'

// Mood comes from the last 7 days against a weekly budget, so a good few days
// let the pet recover. The thresholds are fractions of the budget. `says` is
// what the cat speaks when clicked (the same lines as CAT_LINES in backend/app/voice.py);
// a collapsed cat has nothing to say.
export const MOODS = [
  { id: 'thriving', label: 'Thriving', max: 0.75, image: thrivingCat, message: 'is loving life!', says: "Thank you for saving the planet!" },
  { id: 'okay', label: 'Okay', max: 1, image: okayCat, message: 'is doing okay.', says: "You're doing the bare minimum but thank you!" },
  { id: 'worried', label: 'Worried', max: 1.3, image: worriedCat, message: 'is getting worried…', says: "I don't feel too good" },
  { id: 'miserable', label: 'Miserable', max: 1.75, image: miserableCat, message: 'is miserable.', says: "Please don't kill me" },
  { id: 'sick', label: 'Sick', max: Infinity, image: sickCat, message: 'has collapsed.', says: null },
] as const
export type Mood = (typeof MOODS)[number]

export function moodFor(weekKg: number, budgetKg: number): Mood {
  const ratio = weekKg / budgetKg
  return MOODS.find((m) => ratio < m.max) ?? MOODS[MOODS.length - 1]
}

// A recent meal lifts the mood one level, but never past thriving. A collapsed
// cat only comes round during its one revive (reviveUntil in shopStore.ts).
export function fedMood(mood: Mood, fed: boolean, reviving = false): Mood {
  if (mood.id === 'sick' ? !reviving : !fed) return mood
  return MOODS[Math.max(0, MOODS.indexOf(mood) - 1)]
}
