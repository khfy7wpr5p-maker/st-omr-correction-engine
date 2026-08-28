export const POLYPHONIC_ERROR_TAXONOMY_VERSION = '1.0.0'

export const POLYPHONIC_ERROR_CLASS = Object.freeze({
  PITCH: 'PITCH',
  DURATION: 'DURATION',
  ONSET: 'ONSET',
  VOICE: 'VOICE',
  STAFF: 'STAFF',
  REST: 'REST',
  ACCIDENTAL: 'ACCIDENTAL',
  TIE: 'TIE',
  SLUR: 'SLUR',
  TUPLET: 'TUPLET',
  BEAM: 'BEAM',
  STEM: 'STEM',
  CHORD_GROUPING: 'CHORD_GROUPING',
  CROSS_STAFF: 'CROSS_STAFF',
  METER: 'METER',
  MEASURE_BOUNDARY: 'MEASURE_BOUNDARY',
  GRACE: 'GRACE',
  ORNAMENT: 'ORNAMENT',
  OTHER: 'OTHER',
  AMBIGUOUS: 'AMBIGUOUS',
})

const ERROR_CLASSES = Object.freeze(Object.values(POLYPHONIC_ERROR_CLASS))

export function isPolyphonicErrorClass(value) {
  return ERROR_CLASSES.includes(value)
}

export function createErrorTaxonomyRef(errorClass, version = POLYPHONIC_ERROR_TAXONOMY_VERSION) {
  if (!isPolyphonicErrorClass(errorClass)) throw new TypeError('Unsupported polyphonic error class.')
  if (typeof version !== 'string' || !version.trim()) throw new TypeError('taxonomy version is required.')
  return Object.freeze({ errorClass, taxonomyVersion: version })
}
