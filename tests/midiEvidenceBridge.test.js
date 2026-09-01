import test from 'node:test'
import assert from 'node:assert/strict'
import { EVIDENCE_SOURCE, createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_REFERENCE_SOURCE_TYPE } from '../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiReferenceEvidence } from '../adapters/midi/midiEvidenceBridge.js'
import { buildMidiFile, endOfTrack, noteOff, noteOn, simpleScaleMidi, tempo, timeSignature } from './helpers/midiFixtures.js'

function scaleGraph() {
  const measure = createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })
  return createScoreGraph({ sourceId: 'score-source', measures: [measure], events: [
    createScoreEvent({ id: 's0', measureKey: 'P1:0', onset: 0, duration: 1, pitch: 60 }),
    createScoreEvent({ id: 's1', measureKey: 'P1:0', onset: 1, duration: 1, pitch: 62 }),
    createScoreEvent({ id: 's2', measureKey: 'P1:0', onset: 2, duration: 1, pitch: 64 }),
  ] })
}

const trusted = { sourceId: 'ref-001', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE }

test('MIDI diagnostics bridge into existing symbolic evidence source only', () => {
  const result = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: simpleScaleMidi(), provenance: trusted })
  assert.equal(result.mode, 'SHADOW_ONLY')
  assert.ok(result.evidence.length > 0)
  assert.ok(result.evidence.every((item) => item.source === EVIDENCE_SOURCE.SYMBOLIC))
  assert.ok(result.evidence.every((item) => item.details.provider === 'midi_reference'))
})

test('MIDI evidence weight remains non-authoritative zero', () => {
  const result = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: simpleScaleMidi(), provenance: trusted })
  assert.ok(result.evidence.every((item) => item.weight === 0))
  assert.ok(result.evidence.every((item) => item.details.authority === 'SHADOW_EVIDENCE_ONLY'))
  assert.equal(result.invariants.automaticCorrectionAuthority, false)
})

test('required MIDI provenance fields are complete and frozen', () => {
  const result = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: simpleScaleMidi(), provenance: trusted })
  const evidence = result.evidence[0]
  for (const key of ['midiSourceId', 'midiSourceType', 'midiSha256', 'scoreEventId', 'midiEventId', 'comparisonCode', 'pitchDeltaSemitones', 'onsetDeltaBeats', 'durationDeltaBeats', 'alignmentConfidence', 'ambiguityReason', 'trackIndex', 'instrumentName']) {
    assert.equal(Object.hasOwn(evidence.details, key), true, key)
  }
  assert.equal(Object.isFrozen(evidence), true)
  assert.equal(Object.isFrozen(evidence.details), true)
})

test('existing evidence enum is not expanded or relabeled', () => {
  assert.deepEqual(EVIDENCE_SOURCE, { VALIDATOR: 'validator', SYMBOLIC: 'symbolic', VISUAL: 'visual', TEACHER: 'teacher' })
})

test('score graph and MIDI bytes remain byte/structure unchanged', () => {
  const score = scaleGraph()
  const bytes = simpleScaleMidi()
  const scoreBefore = JSON.stringify(score)
  const midiBefore = Buffer.from(bytes)
  const result = analyzeMidiReferenceEvidence({ scoreGraph: score, midiInput: bytes, provenance: trusted })
  assert.equal(result.sourceGraph, score)
  assert.equal(JSON.stringify(score), scoreBefore)
  assert.deepEqual(bytes, midiBefore)
  assert.deepEqual(result.invariants, {
    scoreUnchanged: true,
    midiBytesUnchanged: true,
    sourceMutation: false,
    automaticCorrectionAuthority: false,
    correctionPatchesProduced: false,
  })
})

test('AUDIO_DERIVED MIDI gains no correctness authority', () => {
  const result = analyzeMidiReferenceEvidence({
    scoreGraph: scaleGraph(), midiInput: simpleScaleMidi(),
    provenance: { sourceId: 'audio-derived-1', sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED },
  })
  assert.ok(result.evidence.every((item) => item.weight === 0 && item.details.authority === 'SHADOW_EVIDENCE_ONLY'))
})

test('malformed MIDI becomes frozen unsupported evidence rather than an exception', () => {
  const result = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: Buffer.from('bad-midi'), provenance: trusted })
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.evidence.length, 1)
  assert.equal(result.evidence[0].code, 'MIDI_UNSUPPORTED_CONTEXT')
  assert.equal(result.evidence[0].details.ambiguityReason, 'MALFORMED_MIDI_HEADER')
})

test('wrong-piece MIDI remains unaligned and produces no correction authority', () => {
  const wrong = buildMidiFile({ format: 0, trackEventGroups: [[
    tempo(), timeSignature(), noteOn(72), noteOff(72, 64, 0, 480), noteOn(74), noteOff(74, 64, 0, 480), noteOn(76), noteOff(76, 64, 0, 480), endOfTrack(),
  ]] })
  const result = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: wrong, provenance: trusted })
  assert.equal(result.alignment.status, 'UNALIGNED')
  assert.equal(result.evidence[0].code, 'MIDI_UNALIGNED')
  assert.equal(result.invariants.automaticCorrectionAuthority, false)
})

test('identical input produces identical full public fingerprints', () => {
  const score = scaleGraph()
  const bytes = simpleScaleMidi()
  const first = analyzeMidiReferenceEvidence({ scoreGraph: score, midiInput: bytes, provenance: trusted })
  const second = analyzeMidiReferenceEvidence({ scoreGraph: score, midiInput: bytes, provenance: trusted })
  assert.equal(JSON.stringify(first), JSON.stringify(second))
})

test('empty MIDI produces deterministic unsupported evidence at comparison boundary', () => {
  const empty = buildMidiFile({ format: 0, trackEventGroups: [[tempo(), timeSignature(), endOfTrack()]] })
  const first = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: empty, provenance: trusted })
  const second = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: empty, provenance: trusted })
  assert.equal(first.evidence[0].code, 'MIDI_UNSUPPORTED_CONTEXT')
  assert.equal(first.evidence[0].details.ambiguityReason, 'NO_COMPARABLE_PITCHED_MIDI_EVENTS')
  assert.equal(JSON.stringify(first), JSON.stringify(second))
})

test('bridge output exposes no patch/apply/accept surface', () => {
  const result = analyzeMidiReferenceEvidence({ scoreGraph: scaleGraph(), midiInput: simpleScaleMidi(), provenance: trusted })
  for (const forbidden of ['patches', 'apply', 'accept', 'correctionPatch', 'correctedScore', 'musicXml']) assert.equal(forbidden in result, false)
  assert.equal(result.invariants.correctionPatchesProduced, false)
})
