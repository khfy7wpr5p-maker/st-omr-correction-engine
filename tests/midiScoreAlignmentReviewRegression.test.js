import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_COMPARISON_CODE } from '../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignment, extractScoreReferenceEvents } from '../adapters/midi/midiScoreAlignment.js'

function midi(notes) {
  return Object.freeze({
    ok: true,
    sourceId: 'review-midi',
    sourceType: 'TRUSTED_REFERENCE',
    sha256: 'b'.repeat(64),
    events: Object.freeze(notes.map((note, index) => Object.freeze({
      eventId: note.id ?? `m${index}`,
      trackIndex: note.trackIndex ?? 0,
      channel: note.channel ?? 0,
      program: 0,
      instrumentName: 'test',
      percussion: false,
      midiPitch: note.pitch,
      startBeats: note.onset,
      durationBeats: note.duration ?? 1,
      sustainContext: Object.freeze({ activeAtStart: false, changesDuringNote: Object.freeze([]) }),
    }))),
  })
}

test('concurrent score parts share the same synchronized measure timeline', () => {
  const measures = [
    createMeasure({ key: 'P1:0', beats: 4, beatType: 4 }),
    createMeasure({ key: 'P2:0', beats: 4, beatType: 4 }),
  ]
  const events = [
    createScoreEvent({ id: 'p1-n0', measureKey: 'P1:0', onset: 0, duration: 1, pitch: 60, metadata: { partId: 'P1' } }),
    createScoreEvent({ id: 'p2-n0', measureKey: 'P2:0', onset: 0, duration: 1, pitch: 67, metadata: { partId: 'P2' } }),
  ]
  const score = createScoreGraph({ sourceId: 'multi-part-score', measures, events })
  const view = extractScoreReferenceEvents(score)
  assert.equal(view.ok, true)
  assert.deepEqual(view.events.map((event) => event.globalOnsetBeats), [0, 0])
  assert.equal(view.totalQuarterBeats, 4)

  const result = analyzeMidiScoreAlignment(score, midi([
    { id: 'm-p1', pitch: 60, onset: 0, duration: 1, trackIndex: 0 },
    { id: 'm-p2', pitch: 67, onset: 0, duration: 1, trackIndex: 1 },
  ]), { globalBeatOffset: 0, partToTrackMap: { P1: 0, P2: 1 } })
  assert.equal(result.matches.length, 2)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING), false)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.EXTRA_NOTE), false)
})

test('affine timing scale is applied to MIDI durations as well as onsets', () => {
  const measure = createMeasure({ key: 'P1:0', beats: 12, beatType: 4 })
  const score = createScoreGraph({ sourceId: 'scaled-score', measures: [measure], events: [
    createScoreEvent({ id: 's0', measureKey: 'P1:0', onset: 0, duration: 4, pitch: 60 }),
    createScoreEvent({ id: 's1', measureKey: 'P1:0', onset: 4, duration: 4, pitch: 62 }),
    createScoreEvent({ id: 's2', measureKey: 'P1:0', onset: 8, duration: 4, pitch: 64 }),
  ] })
  const result = analyzeMidiScoreAlignment(score, midi([
    { pitch: 60, onset: 0, duration: 4.2 },
    { pitch: 62, onset: 4.2, duration: 4.2 },
    { pitch: 64, onset: 8.4, duration: 4.2 },
  ]))
  assert.equal(result.alignment.status, 'ALIGNED')
  assert.ok(Math.abs(result.alignment.scale - (4 / 4.2)) < 1e-6)
  assert.equal(result.metrics.duration_agreement_rate, 1)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.DURATION_CONFLICT), false)
})

test('maximum-cardinality assignment prevents greedy false missing and extra notes', () => {
  const measure = createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })
  const score = createScoreGraph({ sourceId: 'cardinality-score', measures: [measure], events: [
    createScoreEvent({ id: 's-a', measureKey: 'P1:0', onset: 0.2, duration: 1, pitch: 60 }),
    createScoreEvent({ id: 's-b', measureKey: 'P1:0', onset: 0.4, duration: 1, pitch: 60 }),
  ] })
  const result = analyzeMidiScoreAlignment(score, midi([
    { id: 'm-a', pitch: 60, onset: 0, duration: 1 },
    { id: 'm-b', pitch: 60, onset: 0.3, duration: 1 },
  ]), { globalBeatOffset: 0 })
  assert.equal(result.matches.length, 2)
  assert.equal(result.metrics.event_match_coverage, 1)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING), false)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.EXTRA_NOTE), false)
})

test('ambiguity is evaluated after one-to-one assignment so an exact semitone chord is not ambiguous', () => {
  const measure = createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })
  const score = createScoreGraph({ sourceId: 'semitone-chord', measures: [measure], events: [
    createScoreEvent({ id: 's-c', measureKey: 'P1:0', onset: 0, duration: 1, pitch: 60, isChordTone: true }),
    createScoreEvent({ id: 's-cs', measureKey: 'P1:0', onset: 0, duration: 1, pitch: 61, isChordTone: true }),
  ] })
  const result = analyzeMidiScoreAlignment(score, midi([
    { id: 'm-c', pitch: 60, onset: 0, duration: 1 },
    { id: 'm-cs', pitch: 61, onset: 0, duration: 1 },
  ]), { globalBeatOffset: 0 })
  assert.equal(result.matches.length, 2)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH), false)
  assert.deepEqual(result.diagnostics.map((item) => item.code), [MIDI_COMPARISON_CODE.EXACT_MATCH, MIDI_COMPARISON_CODE.EXACT_MATCH])
})
