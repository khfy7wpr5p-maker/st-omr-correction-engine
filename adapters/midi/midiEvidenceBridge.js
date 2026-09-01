import { createHash } from 'node:crypto'
import { EVIDENCE_SOURCE, createEvidence } from '../../src/contracts/evidence.js'
import { MIDI_COMPARISON_CODE, createMidiReferenceDiagnostic } from '../../src/contracts/midiReferenceEvidence.js'
import { loadMidiReference } from './midiReferenceAdapter.js'
import { analyzeMidiScoreAlignmentWithInstrumentContract } from './midiInstrumentContract.js'

function scoreFingerprint(scoreGraph) {
  return createHash('sha256').update(JSON.stringify(scoreGraph)).digest('hex')
}

function midiBytesSnapshot(input) {
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) return Buffer.from(input)
  return null
}

function toEvidence(diagnostic, midiReference, alignmentConfidence) {
  const raw = diagnostic.details ?? {}
  const details = Object.freeze({
    provider: 'midi_reference',
    midiSourceId: midiReference.sourceId,
    midiSourceType: midiReference.sourceType,
    midiSha256: midiReference.sha256 ?? null,
    scoreEventId: raw.scoreEventId ?? null,
    midiEventId: raw.midiEventId ?? null,
    comparisonCode: diagnostic.code,
    pitchDeltaSemitones: raw.pitchDeltaSemitones ?? null,
    onsetDeltaBeats: raw.onsetDeltaBeats ?? null,
    durationDeltaBeats: raw.durationDeltaBeats ?? null,
    alignmentConfidence: Number.isFinite(alignmentConfidence) ? alignmentConfidence : 0,
    ambiguityReason: raw.ambiguityReason ?? null,
    trackIndex: raw.trackIndex ?? null,
    instrumentName: raw.instrumentName ?? null,
    authority: 'SHADOW_EVIDENCE_ONLY',
    ...(raw.scorePitch == null ? {} : { scorePitch: raw.scorePitch }),
    ...(raw.scoreComparisonPitch == null ? {} : { scoreComparisonPitch: raw.scoreComparisonPitch }),
    ...(raw.scorePitchDomain == null ? {} : { scorePitchDomain: raw.scorePitchDomain }),
    ...(raw.writtenToSoundingSemitones == null ? {} : { writtenToSoundingSemitones: raw.writtenToSoundingSemitones }),
    ...(raw.scorePartId == null ? {} : { scorePartId: raw.scorePartId }),
    ...(raw.scoreInstrumentId == null ? {} : { scoreInstrumentId: raw.scoreInstrumentId }),
    ...(raw.scoreInstrumentName == null ? {} : { scoreInstrumentName: raw.scoreInstrumentName }),
    ...(raw.midiPitch == null ? {} : { midiPitch: raw.midiPitch }),
    ...(raw.candidateMidiEventIds == null ? {} : { candidateMidiEventIds: raw.candidateMidiEventIds }),
    ...(raw.sustainContext == null ? {} : { sustainContext: raw.sustainContext }),
  })
  return createEvidence({ source: EVIDENCE_SOURCE.SYMBOLIC, code: diagnostic.code, weight: 0, location: diagnostic.location, details })
}

function parserFailureAnalysis(parsed) {
  const diagnostic = createMidiReferenceDiagnostic({
    code: parsed.comparisonCode ?? MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT,
    details: {
      scoreEventId: null,
      midiEventId: null,
      pitchDeltaSemitones: null,
      onsetDeltaBeats: null,
      durationDeltaBeats: null,
      trackIndex: null,
      instrumentName: null,
      ambiguityReason: parsed.reason ?? 'MIDI_PARSE_FAILED',
    },
  })
  return Object.freeze({
    alignment: Object.freeze({ status: 'UNSUPPORTED', reason: parsed.reason ?? 'MIDI_PARSE_FAILED', confidence: 0 }),
    diagnostics: Object.freeze([diagnostic]),
    metrics: Object.freeze({
      alignment_success_rate: 0,
      event_match_coverage: 0,
      pitch_agreement_rate: 0,
      onset_agreement_rate: 0,
      duration_agreement_rate: 0,
      ambiguous_match_rate: 0,
      unaligned_rate: 1,
      extra_note_diagnostic_rate: 0,
      missing_note_diagnostic_rate: 0,
    }),
    instrumentMapping: null,
  })
}

export function analyzeMidiReferenceEvidence({ scoreGraph, midiInput, provenance, alignmentContext = {}, options = {} }) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')
  const scoreBefore = scoreFingerprint(scoreGraph)
  const midiBefore = midiBytesSnapshot(midiInput)
  const midiReference = loadMidiReference(midiInput, provenance)
  const analysis = midiReference.ok
    ? analyzeMidiScoreAlignmentWithInstrumentContract(scoreGraph, midiReference, alignmentContext, options)
    : parserFailureAnalysis(midiReference)

  const scoreAfter = scoreFingerprint(scoreGraph)
  const scoreUnchanged = scoreBefore === scoreAfter
  const midiBytesUnchanged = midiBefore ? midiBefore.equals(Buffer.from(midiInput)) : true
  if (!scoreUnchanged || !midiBytesUnchanged) throw new Error('CE-MIDI source immutability invariant failed.')

  const evidence = Object.freeze(analysis.diagnostics.map((diagnostic) => toEvidence(diagnostic, midiReference, analysis.alignment?.confidence ?? 0)))
  return Object.freeze({
    mode: 'SHADOW_ONLY',
    authority: 'SHADOW_EVIDENCE_ONLY',
    sourceGraph: scoreGraph,
    midiReference: Object.freeze({
      sourceId: midiReference.sourceId,
      sourceType: midiReference.sourceType,
      sha256: midiReference.sha256 ?? null,
      format: midiReference.format ?? midiReference.header?.format ?? null,
      ppq: midiReference.ppq ?? midiReference.header?.ppq ?? null,
    }),
    instrumentMapping: analysis.instrumentMapping ?? null,
    alignment: analysis.alignment,
    diagnostics: analysis.diagnostics,
    evidence,
    metrics: analysis.metrics,
    invariants: Object.freeze({
      scoreUnchanged,
      midiBytesUnchanged,
      sourceMutation: false,
      automaticCorrectionAuthority: false,
      correctionPatchesProduced: false,
    }),
  })
}
