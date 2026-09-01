export const MIDI_REFERENCE_SOURCE_TYPE = Object.freeze({
  TRUSTED_REFERENCE: 'TRUSTED_REFERENCE',
  USER_PROVIDED_REFERENCE: 'USER_PROVIDED_REFERENCE',
  AUDIO_DERIVED: 'AUDIO_DERIVED',
  UNKNOWN: 'UNKNOWN',
})

export const MIDI_SCORE_PITCH_DOMAIN = Object.freeze({
  SOUNDING: 'SOUNDING',
  WRITTEN: 'WRITTEN',
  UNKNOWN: 'UNKNOWN',
})

export const MIDI_COMPARISON_CODE = Object.freeze({
  EXACT_MATCH: 'MIDI_EXACT_MATCH',
  PITCH_MATCH: 'MIDI_PITCH_MATCH',
  PITCH_CONFLICT: 'MIDI_PITCH_CONFLICT',
  ONSET_CONFLICT: 'MIDI_ONSET_CONFLICT',
  DURATION_CONFLICT: 'MIDI_DURATION_CONFLICT',
  SCORE_NOTE_MISSING: 'MIDI_SCORE_NOTE_MISSING',
  EXTRA_NOTE: 'MIDI_EXTRA_NOTE',
  AMBIGUOUS_MATCH: 'MIDI_AMBIGUOUS_MATCH',
  UNALIGNED: 'MIDI_UNALIGNED',
  UNSUPPORTED_CONTEXT: 'MIDI_UNSUPPORTED_CONTEXT',
})

export function isMidiReferenceSourceType(value) {
  return Object.values(MIDI_REFERENCE_SOURCE_TYPE).includes(value)
}

export function isMidiScorePitchDomain(value) {
  return Object.values(MIDI_SCORE_PITCH_DOMAIN).includes(value)
}

export function isMidiComparisonCode(value) {
  return Object.values(MIDI_COMPARISON_CODE).includes(value)
}

export function createMidiReferenceDiagnostic({ code, location = null, details = null }) {
  if (!isMidiComparisonCode(code)) throw new TypeError('Unsupported MIDI comparison code.')
  const frozenLocation = location ? Object.freeze({ ...location }) : null
  const frozenDetails = details ? Object.freeze({ ...details }) : Object.freeze({})
  return Object.freeze({ code, location: frozenLocation, details: frozenDetails })
}
