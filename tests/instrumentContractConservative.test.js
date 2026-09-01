import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_COMPARISON_CODE, MIDI_REFERENCE_SOURCE_TYPE } from '../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignmentWithInstrumentContractConservatively } from '../adapters/midi/instrumentContractConservative.js'
import { analyzeMidiReferenceEvidence } from '../adapters/midi/midiEvidenceBridge.js'
import { buildMidiFile, endOfTrack, noteOff, noteOn, programChange, tempo, timeSignature } from './helpers/midiFixtures.js'

function graph(notes) {
  const measure = createMeasure({ key: 'm1', beats: 4, beatType: 4 })
  const events = notes.map((note, index) => createScoreEvent({
    id: note.id ?? `s${index}`,
    measureKey: 'm1',
    onset: note.onset,
    duration: note.duration ?? 0.25,
    pitch: note.pitch,
    voice: note.voice ?? 1,
    staff: 1,
    metadata: note.metadata ?? null,
  }))
  return createScoreGraph({ sourceId: 'score', measures: [measure], events })
}

function normalizedMidi(notes) {
  return Object.freeze({
    ok: true,
    sourceId: 'midi',
    sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
    sha256: 'a'.repeat(64),
    events: Object.freeze(notes.map((note, index) => Object.freeze({
      eventId: `m${index}`,
      trackIndex: 0,
      channel: 0,
      program: 24,
      instrumentName: 'guitar',
      percussion: false,
      midiPitch: note.pitch,
      startBeats: note.onset,
      durationBeats: note.duration ?? 0.25,
      sustainContext: Object.freeze({ activeAtStart: false, changesDuringNote: Object.freeze([]) }),
    }))),
  })
}

const guitarContext = Object.freeze({
  scorePitchDomain: 'WRITTEN',
  writtenToSoundingSemitones: -12,
  knownGlobalBeatOffset: 0,
})

test('written guitar pitches use sounding comparison pitch for conservative assignment abstention', () => {
  const source = graph([
    { pitch: 60, onset: 0 },
    { pitch: 64, onset: 0.25 },
  ])
  const before = JSON.stringify(source)
  const result = analyzeMidiScoreAlignmentWithInstrumentContractConservatively(
    source,
    normalizedMidi([
      { pitch: 52, onset: 0 },
      { pitch: 48, onset: 0.25 },
    ]),
    guitarContext,
  )

  assert.equal(result.alignment.status, 'ALIGNED')
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.PITCH_CONFLICT), false)
  assert.equal(result.diagnostics.filter((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH).length, 2)
  assert.equal(result.scoreEvents[0].pitch, 60)
  assert.equal(result.scoreEvents[0].comparisonPitch, 48)
  assert.equal(result.scoreEvents[1].pitch, 64)
  assert.equal(result.scoreEvents[1].comparisonPitch, 52)
  assert.equal(JSON.stringify(source), before)
})

test('tied written guitar duration abstention retains written and sounding pitch provenance', () => {
  const source = graph([{ pitch: 60, onset: 0, duration: 0.75, metadata: { tieTypes: ['start'] } }])
  const result = analyzeMidiScoreAlignmentWithInstrumentContractConservatively(
    source,
    normalizedMidi([{ pitch: 48, onset: 0, duration: 1.75 }]),
    guitarContext,
  )

  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.DURATION_CONFLICT), false)
  const ambiguity = result.diagnostics.find((diagnostic) => diagnostic.details?.ambiguityReason === 'TIED_DURATION_REPRESENTATION')
  assert.ok(ambiguity)
  assert.equal(ambiguity.details.scorePitch, 60)
  assert.equal(ambiguity.details.scoreComparisonPitch, 48)
  assert.equal(ambiguity.details.writtenToSoundingSemitones, -12)
})

test('public MIDI evidence bridge uses the conservative transposing path while staying weight zero', () => {
  const source = graph([
    { pitch: 60, onset: 0 },
    { pitch: 64, onset: 0.25 },
  ])
  const bytes = buildMidiFile({ format: 0, ppq: 480, trackEventGroups: [[
    tempo(),
    timeSignature(),
    programChange(24),
    noteOn(52),
    noteOff(52, 64, 0, 120),
    noteOn(48),
    noteOff(48, 64, 0, 120),
    endOfTrack(),
  ]] })
  const before = Buffer.from(bytes)
  const result = analyzeMidiReferenceEvidence({
    scoreGraph: source,
    midiInput: bytes,
    provenance: { sourceId: 'guitar-reference', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE },
    alignmentContext: guitarContext,
  })

  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.PITCH_CONFLICT), false)
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH), true)
  assert.equal(result.evidence.every((item) => item.weight === 0), true)
  assert.equal(result.evidence.every((item) => item.details.authority === 'SHADOW_EVIDENCE_ONLY'), true)
  assert.equal(result.invariants.automaticCorrectionAuthority, false)
  assert.deepEqual(bytes, before)
})
