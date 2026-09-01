import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_COMPARISON_CODE } from '../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignmentConservatively } from '../adapters/midi/polyphonicRepeatedPitchAmbiguity.js'

function graph(notes) {
  const measure = createMeasure({ key: 'm1', beats: 4, beatType: 4 })
  const events = notes.map((note, index) => createScoreEvent({
    id: note.id ?? `s${index}`,
    measureKey: 'm1',
    onset: note.onset,
    duration: note.duration ?? 1,
    pitch: note.pitch,
    voice: note.voice ?? 1,
    staff: note.staff ?? 1,
    metadata: note.metadata ?? null,
  }))
  return createScoreGraph({ sourceId: 'score', measures: [measure], events })
}

function midi(notes) {
  return Object.freeze({
    ok: true,
    sourceId: 'midi',
    sourceType: 'TRUSTED_REFERENCE',
    sha256: 'a'.repeat(64),
    events: Object.freeze(notes.map((note, index) => Object.freeze({
      eventId: note.id ?? `m${index}`,
      trackIndex: 0,
      channel: 0,
      program: 0,
      instrumentName: 'piano',
      percussion: false,
      midiPitch: note.pitch,
      startBeats: note.onset,
      durationBeats: note.duration ?? 1,
      sustainContext: Object.freeze({ activeAtStart: false, changesDuringNote: Object.freeze([]) }),
    }))),
  })
}

function codes(result) {
  return result.diagnostics.map((diagnostic) => diagnostic.code)
}

test('nearby exact-pitch alternatives abstain instead of reporting a shifted pitch-conflict chain', () => {
  const source = graph([
    { pitch: 60, onset: 0, voice: 1 },
    { pitch: 64, onset: 0.25, voice: 1 },
  ])
  const result = analyzeMidiScoreAlignmentConservatively(
    source,
    midi([
      { pitch: 64, onset: 0 },
      { pitch: 60, onset: 0.25 },
    ]),
    { globalBeatOffset: 0 },
  )

  assert.equal(codes(result).includes(MIDI_COMPARISON_CODE.PITCH_CONFLICT), false)
  assert.equal(result.diagnostics.filter((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH).length, 2)
  assert.equal(result.diagnostics.every((diagnostic) => diagnostic.details?.ambiguityReason === 'PITCH_ONSET_ASSIGNMENT_CONFLICT'), true)
  assert.equal(result.matches.length, 0)
  assert.equal(source.events[0].pitch, 60)
  assert.equal(source.events[1].pitch, 64)
})

test('same-onset distinct voices make the assignment ambiguity voice-aware', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([
      { pitch: 60, onset: 0, voice: 1 },
      { pitch: 64, onset: 0, voice: 2 },
      { pitch: 67, onset: 0.25, voice: 1 },
    ]),
    midi([
      { pitch: 64, onset: 0 },
      { pitch: 60, onset: 0.25 },
      { pitch: 67, onset: 0.25 },
    ]),
    { globalBeatOffset: 0 },
  )

  const voiceAware = result.diagnostics.find((diagnostic) => diagnostic.details?.ambiguityReason === 'VOICE_ONSET_ASSIGNMENT_CONFLICT')
  assert.ok(voiceAware)
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.PITCH_CONFLICT && diagnostic.details?.scoreEventId === voiceAware.details.scoreEventId), false)
})

test('isolated pitch disagreement stays a pitch conflict when no exact-pitch alternative exists', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([{ pitch: 60, onset: 0 }]),
    midi([{ pitch: 61, onset: 0 }]),
    { globalBeatOffset: 0 },
  )
  assert.equal(result.diagnostics[0].code, MIDI_COMPARISON_CODE.PITCH_CONFLICT)
})

test('nearby same-pitch unmatched MIDI witness abstains instead of asserting extra note', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([{ pitch: 60, onset: 0 }]),
    midi([
      { pitch: 60, onset: 0 },
      { pitch: 60, onset: 0.3 },
    ]),
    { globalBeatOffset: 0 },
  )
  assert.equal(codes(result).includes(MIDI_COMPARISON_CODE.EXTRA_NOTE), false)
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.details?.ambiguityReason === 'UNMATCHED_MIDI_NEAR_SCORE_WITNESS'), true)
  assert.equal(result.metrics.extra_note_diagnostic_rate, 0)
})

test('far unmatched MIDI note remains an extra-note diagnostic', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([{ pitch: 60, onset: 0 }]),
    midi([
      { pitch: 60, onset: 0 },
      { pitch: 60, onset: 1 },
    ]),
    { globalBeatOffset: 0 },
  )
  assert.equal(codes(result).includes(MIDI_COMPARISON_CODE.EXTRA_NOTE), true)
})

test('tied notation fragment duration becomes ambiguity instead of a MIDI duration error', () => {
  const source = graph([{ pitch: 60, onset: 0, duration: 0.75, metadata: { tieTypes: ['start'] } }])
  const result = analyzeMidiScoreAlignmentConservatively(
    source,
    midi([{ pitch: 60, onset: 0, duration: 1.75 }]),
    { globalBeatOffset: 0 },
  )
  assert.equal(codes(result).includes(MIDI_COMPARISON_CODE.DURATION_CONFLICT), false)
  const ambiguity = result.diagnostics.find((diagnostic) => diagnostic.details?.ambiguityReason === 'TIED_DURATION_REPRESENTATION')
  assert.ok(ambiguity)
  assert.deepEqual(ambiguity.details.tieTypes, ['start'])
  assert.equal(source.events[0].duration, 0.75)
})

test('untied duration disagreement remains a duration conflict', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([{ pitch: 60, onset: 0, duration: 0.75 }]),
    midi([{ pitch: 60, onset: 0, duration: 1.75 }]),
    { globalBeatOffset: 0 },
  )
  assert.equal(codes(result).includes(MIDI_COMPARISON_CODE.DURATION_CONFLICT), true)
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.details?.ambiguityReason === 'TIED_DURATION_REPRESENTATION'), false)
})
