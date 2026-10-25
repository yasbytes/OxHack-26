import lines from './petReactionLines.json'
import type { LogItem } from './logStore'
import meatVoice from './assets/pet/voice/reaction-meat.mp3'
import otherMeatVoice from './assets/pet/voice/reaction-other-meat.mp3'
import fishVoice from './assets/pet/voice/reaction-fish.mp3'
import meatFreeVoice from './assets/pet/voice/reaction-meat-free.mp3'
import foodVoice from './assets/pet/voice/reaction-food.mp3'
import walkVoice from './assets/pet/voice/reaction-walk.mp3'
import bikeVoice from './assets/pet/voice/reaction-bike.mp3'
import publicTransportVoice from './assets/pet/voice/reaction-public-transport.mp3'
import carVoice from './assets/pet/voice/reaction-car.mp3'
import flightVoice from './assets/pet/voice/reaction-flight.mp3'
import energyVoice from './assets/pet/voice/reaction-energy.mp3'
import loggedVoice from './assets/pet/voice/reaction-logged.mp3'

export type PetSpeech = { says: string; voice: string | null }
type ReactionId = keyof typeof lines
const recordings: Record<ReactionId, string> = {
  meat: meatVoice, 'other-meat': otherMeatVoice, fish: fishVoice,
  'meat-free': meatFreeVoice, food: foodVoice, walk: walkVoice, bike: bikeVoice,
  'public-transport': publicTransportVoice, car: carVoice, flight: flightVoice,
  energy: energyVoice, logged: loggedVoice,
}

function reactionId(entry: LogItem): ReactionId {
  if (entry.kind === 'food') {
    // Use the category selected in the form, not optional descriptions such as
    // "vegan beef burger", which can contain misleading ingredient keywords.
    const category = entry.title.split(':').at(-1)?.trim().toLowerCase()
    if (category === 'beef' || category === 'lamb') return 'meat'
    if (category === 'chicken / pork') return 'other-meat'
    if (category === 'fish / seafood') return 'fish'
    if (category === 'vegetarian' || category === 'vegan') return 'meat-free'
    return 'food'
  }
  if (entry.kind === 'travel') {
    const mode = entry.title.toLowerCase()
    if (mode === 'walk') return 'walk'
    if (mode === 'bicycle' || mode === 'bike') return 'bike'
    if (['train', 'bus / coach', 'bus', 'coach'].includes(mode)) return 'public-transport'
    if (mode === 'flight') return 'flight'
    if (mode.startsWith('car / motorbike')) return 'car'
  }
  if (entry.kind === 'energy') return 'energy'
  // Free-text/unknown entries get an acknowledgement, not an invented estimate.
  return 'logged'
}

export function reactionFor(entry: LogItem): PetSpeech {
  const id = reactionId(entry)
  return {
    says: lines[id],
    voice: recordings[id],
  }
}
