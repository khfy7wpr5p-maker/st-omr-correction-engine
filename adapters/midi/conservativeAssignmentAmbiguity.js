import { MIDI_COMPARISON_CODE, createMidiReferenceDiagnostic } from '../../src/contracts/midiReferenceEvidence.js'
import { DEFAULT_MIDI_ALIGNMENT_OPTIONS } from './midiScoreAlignment.js'

const EPSILON = 1e-9

function locationFor(score) {
  return Object.freeze({ eventId: score.eventId, measureKey: score.measureKey, partId: score.partId, voice: score.voice, staff: score.staff })
}

function alignedMidiBeat(midi, alignment) {
  return alignment.scale * midi.startBeats + alignment.offsetBeats
}

function alignedMidiDuration(midi, alignment) {
  return Math.abs(alignment.scale) * midi.durationBeats
}

function onsetDistance(score, midi, alignment) {
  return Math.abs(alignedMidiBeat(midi, alignment) - score.globalOnsetBeats)
}

function tieTypesFor(scoreEvent) {
  const direct = Array.isArray(scoreEvent?.tieTypes) ? scoreEvent.tieTypes : []
  const metadata = Array.isArray(scoreEvent?.metadata?.tieTypes) ? scoreEvent.metadata.tieTypes : []
  return [...direct, ...metadata].map((value) => String(value).toLowerCase()).filter(Boolean)
}

function hasTieContext(scoreEvent) {
  return tieTypesFor(scoreEvent).length > 0
}

function voiceOnsetCollision(score, scoreEvents) {
  if (score.voice == null) return false
  return scoreEvents.some((other) =>
    other.eventId !== score.eventId
    && other.measureKey === score.measureKey
    && other.staff === score.staff
    && other.voice != null
    && String(other.voice) !== String(score.voice)
    && Math.abs(other.globalOnsetBeats - score.globalOnsetBeats) <= EPSILON)
}

function ambiguityDiagnostic(score, candidateMidiIds, ambiguityReason, extraDetails = {}) {
  return createMidiReferenceDiagnostic({
    code: MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH,
    location: locationFor(score),
    details: {
      scoreEventId: score.eventId,
      midiEventId: null,
      candidateMidiEventIds: Object.freeze([...new Set(candidateMidiIds)].sort()),
      pitchDeltaSemitones: null,
      onsetDeltaBeats: null,
      durationDeltaBeats: null,
      trackIndex: null,
      instrumentName: null,
      ambiguityReason,
      ...extraDetails,
    },
  })
}

function findNearbyExactPitchMidi(score, midiEvents, alignment, windowBeats, excludedMidiId = null) {
  return midiEvents
    .filter((midi) => midi.eventId !== excludedMidiId && midi.midiPitch === score.pitch && onsetDistance(score, midi, alignment) <= windowBeats + EPSILON)
    .sort((a, b) => onsetDistance(score, a, alignment) - onsetDistance(score, b, alignment) || a.eventId.localeCompare(b.eventId))
}

function originalScoreEventsById(scoreGraph) {
  return new Map((scoreGraph?.events ?? []).map((event) => [event.id, event]))
}

function metricsForConservativeResult(result, matches, diagnostics, alignment, options, durationAmbiguousScoreIds) {
  const scoreEvents = result.scoreEvents ?? []
  const midiEvents = result.midiEvents ?? []
  const ratio = (numerator, denominator) => denominator ? numerator / denominator : 0

  let pitchOk = 0
  let onsetOk = 0
  let durationOk = 0
  let durationComparable = 0
  for (const pair of matches) {
    if (pair.score.pitch === pair.midi.midiPitch) pitchOk += 1
    if (onsetDistance(pair.score, pair.midi, alignment) <= options.onsetToleranceBeats + EPSILON) onsetOk += 1
    if (!durationAmbiguousScoreIds.has(pair.score.eventId)) {
      durationComparable += 1
      if (Math.abs(alignedMidiDuration(pair.midi, alignment) - pair.score.durationBeats) <= options.durationToleranceBeats + EPSILON) durationOk += 1
    }
  }

  const ambiguousScoreIds = new Set(diagnostics
    .filter((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH && diagnostic.details?.scoreEventId)
    .map((diagnostic) => diagnostic.details.scoreEventId))
  const missingScoreIds = new Set(diagnostics
    .filter((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING && diagnostic.details?.scoreEventId)
    .map((diagnostic) => diagnostic.details.scoreEventId))
  const extraCount = diagnostics.filter((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.EXTRA_NOTE).length

  return Object.freeze({
    ...result.metrics,
    alignment_success_rate: alignment.status === 'ALIGNED' ? 1 : 0,
    event_match_coverage: ratio(matches.length, scoreEvents.length),
    pitch_agreement_rate: ratio(pitchOk, matches.length),
    onset_agreement_rate: ratio(onsetOk, matches.length),
    duration_agreement_rate: ratio(durationOk, durationComparable),
    ambiguous_match_rate: ratio(ambiguousScoreIds.size, scoreEvents.length),
    unaligned_rate: alignment.status === 'ALIGNED' ? 0 : 1,
    extra_note_diagnostic_rate: ratio(extraCount, midiEvents.length),
    missing_note_diagnostic_rate: ratio(missingScoreIds.size, scoreEvents.length),
  })
}

/**
 * Conservative second pass for notation/MIDI assignment uncertainty.
 *
 * It never creates correction authority and never changes the input ScoreGraph.
 * When a pitch-conflicting assignment has a nearby exact-pitch MIDI alternative,
 * the pair identity is not strong enough to call a pitch error: the pass abstains
 * with MIDI_AMBIGUOUS_MATCH and reserves the alternative witness from EXTRA_NOTE.
 *
 * It also treats tied score fragments as duration-incomparable to a sustained
 * MIDI note and downgrades nearby same-pitch unmatched MIDI witnesses to
 * ambiguity instead of asserting a proven extra note.
 */
export function reclassifyConservativeMidiAssignmentAmbiguity(inputResult, scoreGraph, optionOverrides = {}) {
  if (!inputResult || inputResult.alignment?.status !== 'ALIGNED' || !Array.isArray(inputResult.diagnostics)) return inputResult

  const options = Object.freeze({ ...DEFAULT_MIDI_ALIGNMENT_OPTIONS, ...optionOverrides })
  const alignment = inputResult.alignment
  const scoreEvents = inputResult.scoreEvents ?? []
  const midiEvents = inputResult.midiEvents ?? []
  const originalById = originalScoreEventsById(scoreGraph)
  const matchesByScore = new Map((inputResult.matches ?? []).map((pair) => [pair.score.eventId, pair]))
  const matchedScoreIds = new Set(matchesByScore.keys())

  const assignmentAmbiguousScoreIds = new Set()
  const assignmentAmbiguityByScore = new Map()
  const reservedMidiIds = new Set()

  for (const pair of inputResult.matches ?? []) {
    if (pair.score.pitch === pair.midi.midiPitch) continue
    const alternatives = findNearbyExactPitchMidi(pair.score, midiEvents, alignment, options.onsetWindowBeats, pair.midi.eventId)
    if (!alternatives.length) continue

    assignmentAmbiguousScoreIds.add(pair.score.eventId)
    for (const alternative of alternatives) reservedMidiIds.add(alternative.eventId)
    const reason = voiceOnsetCollision(pair.score, scoreEvents)
      ? 'VOICE_ONSET_ASSIGNMENT_CONFLICT'
      : 'PITCH_ONSET_ASSIGNMENT_CONFLICT'
    assignmentAmbiguityByScore.set(pair.score.eventId, ambiguityDiagnostic(
      pair.score,
      [pair.midi.eventId, ...alternatives.map((midi) => midi.eventId)],
      reason,
      {
        baselineMidiEventId: pair.midi.eventId,
        exactPitchAlternativeCount: alternatives.length,
        conservativeAbstention: true,
      },
    ))
  }

  const matches = (inputResult.matches ?? []).filter((pair) => !assignmentAmbiguousScoreIds.has(pair.score.eventId))
  const durationAmbiguousScoreIds = new Set()
  const diagnostics = []
  const emittedAssignmentAmbiguity = new Set()

  for (const diagnostic of inputResult.diagnostics) {
    const scoreId = diagnostic.details?.scoreEventId ?? null
    if (scoreId && assignmentAmbiguousScoreIds.has(scoreId)) {
      if (!emittedAssignmentAmbiguity.has(scoreId)) {
        diagnostics.push(assignmentAmbiguityByScore.get(scoreId))
        emittedAssignmentAmbiguity.add(scoreId)
      }
      continue
    }

    if (diagnostic.code === MIDI_COMPARISON_CODE.DURATION_CONFLICT && scoreId) {
      const original = originalById.get(scoreId)
      if (hasTieContext(original)) {
        const score = (matchesByScore.get(scoreId) ?? {}).score ?? scoreEvents.find((event) => event.eventId === scoreId)
        if (score) {
          durationAmbiguousScoreIds.add(scoreId)
          diagnostics.push(ambiguityDiagnostic(
            score,
            diagnostic.details?.midiEventId ? [diagnostic.details.midiEventId] : [],
            'TIED_DURATION_REPRESENTATION',
            { conservativeAbstention: true, tieTypes: Object.freeze(tieTypesFor(original)) },
          ))
          continue
        }
      }
    }

    diagnostics.push(diagnostic)
  }

  const scoreHasMissingDiagnostic = new Set(diagnostics
    .filter((diagnostic) => diagnostic.code === MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING && diagnostic.details?.scoreEventId)
    .map((diagnostic) => diagnostic.details.scoreEventId))

  const finalDiagnostics = diagnostics.map((diagnostic) => {
    if (diagnostic.code !== MIDI_COMPARISON_CODE.EXTRA_NOTE) return diagnostic
    const midiId = diagnostic.details?.midiEventId
    const midi = midiEvents.find((event) => event.eventId === midiId)
    if (!midi) return diagnostic

    const candidates = scoreEvents
      .filter((score) => score.pitch === midi.midiPitch && onsetDistance(score, midi, alignment) <= options.onsetWindowBeats + EPSILON)
      .sort((a, b) => onsetDistance(a, midi, alignment) - onsetDistance(b, midi, alignment) || a.eventId.localeCompare(b.eventId))
    const score = candidates.find((candidate) =>
      reservedMidiIds.has(midi.eventId)
      || assignmentAmbiguousScoreIds.has(candidate.eventId)
      || matchedScoreIds.has(candidate.eventId)
      || scoreHasMissingDiagnostic.has(candidate.eventId))
    if (!score) return diagnostic

    return ambiguityDiagnostic(
      score,
      [midi.eventId],
      'UNMATCHED_MIDI_NEAR_SCORE_WITNESS',
      {
        midiEventId: midi.eventId,
        conservativeAbstention: true,
        exactPitchOnsetDistanceBeats: Number(onsetDistance(score, midi, alignment).toFixed(9)),
      },
    )
  })

  const metrics = metricsForConservativeResult(inputResult, matches, finalDiagnostics, alignment, options, durationAmbiguousScoreIds)
  return Object.freeze({
    ...inputResult,
    matches: Object.freeze(matches),
    diagnostics: Object.freeze(finalDiagnostics),
    metrics,
  })
}
