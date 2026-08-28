import test from 'node:test'
import assert from 'node:assert/strict'
import {
  POLYPHONIC_ERROR_CLASS,
  POLYPHONIC_ERROR_TAXONOMY_VERSION,
  createErrorTaxonomyRef,
  isPolyphonicErrorClass,
} from '../src/index.js'

test('polyphonic error taxonomy is versioned and complete', () => {
  assert.equal(POLYPHONIC_ERROR_TAXONOMY_VERSION, '1.0.0')
  for (const errorClass of [
    'PITCH', 'DURATION', 'ONSET', 'VOICE', 'STAFF', 'REST', 'ACCIDENTAL', 'TIE', 'SLUR', 'TUPLET',
    'BEAM', 'STEM', 'CHORD_GROUPING', 'CROSS_STAFF', 'METER', 'MEASURE_BOUNDARY', 'GRACE', 'ORNAMENT', 'OTHER', 'AMBIGUOUS',
  ]) {
    assert.equal(POLYPHONIC_ERROR_CLASS[errorClass], errorClass)
    assert.equal(isPolyphonicErrorClass(errorClass), true)
  }
})

test('taxonomy refs reject unknown classes and preserve version', () => {
  const ref = createErrorTaxonomyRef(POLYPHONIC_ERROR_CLASS.VOICE)
  assert.deepEqual(ref, { errorClass: 'VOICE', taxonomyVersion: '1.0.0' })
  assert.throws(() => createErrorTaxonomyRef('UNKNOWN'), /Unsupported/)
})
