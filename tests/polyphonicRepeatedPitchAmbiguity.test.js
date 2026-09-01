import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_COMPARISON_CODE } from '../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignmentConservatively } from '../adapters/midi/polyphonicRepeatedPitchAmbiguity.js'

function graph(notes) {
  const measure = createMeasure({ key: 'm1', beats: 4, beatType: 4 })
  const events = notes.map((note, index) => createScoreEvent({
    id: `s${index}`, measureKey: 'm1', onset: note.onset, duration: note.duration ?? 1,
    pitch: note.pitch, voice: note.voice, staff: 1,
  }))
  return createScoreGraph({ sourceId: 'score', measures: [measure], events })
}

function midi(notes) {
  return Object.freeze({
    ok: true, sourceId: 'midi', sourceType: 'TRUSTED_REFERENCE', sha256: 'a'.repeat(64),
    events: Object.freeze(notes.map((note, index) => Object.freeze({
      eventId: `m${index}`, trackIndex: 0, channel: 0, program: 24, instrumentName: 'guitar', percussion: false,
      midiPitch: note.pitch, startBeats: note.onset, durationBeats: note.duration ?? 1,
      sustainContext: Object.freeze({ activeAtStart: false, changesDuringNote: Object.freeze([]) }),
    }))),
  })
}

test('same pitch and onset in distinct score voices is ambiguity when MIDI has one witness', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([{ pitch: 48, onset: 0, voice: 2, duration: 2 }, { pitch: 48, onset: 0, voice: 3, duration: 0.25 }]),
    midi([{ pitch: 48, onset: 0, duration: 2 }]),
    { globalBeatOffset: 0 },
  )
  assert.equal(result.diagnostics.filter((item) => item.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING).length, 0)
  const ambiguous = result.diagnostics.find((item) => item.code === MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH)
  assert.equal(ambiguous.details.ambiguityReason, 'POLYPHONIC_SAME_PITCH_MIDI_COLLAPSE')
  assert.equal(result.metrics.missing_note_diagnostic_rate, 0)
  assert.equal(result.metrics.ambiguous_match_rate, 0.5)
})

test('different onset remains a genuine missing diagnostic', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([{ pitch: 48, onset: 0, voice: 2 }, { pitch: 48, onset: 1, voice: 3 }]),
    midi([{ pitch: 48, onset: 0 }]),
    { globalBeatOffset: 0 },
  )
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING), true)
  assert.equal(result.diagnostics.some((item) => item.details?.ambiguityReason === 'POLYPHONIC_SAME_PITCH_MIDI_COLLAPSE'), false)
})

test('same voice duplicate is not reclassified as cross-voice ambiguity', () => {
  const result = analyzeMidiScoreAlignmentConservatively(
    graph([{ pitch: 48, onset: 0, voice: 2 }, { pitch: 48, onset: 0, voice: 2 }]),
    midi([{ pitch: 48, onset: 0 }]),
    { globalBeatOffset: 0 },
  )
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING), true)
})
