import { createMidiReferenceDiagnostic } from '../../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignmentWithInstrumentContract } from './midiInstrumentContract.js'
import { reclassifyPolyphonicRepeatedPitchAmbiguity } from './polyphonicRepeatedPitchAmbiguity.js'
import { reclassifyConservativeMidiAssignmentAmbiguity } from './conservativeAssignmentAmbiguity.js'

function comparisonPitch(score) {
  return Number.isInteger(score?.comparisonPitch) ? score.comparisonPitch : score?.pitch
}

function comparisonScoreEvent(score) {
  if (!score || !Number.isInteger(comparisonPitch(score))) return score
  return Object.freeze({ ...score, pitch: comparisonPitch(score) })
}

function comparisonView(result) {
  const scoreById = new Map()
  const scoreEvents = Object.freeze((result.scoreEvents ?? []).map((score) => {
    const view = comparisonScoreEvent(score)
    scoreById.set(score.eventId, view)
    return view
  }))
  const matches = Object.freeze((result.matches ?? []).map((match) => Object.freeze({
    ...match,
    score: scoreById.get(match.score.eventId) ?? comparisonScoreEvent(match.score),
  })))
  return Object.freeze({ ...result, scoreEvents, matches })
}

function scoreMetadata(score) {
  if (!score) return {}
  return {
    ...(score.pitch == null ? {} : { scorePitch: score.pitch }),
    ...(score.comparisonPitch == null ? {} : { scoreComparisonPitch: score.comparisonPitch }),
    ...(score.scorePitchDomain == null ? {} : { scorePitchDomain: score.scorePitchDomain }),
    ...(score.writtenToSoundingSemitones == null ? {} : { writtenToSoundingSemitones: score.writtenToSoundingSemitones }),
  }
}

function restoreDiagnostic(diagnostic, originalById) {
  const scoreId = diagnostic?.details?.scoreEventId ?? diagnostic?.location?.eventId ?? null
  const original = scoreId == null ? null : originalById.get(scoreId)
  if (!original) return diagnostic
  return createMidiReferenceDiagnostic({
    code: diagnostic.code,
    location: diagnostic.location,
    details: { ...diagnostic.details, ...scoreMetadata(original) },
  })
}

/**
 * Applies the conservative MIDI ambiguity passes after explicit written-to-sounding
 * instrument mapping while preserving the public score pitch as written pitch.
 * The comparison view exists only inside this function and never mutates the source.
 */
export function analyzeMidiScoreAlignmentWithInstrumentContractConservatively(scoreGraph, midiReference, alignmentContext = {}, optionOverrides = {}) {
  const base = analyzeMidiScoreAlignmentWithInstrumentContract(scoreGraph, midiReference, alignmentContext, optionOverrides)
  if (base?.alignment?.status !== 'ALIGNED') return base

  const originalById = new Map((base.scoreEvents ?? []).map((score) => [score.eventId, score]))
  const comparison = comparisonView(base)
  const repeatedPitchSafe = reclassifyPolyphonicRepeatedPitchAmbiguity(comparison)
  const conservative = reclassifyConservativeMidiAssignmentAmbiguity(repeatedPitchSafe, scoreGraph, optionOverrides)

  const scoreEvents = Object.freeze((conservative.scoreEvents ?? []).map((score) => originalById.get(score.eventId) ?? score))
  const matches = Object.freeze((conservative.matches ?? []).map((match) => Object.freeze({
    ...match,
    score: originalById.get(match.score.eventId) ?? match.score,
  })))
  const diagnostics = Object.freeze((conservative.diagnostics ?? []).map((diagnostic) => restoreDiagnostic(diagnostic, originalById)))

  return Object.freeze({
    ...conservative,
    scoreEvents,
    matches,
    diagnostics,
    instrumentMapping: base.instrumentMapping,
  })
}
