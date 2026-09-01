import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMidiReference, parseMidiReference } from '../adapters/midi/midiReferenceAdapter.js'
import { MIDI_REFERENCE_SOURCE_TYPE } from '../src/contracts/midiReferenceEvidence.js'
import { buildMidiFile, controlChange, endOfTrack, noteOff, noteOn, pitchBend, programChange, simpleScaleMidi, tempo, timeSignature } from './helpers/midiFixtures.js'

const provenance = { sourceId: 'ref-001', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE }

test('parses supported format 0 MIDI', () => {
  const result = loadMidiReference(simpleScaleMidi({ format: 0 }), provenance)
  assert.equal(result.ok, true)
  assert.equal(result.format, 0)
  assert.equal(result.events.length, 3)
})

test('parses supported format 1 MIDI', () => {
  const result = loadMidiReference(simpleScaleMidi({ format: 1 }), provenance)
  assert.equal(result.ok, true)
  assert.equal(result.format, 1)
  assert.equal(result.events.length, 3)
})

test('malformed MIDI fails closed', () => {
  const result = parseMidiReference(Buffer.from('not-midi'), provenance)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'MALFORMED_MIDI_HEADER')
})

test('MIDI type 2 fails closed', () => {
  const bytes = buildMidiFile({ format: 2, trackEventGroups: [[endOfTrack()]] })
  const result = parseMidiReference(bytes, provenance)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'MIDI_TYPE_2_UNSUPPORTED')
})

test('SMPTE timing fails closed', () => {
  const bytes = buildMidiFile({ format: 0, ppq: 0xe728, trackEventGroups: [[endOfTrack()]] })
  const result = parseMidiReference(bytes, provenance)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'SMPTE_TIMING_UNSUPPORTED')
})

test('same bytes produce deterministic normalized IDs', () => {
  const bytes = simpleScaleMidi()
  const first = loadMidiReference(bytes, provenance)
  const second = loadMidiReference(bytes, provenance)
  assert.deepEqual(first, second)
  assert.deepEqual(first.events.map((event) => event.eventId), second.events.map((event) => event.eventId))
})

test('input bytes are unchanged by parsing and normalization', () => {
  const bytes = simpleScaleMidi()
  const before = Buffer.from(bytes)
  loadMidiReference(bytes, provenance)
  assert.deepEqual(bytes, before)
})

test('multi-track normalized note-track ordering is deterministic', () => {
  const bytes = buildMidiFile({
    format: 1,
    trackEventGroups: [
      [tempo(), timeSignature(), endOfTrack()],
      [programChange(0), noteOn(60), noteOff(60, 64, 0, 480), endOfTrack()],
      [programChange(24, 1), noteOn(67, 96, 1), noteOff(67, 64, 1, 480), endOfTrack()],
    ],
  })
  const first = loadMidiReference(bytes, provenance)
  const second = loadMidiReference(bytes, provenance)
  assert.deepEqual(first.events.map((event) => event.trackIndex), [0, 1])
  assert.deepEqual(second.events.map((event) => event.trackIndex), [0, 1])
})

test('overlapping same-pitch events are not deduplicated', () => {
  const bytes = buildMidiFile({ format: 0, trackEventGroups: [[
    tempo(), timeSignature(), noteOn(60), noteOn(60, 90, 0, 120), noteOff(60, 64, 0, 360), noteOff(60, 64, 0, 120), endOfTrack(),
  ]] })
  const result = loadMidiReference(bytes, provenance)
  assert.equal(result.events.length, 2)
  assert.notEqual(result.events[0].eventId, result.events[1].eventId)
})

test('percussion channel is recognized and preserved', () => {
  const bytes = buildMidiFile({ format: 0, trackEventGroups: [[noteOn(36, 96, 9), noteOff(36, 64, 9, 120), endOfTrack()]] })
  const result = loadMidiReference(bytes, provenance)
  assert.equal(result.events[0].percussion, true)
  assert.equal(result.events[0].channel, 9)
})

test('program metadata is preserved', () => {
  const bytes = buildMidiFile({ format: 0, trackEventGroups: [[programChange(40), noteOn(60), noteOff(60, 64, 0, 240), endOfTrack()]] })
  const result = loadMidiReference(bytes, provenance)
  assert.equal(result.events[0].program, 40)
})

test('sustain and pitch bend are context only and preserved at track level', () => {
  const bytes = buildMidiFile({ format: 0, trackEventGroups: [[
    controlChange(64, 127), pitchBend(9000), noteOn(60), noteOff(60, 64, 0, 240), controlChange(64, 0), endOfTrack(),
  ]] })
  const result = loadMidiReference(bytes, provenance)
  assert.equal(result.events[0].sustainContext.activeAtStart, true)
  assert.equal(result.tracks[0].pitchBends.length, 1)
  assert.equal(result.events[0].durationTicks, 240)
})
