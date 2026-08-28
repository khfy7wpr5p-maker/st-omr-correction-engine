import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, detectOnsetAnomalies } from '../src/index.js'

test('serialization order is not treated as musical onset authority', () => {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  const result = detectOnsetAnomalies([measure], [
    createScoreEvent({ id: 'late', measureKey: '1', onset: 3, duration: 1, voice: 1, staff: 1 }),
    createScoreEvent({ id: 'early', measureKey: '1', onset: 1, duration: 1, voice: 1, staff: 1 }),
  ])
  assert.equal(result.serializationOrderIsAuthority, false)
  assert.deepEqual(result.findings, [])
  assert.deepEqual(result.proposedPatches, [])
})

test('chord tones must share the anchor musical onset when explicitly linked', () => {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  const result = detectOnsetAnomalies([measure], [
    createScoreEvent({ id: 'anchor', measureKey: '1', onset: 1, duration: 1, voice: 1, staff: 1 }),
    createScoreEvent({ id: 'tone', measureKey: '1', onset: 1.5, duration: 1, voice: 1, staff: 1, isChordTone: true, metadata: { chordAnchorId: 'anchor' } }),
  ])
  assert.equal(result.findings.some((item) => item.code === 'CHORD_TONE_ONSET_MISMATCH'), true)
  assert.deepEqual(result.proposedPatches, [])
})

test('only explicit expected-onset evidence can flag displacement beyond boundary checks', () => {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  const result = detectOnsetAnomalies([measure], [
    createScoreEvent({ id: 'n', measureKey: '1', onset: 2, duration: 1, voice: 1, staff: 1, metadata: { expectedOnsetQuarterBeats: 1.5 } }),
    createScoreEvent({ id: 'g', measureKey: '1', onset: 2, duration: 0, voice: 1, staff: 1, metadata: { grace: true } }),
    createScoreEvent({ id: 't', measureKey: '1', onset: 2.5, duration: 0.5, voice: 1, staff: 1, metadata: { tuplet: { actualNotes: 3, normalNotes: 2 } } }),
  ])
  assert.equal(result.findings.filter((item) => item.code === 'EXPLICIT_ONSET_MISMATCH').length, 1)
  assert.equal(result.findings[0].eventId, 'n')
})
