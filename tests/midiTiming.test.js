import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMidiReference } from '../adapters/midi/midiReferenceAdapter.js'
import { MIDI_REFERENCE_SOURCE_TYPE } from '../src/contracts/midiReferenceEvidence.js'
import { buildMidiFile, endOfTrack, noteOff, noteOn, tempo, timeSignature } from './helpers/midiFixtures.js'

const provenance = { sourceId: 'timing-ref', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE }

test('4/4 constant-tempo MIDI exposes beat-domain timing', () => {
  const bytes = buildMidiFile({ format: 0, trackEventGroups: [[tempo(), timeSignature(), noteOn(60), noteOff(60, 64, 0, 480), endOfTrack()]] })
  const result = loadMidiReference(bytes, provenance)
  assert.equal(result.ppq, 480)
  assert.equal(result.events[0].startBeats, 0)
  assert.equal(result.events[0].durationBeats, 1)
  assert.equal(result.timeSignatures[0].numerator, 4)
})

test('tempo changes are preserved without changing musical beat positions', () => {
  const bytes = buildMidiFile({ format: 1, trackEventGroups: [
    [tempo(500000), tempo(1000000, 480), endOfTrack()],
    [noteOn(60), noteOff(60, 64, 0, 480), noteOn(62), noteOff(62, 64, 0, 480), endOfTrack()],
  ] })
  const result = loadMidiReference(bytes, provenance)
  assert.equal(result.tempos.length, 2)
  assert.equal(Math.round(result.tempos[0].bpm), 120)
  assert.equal(Math.round(result.tempos[1].bpm), 60)
  assert.deepEqual(result.events.map((event) => event.startBeats), [0, 1])
})

test('time-signature changes are preserved with tick positions', () => {
  const bytes = buildMidiFile({ format: 1, trackEventGroups: [
    [timeSignature(4, 4), timeSignature(3, 4, 1920), endOfTrack()],
    [noteOn(60), noteOff(60, 64, 0, 480), endOfTrack()],
  ] })
  const result = loadMidiReference(bytes, provenance)
  assert.equal(result.timeSignatures.length, 2)
  assert.deepEqual(result.timeSignatures.map((item) => [item.numerator, item.denominator, item.ticks]), [[4, 4, 0], [3, 4, 1920]])
})

test('bar position is derived from MIDI header timing map', () => {
  const bytes = buildMidiFile({ format: 0, trackEventGroups: [[timeSignature(4, 4), noteOn(60, 96, 0, 1920), noteOff(60, 64, 0, 480), endOfTrack()]] })
  const result = loadMidiReference(bytes, provenance)
  assert.ok(Math.abs(result.events[0].barPosition - 1) < 1e-9)
})

test('an empty but structurally valid MIDI normalizes deterministically with no events', () => {
  const bytes = buildMidiFile({ format: 0, trackEventGroups: [[tempo(), timeSignature(), endOfTrack()]] })
  const first = loadMidiReference(bytes, provenance)
  const second = loadMidiReference(bytes, provenance)
  assert.equal(first.ok, true)
  assert.equal(first.events.length, 0)
  assert.deepEqual(first, second)
})
