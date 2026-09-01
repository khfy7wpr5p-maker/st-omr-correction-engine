import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_COMPARISON_CODE } from '../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignment, extractScoreReferenceEvents } from '../adapters/midi/midiScoreAlignment.js'

function graph(notes, { beats = 4, beatType = 4 } = {}) {
  const measure = createMeasure({ key: 'P1:0', beats, beatType })
  const events = notes.map((note, index) => createScoreEvent({
    id: note.id ?? `s${index}`,
    measureKey: 'P1:0',
    onset: note.onset ?? index,
    duration: note.duration ?? 1,
    pitch: note.pitch ?? null,
    voice: note.voice ?? 1,
    staff: note.staff ?? 1,
    isRest: note.isRest ?? false,
    isChordTone: note.isChordTone ?? false,
    metadata: note.metadata ?? null,
  }))
  return createScoreGraph({ sourceId: 'score-1', measures: [measure], events })
}

function midi(notes) {
  return Object.freeze({
    ok: true,
    sourceId: 'midi-1',
    sourceType: 'TRUSTED_REFERENCE',
    sha256: 'a'.repeat(64),
    events: Object.freeze(notes.map((note, index) => Object.freeze({
      eventId: note.id ?? `m${index}`,
      trackIndex: note.trackIndex ?? 0,
      channel: note.channel ?? 0,
      program: note.program ?? 0,
      instrumentName: note.instrumentName ?? 'piano',
      percussion: note.percussion ?? false,
      midiPitch: note.pitch,
      startBeats: Object.hasOwn(note, 'onset') ? note.onset : index,
      durationBeats: note.duration ?? 1,
      sustainContext: Object.freeze({ activeAtStart: false, changesDuringNote: Object.freeze([]) }),
    }))),
  })
}

const scaleScore = () => graph([{ pitch: 60, onset: 0 }, { pitch: 62, onset: 1 }, { pitch: 64, onset: 2 }])
const scaleMidi = (offset = 0) => midi([{ pitch: 60, onset: offset }, { pitch: 62, onset: 1 + offset }, { pitch: 64, onset: 2 + offset }])

test('exact global alignment produces exact matches', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), scaleMidi())
  assert.equal(result.alignment.status, 'ALIGNED')
  assert.equal(result.metrics.event_match_coverage, 1)
  assert.deepEqual(result.diagnostics.map((item) => item.code), Array(3).fill(MIDI_COMPARISON_CODE.EXACT_MATCH))
})

test('constant global beat offset is inferred from unique pitches', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), scaleMidi(0.5))
  assert.equal(result.alignment.status, 'ALIGNED')
  assert.ok(Math.abs(result.alignment.offsetBeats + 0.5) < 1e-6)
  assert.equal(result.metrics.onset_agreement_rate, 1)
})

test('small timing scale drift is bounded and aligned', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), midi([
    { pitch: 60, onset: 0 }, { pitch: 62, onset: 1.01 }, { pitch: 64, onset: 2.02 },
  ]))
  assert.equal(result.alignment.status, 'ALIGNED')
  assert.ok(result.alignment.scale < 1)
  assert.equal(result.metrics.event_match_coverage, 1)
})

test('host offset is preferred and exact', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), scaleMidi(0.5), { globalBeatOffset: -0.5 })
  assert.equal(result.alignment.method, 'host_offset')
  assert.equal(result.alignment.confidence, 1)
})

test('host pickup offset is accepted without destructive inference', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), scaleMidi(0.25), { pickupOffsetBeats: -0.25 })
  assert.equal(result.alignment.method, 'host_offset')
  assert.equal(result.metrics.event_match_coverage, 1)
})

test('insufficient alignment evidence returns MIDI_UNALIGNED', () => {
  const result = analyzeMidiScoreAlignment(graph([{ pitch: 60, onset: 0 }, { pitch: 62, onset: 1 }]), midi([{ pitch: 60, onset: 0 }, { pitch: 65, onset: 1 }]))
  assert.equal(result.alignment.status, 'UNALIGNED')
  assert.equal(result.diagnostics[0].code, MIDI_COMPARISON_CODE.UNALIGNED)
})

test('wrong-piece pitch-disjoint MIDI returns MIDI_UNALIGNED', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), midi([{ pitch: 72, onset: 0 }, { pitch: 74, onset: 1 }, { pitch: 76, onset: 2 }]))
  assert.equal(result.alignment.status, 'UNALIGNED')
  assert.equal(result.metrics.unaligned_rate, 1)
})

test('missing MIDI beat-domain timing fails closed', () => {
  const result = analyzeMidiScoreAlignment(graph([{ pitch: 60 }]), midi([{ pitch: 60, onset: null }]))
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.diagnostics[0].details.ambiguityReason, 'MIDI_TIMING_CONTEXT_MISSING')
})

test('unresolved transposition fails closed', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), scaleMidi(), { transposingInstrument: true, pitchDomain: 'WRITTEN' })
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.diagnostics[0].details.ambiguityReason, 'UNRESOLVED_TRANSPOSITION')
})

test('percussion-only MIDI is excluded from pitched comparison', () => {
  const result = analyzeMidiScoreAlignment(graph([{ pitch: 36 }]), midi([{ pitch: 36, percussion: true, channel: 9 }]))
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.diagnostics[0].details.ambiguityReason, 'NO_COMPARABLE_PITCHED_MIDI_EVENTS')
})

test('rests are excluded from score pitched matching', () => {
  const source = graph([{ isRest: true, pitch: null, onset: 0 }, { pitch: 60, onset: 1 }])
  const view = extractScoreReferenceEvents(source)
  assert.equal(view.ok, true)
  assert.equal(view.events.length, 1)
  assert.equal(view.events[0].pitch, 60)
})

test('null non-rest pitch fails closed', () => {
  const result = analyzeMidiScoreAlignment(graph([{ pitch: null }]), midi([{ pitch: 60 }]))
  assert.equal(result.alignment.status, 'UNSUPPORTED')
  assert.equal(result.diagnostics[0].details.ambiguityReason, 'SCORE_PITCH_DOMAIN_UNSUPPORTED')
})

test('single note matches with an explicit bounded host offset', () => {
  const result = analyzeMidiScoreAlignment(graph([{ pitch: 60, onset: 0 }]), midi([{ pitch: 60, onset: 0 }]), { globalBeatOffset: 0 })
  assert.equal(result.diagnostics[0].code, MIDI_COMPARISON_CODE.EXACT_MATCH)
})

test('simultaneous chord notes preserve simultaneity and match independently', () => {
  const source = graph([
    { pitch: 60, onset: 0, isChordTone: true }, { pitch: 64, onset: 0, isChordTone: true }, { pitch: 67, onset: 0, isChordTone: true },
  ])
  const reference = midi([{ pitch: 60, onset: 0 }, { pitch: 64, onset: 0 }, { pitch: 67, onset: 0 }])
  const result = analyzeMidiScoreAlignment(source, reference)
  assert.equal(result.matches.length, 3)
  assert.equal(result.metrics.pitch_agreement_rate, 1)
})

test('repeated same pitch uses deterministic offset voting', () => {
  const source = graph([{ pitch: 60, onset: 0 }, { pitch: 60, onset: 1 }, { pitch: 60, onset: 2 }])
  const reference = midi([{ pitch: 60, onset: 0 }, { pitch: 60, onset: 1 }, { pitch: 60, onset: 2 }])
  const result = analyzeMidiScoreAlignment(source, reference)
  assert.equal(result.alignment.method, 'pitch_offset_vote')
  assert.equal(result.matches.length, 3)
})

test('overlapping same-pitch MIDI near-tie becomes ambiguous', () => {
  const source = graph([{ pitch: 60, onset: 0 }])
  const reference = midi([{ id: 'm-a', pitch: 60, onset: 0 }, { id: 'm-b', pitch: 60, onset: 0 }])
  const result = analyzeMidiScoreAlignment(source, reference, { globalBeatOffset: 0 })
  assert.equal(result.diagnostics[0].code, MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH)
  assert.equal(result.metrics.ambiguous_match_rate, 1)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.EXTRA_NOTE), false)
})

test('polyphonic two-voice passage matches without collapsing voices', () => {
  const source = graph([{ pitch: 60, onset: 0, voice: 1 }, { pitch: 67, onset: 0, voice: 2 }])
  const result = analyzeMidiScoreAlignment(source, midi([{ pitch: 60, onset: 0 }, { pitch: 67, onset: 0 }]))
  assert.equal(result.matches.length, 2)
  assert.deepEqual(result.diagnostics.map((item) => item.location.voice), [1, 2])
})

test('one-semitone pitch conflict is diagnostic only', () => {
  const result = analyzeMidiScoreAlignment(graph([{ pitch: 60, onset: 0 }]), midi([{ pitch: 61, onset: 0 }]), { globalBeatOffset: 0 })
  assert.equal(result.diagnostics[0].code, MIDI_COMPARISON_CODE.PITCH_CONFLICT)
  assert.equal(result.diagnostics[0].details.pitchDeltaSemitones, 1)
})

test('onset-only conflict is reported in beat units', () => {
  const result = analyzeMidiScoreAlignment(graph([{ pitch: 60, onset: 0 }]), midi([{ pitch: 60, onset: 0.2 }]), { globalBeatOffset: 0 })
  assert.deepEqual(result.diagnostics.map((item) => item.code), [MIDI_COMPARISON_CODE.PITCH_MATCH, MIDI_COMPARISON_CODE.ONSET_CONFLICT])
  assert.equal(result.diagnostics[1].details.onsetDeltaBeats, 0.2)
})

test('duration-only conflict does not rewrite notated duration', () => {
  const source = graph([{ pitch: 60, onset: 0, duration: 1 }])
  const result = analyzeMidiScoreAlignment(source, midi([{ pitch: 60, onset: 0, duration: 2 }]), { globalBeatOffset: 0 })
  assert.deepEqual(result.diagnostics.map((item) => item.code), [MIDI_COMPARISON_CODE.PITCH_MATCH, MIDI_COMPARISON_CODE.DURATION_CONFLICT])
  assert.equal(source.events[0].duration, 1)
})

test('missing score counterpart remains a score-note-missing diagnostic', () => {
  const result = analyzeMidiScoreAlignment(scaleScore(), midi([{ pitch: 60, onset: 0 }, { pitch: 62, onset: 1 }]))
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING), true)
})

test('extra MIDI counterpart remains an extra-note diagnostic', () => {
  const source = graph([{ pitch: 60, onset: 0 }, { pitch: 62, onset: 1 }])
  const reference = midi([{ pitch: 60, onset: 0 }, { pitch: 62, onset: 1 }, { pitch: 65, onset: 2 }])
  const result = analyzeMidiScoreAlignment(source, reference)
  assert.equal(result.diagnostics.some((item) => item.code === MIDI_COMPARISON_CODE.EXTRA_NOTE), true)
})

test('part-to-track map constrains candidate compatibility', () => {
  const source = graph([{ pitch: 60, onset: 0, metadata: { partId: 'P1' } }])
  const reference = midi([{ id: 'wrong', pitch: 60, onset: 0, trackIndex: 0 }, { id: 'right', pitch: 60, onset: 0, trackIndex: 1 }])
  const result = analyzeMidiScoreAlignment(source, reference, { globalBeatOffset: 0, partToTrackMap: { P1: 1 } })
  assert.equal(result.matches[0].midi.eventId, 'right')
})

test('candidate edge budget exhaustion fails closed instead of guessing', () => {
  const source = graph([{ pitch: 60, onset: 0 }, { pitch: 61, onset: 0 }])
  const reference = midi([{ pitch: 60, onset: 0 }, { pitch: 61, onset: 0 }])
  const result = analyzeMidiScoreAlignment(source, reference, { globalBeatOffset: 0 }, { maxCandidateEdges: 1 })
  assert.equal(result.alignment.status, 'UNALIGNED')
  assert.equal(result.diagnostics[0].details.ambiguityReason, 'MATCH_EDGE_LIMIT_EXCEEDED')
})
