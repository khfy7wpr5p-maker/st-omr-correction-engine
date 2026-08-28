import { genericScoreProfile } from './genericScoreProfile.js'
import { classicalGuitarProfile } from './classicalGuitarProfile.js'
import { pianoProfile } from './pianoProfile.js'

const profiles = Object.freeze({
  [genericScoreProfile.id]: genericScoreProfile,
  [classicalGuitarProfile.id]: classicalGuitarProfile,
  [pianoProfile.id]: pianoProfile,
})

export function getInstrumentProfile(id = 'generic') {
  const profile = profiles[id]
  if (!profile) throw new TypeError(`Unknown instrument profile: ${id}`)
  return profile
}

export { genericScoreProfile, classicalGuitarProfile, pianoProfile }
