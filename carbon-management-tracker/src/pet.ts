import thrivingCat from './assets/pet/cat-thriving.png'
import okayCat from './assets/pet/cat-okay.png'
import worriedCat from './assets/pet/cat-worried.png'
import miserableCat from './assets/pet/cat-miserable.png'
import sickCat from './assets/pet/cat-sick.png'
import thrivingVoice from './assets/pet/voice/thriving.mp3'
import okayVoice from './assets/pet/voice/okay.mp3'
import worriedVoice from './assets/pet/voice/worried.mp3'
import miserableVoice from './assets/pet/voice/miserable.mp3'

// Mood comes from the last 7 days against a weekly budget, so a good few days
// let the pet recover. The thresholds are fractions of the budget. `says` is
// what the cat speaks when clicked, and `voice` the recording of it (made by
// backend/app/voice.py); a collapsed cat has nothing to say.
export const MOODS = [
  { id: 'thriving', label: 'Thriving', max: 0.75, image: thrivingCat, message: 'is loving life!', says: "Thank you for saving the planet!", voice: thrivingVoice },
  { id: 'okay', label: 'Okay', max: 1, image: okayCat, message: 'is doing okay.', says: "You're doing the bare minimum but thank you!", voice: okayVoice },
  { id: 'worried', label: 'Worried', max: 1.3, image: worriedCat, message: 'is getting worried…', says: "I don't feel too good", voice: worriedVoice },
  { id: 'miserable', label: 'Miserable', max: 1.75, image: miserableCat, message: 'is miserable.', says: "Please don't kill me", voice: miserableVoice },
  { id: 'sick', label: 'Sick', max: Infinity, image: sickCat, message: 'has collapsed.', says: null, voice: null },
] as const
export type Mood = (typeof MOODS)[number]

export function moodFor(weekKg: number, budgetKg: number): Mood {
  const ratio = weekKg / budgetKg
  return MOODS.find((m) => ratio < m.max) ?? MOODS[MOODS.length - 1]
}

// A recent meal lifts the mood one level, but never past thriving. A collapsed
// cat is revived all the way to okay, every time it's fed.
export function fedMood(mood: Mood, fed: boolean): Mood {
  if (!fed) return mood
  if (mood.id === 'sick') return MOODS[1]
  return MOODS[Math.max(0, MOODS.indexOf(mood) - 1)]
}
