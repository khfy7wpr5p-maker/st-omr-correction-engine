import { MIDI_COMPARISON_CODE, createMidiReferenceDiagnostic } from '../../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignment } from './midiScoreAlignment.js'

const EPSILON = 1e-9

function sameOnset(a, b) {
  return Math.abs(a.globalOnsetBeats - b.globalOnsetBeats) <= EPSILON
}

function isDistinctVoice(a, b) {
  return a.voice != null && b.voice != null && String(a.voice) !== String(b.voice)
}

function locationFor(score) {
  return Object.freeze({ eventId: score.eventId, measureKey: score.measureKey, partId: score.partId, voice: score.voice, staff: score.staff })
}

/**
 * MIDI has no notation-voice identity. If two score voices contain the same
 * sounding pitch at the exact same onset, a standards-compliant MIDI may
 * serialize that musical coincidence as a single note event. A one-to-one
 * matcher must not call the second score voice "missing" when the one MIDI
 * event is already an exact pitch/onset witness for the coincident voice.
 *
 * This pass is deliberately conservative: it only reclassifies an existing
 * SCORE_NOTE_MISSING diagnostic when a matched score event has identical
 * pitch + global onset and an explicitly different voice. It never creates a
 * match, never changes the score, and never grants correction authority.
 */
export function reclassifyPolyphonicRepeatedPitchAmbiguity(result) {
  if (!result || result.alignment?.status !== 'ALIGNED' || !Array.isArray(result.diagnostics)) return result

  const scoreById = new Map((result.scoreEvents ?? []).map((event) => [event.eventId, event]))
  const exactWitnesses = (result.matches ?? []).filter(({ score, midi }) =>
    score.pitch === midi.midiPitch && Math.abs((result.alignment.scale * midi.startBeats + result.alignment.offsetBeats) - score.globalOnsetBeats) <= EPSILON)

  let reclassified = 0
  const diagnostics = result.diagnostics.map((diagnostic) => {
    if (diagnostic.code !== MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING) return diagnostic
    const score = scoreById.get(diagnostic.details?.scoreEventId)
    if (!score) return diagnostic

    const witness = exactWitnesses.find(({ score: matchedScore }) =>
      matchedScore.pitch === score.pitch && sameOnset(matchedScore, score) && isDistinctVoice(matchedScore, score))
    if (!witness) return diagnostic

    reclassified += 1
    return createMidiReferenceDiagnostic({
      code: MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH,
      location: locationFor(score),
      details: {
        scoreEventId: score.eventId,
        midiEventId: null,
        candidateMidiEventIds: Object.freeze([witness.midi.eventId]),
        pitchDeltaSemitones: null,
        onsetDeltaBeats: null,
        durationDeltaBeats: null,
        trackIndex: witness.midi.trackIndex,
        instrumentName: witness.midi.instrumentName ?? null,
        ambiguityReason: 'POLYPHONIC_SAME_PITCH_MIDI_COLLAPSE',
      },
    })
  })

  if (!reclassified) return result
  const scoreCount = Math.max(1, result.scoreEvents?.length ?? 0)
  const previousAmbiguous = Math.round((result.metrics?.ambiguous_match_rate ?? 0) * scoreCount)
  const previousMissing = Math.round((result.metrics?.missing_note_diagnostic_rate ?? 0) * scoreCount)
  const metrics = Object.freeze({
    ...result.metrics,
    ambiguous_match_rate: (previousAmbiguous + reclassified) / scoreCount,
    missing_note_diagnostic_rate: Math.max(0, previousMissing - reclassified) / scoreCount,
  })

  return Object.freeze({ ...result, diagnostics: Object.freeze(diagnostics), metrics })
}

export function analyzeMidiScoreAlignmentConservatively(scoreGraph, midiReference, alignmentContext = {}, optionOverrides = {}) {
  return reclassifyPolyphonicRepeatedPitchAmbiguity(
    analyzeMidiScoreAlignment(scoreGraph, midiReference, alignmentContext, optionOverrides),
  )
}
