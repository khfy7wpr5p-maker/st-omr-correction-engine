import { MIDI_COMPARISON_CODE, createMidiReferenceDiagnostic } from '../../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignment } from './midiScoreAlignment.js'
import { reclassifyConservativeMidiAssignmentAmbiguity } from './conservativeAssignmentAmbiguity.js'

const EPSILON = 1e-9

function sameOnset(a, b) {
  return Math.abs(a.globalOnsetBeats - b.globalOnsetBeats) <= EPSILON
}

function isDistinctVoice(a, b) {
  return a.voice != null && b.voice != null && String(a.voice) !== String(b.voice)
}

function sameVoice(a, b) {
  return a.voice != null && b.voice != null && String(a.voice) === String(b.voice)
}

function locationFor(score) {
  return Object.freeze({ eventId: score.eventId, measureKey: score.measureKey, partId: score.partId, voice: score.voice, staff: score.staff })
}

function diagnosticWithReason(code, score, details, ambiguityReason) {
  return createMidiReferenceDiagnostic({
    code,
    location: locationFor(score),
    details: {
      scoreEventId: score.eventId,
      midiEventId: null,
      candidateMidiEventIds: details?.candidateMidiEventIds ?? Object.freeze([]),
      pitchDeltaSemitones: null,
      onsetDeltaBeats: null,
      durationDeltaBeats: null,
      trackIndex: details?.trackIndex ?? null,
      instrumentName: details?.instrumentName ?? null,
      ambiguityReason,
    },
  })
}

/**
 * The global one-to-one matcher can legitimately report a near tie when two
 * score events compete for one MIDI event. For distinct notation voices that
 * may represent a MIDI serialization collapse; for the same notation voice it
 * is instead a multiplicity mismatch. Keep one deterministic identity
 * ambiguous, but preserve the remaining same-voice duplicate(s) as missing so
 * the conservative polyphonic pass cannot hide a genuine duplicate count.
 */
function preserveSameVoiceDuplicateMultiplicity(result) {
  const scoreById = new Map((result.scoreEvents ?? []).map((event) => [event.eventId, event]))
  const groups = new Map()

  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.code !== MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH) continue
    if (diagnostic.details?.ambiguityReason !== 'GLOBAL_ASSIGNMENT_NEAR_TIE') continue
    const score = scoreById.get(diagnostic.details?.scoreEventId)
    const candidateIds = [...(diagnostic.details?.candidateMidiEventIds ?? [])].sort()
    if (!score || candidateIds.length !== 1) continue
    const key = `${candidateIds[0]}\u0000${score.pitch}\u0000${score.globalOnsetBeats}\u0000${score.voice ?? ''}`
    const group = groups.get(key) ?? []
    group.push({ diagnostic, score })
    groups.set(key, group)
  }

  const toMissing = new Set()
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const [first, ...rest] = [...group].sort((a, b) => a.score.eventId.localeCompare(b.score.eventId))
    if (!rest.every((item) => sameVoice(first.score, item.score) && item.score.pitch === first.score.pitch && sameOnset(first.score, item.score))) continue
    for (const item of rest) toMissing.add(item.score.eventId)
  }
  if (!toMissing.size) return result

  const diagnostics = result.diagnostics.map((diagnostic) => {
    const scoreId = diagnostic.details?.scoreEventId
    if (!toMissing.has(scoreId)) return diagnostic
    const score = scoreById.get(scoreId)
    return diagnosticWithReason(MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING, score, diagnostic.details, 'SAME_VOICE_DUPLICATE_MULTIPLICITY')
  })

  const scoreCount = Math.max(1, result.scoreEvents?.length ?? 0)
  const previousAmbiguous = Math.round((result.metrics?.ambiguous_match_rate ?? 0) * scoreCount)
  const previousMissing = Math.round((result.metrics?.missing_note_diagnostic_rate ?? 0) * scoreCount)
  const metrics = Object.freeze({
    ...result.metrics,
    ambiguous_match_rate: Math.max(0, previousAmbiguous - toMissing.size) / scoreCount,
    missing_note_diagnostic_rate: (previousMissing + toMissing.size) / scoreCount,
  })
  return Object.freeze({ ...result, diagnostics: Object.freeze(diagnostics), metrics })
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
export function reclassifyPolyphonicRepeatedPitchAmbiguity(inputResult) {
  if (!inputResult || inputResult.alignment?.status !== 'ALIGNED' || !Array.isArray(inputResult.diagnostics)) return inputResult

  const result = preserveSameVoiceDuplicateMultiplicity(inputResult)
  const scoreById = new Map((result.scoreEvents ?? []).map((event) => [event.eventId, event]))
  const exactWitnesses = (result.matches ?? []).filter(({ score, midi }) =>
    score.pitch === midi.midiPitch && Math.abs((result.alignment.scale * midi.startBeats + result.alignment.offsetBeats) - score.globalOnsetBeats) <= EPSILON)

  let reclassified = 0
  const diagnostics = result.diagnostics.map((diagnostic) => {
    if (diagnostic.code !== MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING) return diagnostic
    if (diagnostic.details?.ambiguityReason === 'SAME_VOICE_DUPLICATE_MULTIPLICITY') return diagnostic
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
  const polyphonic = reclassifyPolyphonicRepeatedPitchAmbiguity(
    analyzeMidiScoreAlignment(scoreGraph, midiReference, alignmentContext, optionOverrides),
  )
  return reclassifyConservativeMidiAssignmentAmbiguity(polyphonic, scoreGraph, optionOverrides)
}
