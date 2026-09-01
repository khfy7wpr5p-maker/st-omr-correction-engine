import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_COMPARISON_CODE, MIDI_REFERENCE_SOURCE_TYPE, MIDI_SCORE_PITCH_DOMAIN } from '../src/contracts/midiReferenceEvidence.js'
import {
  analyzeMidiReferenceEvidence,
  analyzeMidiScoreAlignmentWithInstrumentContract,
  createMidiInstrumentContract,
} from '../adapters/midi/index.js'
import { buildMidiFile, endOfTrack, noteOff, noteOn, programChange, tempo, timeSignature } from './helpers/midiFixtures.js'

function score(parts) {
  const measures = parts.map((part) => createMeasure({ key: `${part.id}:0`, beats: 4, beatType: 4 }))
  const events = parts.flatMap((part) => part.notes.map((note, index) => createScoreEvent({
    id: note.id ?? `${part.id}-s${index}`,
    measureKey: `${part.id}:0`,
    onset: note.onset ?? index,
    duration: note.duration ?? 1,
    pitch: note.pitch,
    voice: note.voice ?? 1,
    staff: note.staff ?? 1,
    metadata: { partId: part.id },
  })))
  return createScoreGraph({ sourceId: 'instrument-contract-score', measures, events })
}

function midi(notes) {
  return Object.freeze({
    ok: true,
    sourceId: 'instrument-contract-midi',
    sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
    sha256: 'b'.repeat(64),
    events: Object.freeze(notes.map((note, index) => Object.freeze({
      eventId: note.id ?? `m${index}`,
      trackIndex: note.trackIndex ?? 0,
      channel: note.channel ?? 0,
      program: note.program ?? 0,
      instrumentName: note.instrumentName ?? null,
      percussion: false,
      midiPitch: note.pitch,
      startBeats: note.onset ?? index,
      durationBeats: note.duration ?? 1,
      sustainContext: Object.freeze({ activeAtStart: false, changesDuringNote: Object.freeze([]) }),
    }))),
  })
}

function oneNoteMidiBytes(pitch) {
  return buildMidiFile({
    format: 0,
    trackEventGroups: [[
      tempo(),
      timeSignature(),
      programChange(0, 0),
      noteOn(pitch, 96, 0, 0),
      noteOff(pitch, 64, 0, 480),
      endOfTrack(),
    ]],
  })
}

test('written Bb-instrument score pitch is converted to sounding pitch only in the comparison view', () => {
  const source = score([{ id: 'P1', notes: [{ id: 'clarinet-c', pitch: 60, onset: 0 }] }])
  const before = JSON.stringify(source)
  const result = analyzeMidiScoreAlignmentWithInstrumentContract(source, midi([{ id: 'bb', pitch: 58, onset: 0 }]), {
    globalBeatOffset: 0,
    partToTrackMap: { P1: 0 },
    partPitchProfiles: {
      P1: { scorePitchDomain: 'WRITTEN', writtenToSoundingSemitones: -2, instrumentId: 'clarinet-bb', instrumentName: 'Clarinet in Bb' },
    },
  })
  assert.equal(result.alignment.status, 'ALIGNED')
  assert.equal(result.diagnostics[0].code, MIDI_COMPARISON_CODE.EXACT_MATCH)
  assert.equal(result.diagnostics[0].details.scorePitch, 60)
  assert.equal(result.diagnostics[0].details.scoreComparisonPitch, 58)
  assert.equal(result.diagnostics[0].details.pitchDeltaSemitones, 0)
  assert.equal(result.diagnostics[0].details.scorePitchDomain, MIDI_SCORE_PITCH_DOMAIN.WRITTEN)
  assert.equal(result.diagnostics[0].details.writtenToSoundingSemitones, -2)
  assert.equal(JSON.stringify(source), before)
})

test('per-part mapping keeps transposing and concert-pitch parts on explicit tracks', () => {
  const source = score([
    { id: 'P1', notes: [{ id: 'p1', pitch: 60, onset: 0 }] },
    { id: 'P2', notes: [{ id: 'p2', pitch: 67, onset: 0 }] },
  ])
  const result = analyzeMidiScoreAlignmentWithInstrumentContract(source, midi([
    { id: 'm-p1', pitch: 58, onset: 0, trackIndex: 0 },
    { id: 'm-p2', pitch: 67, onset: 0, trackIndex: 1 },
  ]), {
    globalBeatOffset: 0,
    partToTrackMap: { P1: 0, P2: 1 },
    requirePartTrackMapping: true,
    strictTrackOwnership: true,
    partPitchProfiles: {
      P1: { scorePitchDomain: 'WRITTEN', writtenToSoundingSemitones: -2 },
      P2: { scorePitchDomain: 'SOUNDING' },
    },
  })
  assert.equal(result.matches.length, 2)
  assert.equal(result.diagnostics.filter((item) => item.code === MIDI_COMPARISON_CODE.EXACT_MATCH).length, 2)
  assert.deepEqual(result.instrumentMapping.partToTrackMap.P1, [0])
  assert.deepEqual(result.instrumentMapping.partToTrackMap.P2, [1])
  assert.equal(result.instrumentMapping.automaticInstrumentInference, false)
})

test('written pitch without an explicit transposition fails closed', () => {
  const source = score([{ id: 'P1', notes: [{ pitch: 60, onset: 0 }] }])
  const result = analyzeMidiScoreAlignmentWithInstrumentContract(source, midi([{ pitch: 58, onset: 0 }]), {
    partPitchProfiles: { P1: { scorePitchDomain: 'WRITTEN' } },
  })
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.alignment.reason, 'UNRESOLVED_TRANSPOSITION')
  assert.equal(result.matches.length, 0)
})

test('legacy transposingInstrument flag still fails closed when pitch domain is undeclared', () => {
  const source = score([{ id: 'P1', notes: [{ pitch: 60, onset: 0 }] }])
  const result = analyzeMidiScoreAlignmentWithInstrumentContract(source, midi([{ pitch: 60, onset: 0 }]), {
    transposingInstrument: true,
  })
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.alignment.reason, 'UNRESOLVED_PITCH_DOMAIN')
})

test('contradictory sounding-pitch transposition contract is rejected', () => {
  const source = score([{ id: 'P1', notes: [{ pitch: 60, onset: 0 }] }])
  const result = analyzeMidiScoreAlignmentWithInstrumentContract(source, midi([{ pitch: 60, onset: 0 }]), {
    partPitchProfiles: { P1: { scorePitchDomain: 'SOUNDING', writtenToSoundingSemitones: -2 } },
  })
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.alignment.reason, 'INVALID_INSTRUMENT_CONTRACT')
})

test('required part-to-track mapping abstains when one score part is unmapped', () => {
  const source = score([
    { id: 'P1', notes: [{ pitch: 60, onset: 0 }] },
    { id: 'P2', notes: [{ pitch: 67, onset: 0 }] },
  ])
  const result = analyzeMidiScoreAlignmentWithInstrumentContract(source, midi([
    { pitch: 60, onset: 0, trackIndex: 0 },
    { pitch: 67, onset: 0, trackIndex: 1 },
  ]), { partToTrackMap: { P1: 0 }, requirePartTrackMapping: true })
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.alignment.reason, 'PART_TRACK_MAPPING_REQUIRED')
})

test('strict track ownership rejects one MIDI track being claimed by multiple parts', () => {
  assert.throws(() => createMidiInstrumentContract({
    partToTrackMap: { P1: 0, P2: 0 },
    strictTrackOwnership: true,
  }), /mapped to multiple parts/)
})

test('out-of-range written-to-sounding conversion abstains instead of clipping pitch', () => {
  const source = score([{ id: 'P1', notes: [{ pitch: 120, onset: 0 }] }])
  const result = analyzeMidiScoreAlignmentWithInstrumentContract(source, midi([{ pitch: 127, onset: 0 }]), {
    partPitchProfiles: { P1: { scorePitchDomain: 'WRITTEN', writtenToSoundingSemitones: 12 } },
  })
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.alignment.reason, 'TRANSPOSITION_OUT_OF_MIDI_RANGE')
})

test('evidence bridge exposes transposition provenance while staying weight-zero shadow evidence', () => {
  const source = score([{ id: 'P1', notes: [{ id: 'bridge-note', pitch: 60, onset: 0, duration: 1 }] }])
  const sourceBefore = JSON.stringify(source)
  const midiBytes = oneNoteMidiBytes(58)
  const midiBefore = Buffer.from(midiBytes)
  const result = analyzeMidiReferenceEvidence({
    scoreGraph: source,
    midiInput: midiBytes,
    provenance: { sourceId: 'trusted-bb-reference', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE },
    alignmentContext: {
      globalBeatOffset: 0,
      partToTrackMap: { P1: 0 },
      partPitchProfiles: { P1: { scorePitchDomain: 'WRITTEN', writtenToSoundingSemitones: -2, instrumentName: 'Clarinet in Bb' } },
    },
  })
  assert.equal(result.alignment.status, 'ALIGNED')
  assert.equal(result.diagnostics[0].code, MIDI_COMPARISON_CODE.EXACT_MATCH)
  assert.equal(result.evidence[0].weight, 0)
  assert.equal(result.evidence[0].details.scorePitch, 60)
  assert.equal(result.evidence[0].details.scoreComparisonPitch, 58)
  assert.equal(result.evidence[0].details.writtenToSoundingSemitones, -2)
  assert.equal(result.authority, 'SHADOW_EVIDENCE_ONLY')
  assert.equal(result.invariants.automaticCorrectionAuthority, false)
  assert.equal(result.invariants.correctionPatchesProduced, false)
  assert.equal(JSON.stringify(source), sourceBefore)
  assert.ok(midiBefore.equals(midiBytes))
})
