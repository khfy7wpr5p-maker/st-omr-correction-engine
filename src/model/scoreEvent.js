function finiteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and non-negative.`)
}

export function createScoreEvent({ id, measureKey, onset, duration, voice = 1, staff = 1, pitch = null, isRest = false, isChordTone = false, metadata = null }) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('event id is required.')
  if (typeof measureKey !== 'string' || !measureKey.trim()) throw new TypeError('measureKey is required.')
  finiteNonNegative(onset, 'onset')
  finiteNonNegative(duration, 'duration')
  if (!Number.isInteger(voice) || voice < 1) throw new RangeError('voice must be a positive integer.')
  if (!Number.isInteger(staff) || staff < 1) throw new RangeError('staff must be a positive integer.')
  return Object.freeze({ id, measureKey, onset, duration, end: onset + duration, voice, staff, pitch, isRest: !!isRest, isChordTone: !!isChordTone, metadata })
}
