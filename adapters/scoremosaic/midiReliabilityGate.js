import { MIDI_REFERENCE_SOURCE_TYPE } from '../../src/contracts/midiReferenceEvidence.js'
import {
  MIDI_RELIABILITY_REQUIRED_SOURCE_TYPES,
  MIDI_RELIABILITY_STATUS,
} from '../../src/benchmark/midiTeacherGoldReliability.js'
import { createScoreMosaicShadowEvidencePacket } from './shadowAdapter.js'

export const SCOREMOSAIC_MIDI_INTEGRATION_STATUS = Object.freeze({
  BLOCKED: 'BLOCKED',
  SHADOW_ENABLED: 'SHADOW_ENABLED',
})

export const SCOREMOSAIC_MIDI_SHADOW_BOUNDARIES = Object.freeze({
  midiWinnerSelection: false,
  midiQuorumMutation: false,
  midiCandidateDeletion: false,
  midiTeacherRevisionMutation: false,
  midiMusicXmlMerge: false,
  midiPatchApplication: false,
  midiCorrectionAuthority: false,
  midiEvidenceWeightOverride: false,
})

function validMeasuredStratum(report, sourceType) {
  const stratum = report?.bySourceType?.[sourceType]
  return stratum?.sourceType === sourceType
    && stratum?.status === MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD
    && Number.isInteger(stratum?.teacherGoldCases)
    && stratum.teacherGoldCases > 0
    && stratum.calibration?.sampleCount === stratum.teacherGoldCases
    && Array.isArray(stratum.selectivePrediction?.curve)
}

export function evaluateMidiHostReliabilityGate(reliabilityReport) {
  if (!reliabilityReport || typeof reliabilityReport !== 'object') {
    return Object.freeze({ allowed: false, reason: 'MIDI_RELIABILITY_REPORT_REQUIRED' })
  }
  if (reliabilityReport.schema !== 'st_omr_midi_teacher_gold_reliability'
    || reliabilityReport.status !== MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD
    || reliabilityReport.teacherGoldOnly !== true
    || reliabilityReport.measuredReliabilityAvailable !== true) {
    return Object.freeze({ allowed: false, reason: 'MIDI_RELIABILITY_NOT_MEASURED' })
  }
  if (reliabilityReport.automaticCorrectionAuthority !== false
    || reliabilityReport.correctionPatchesProduced !== false
    || reliabilityReport.recommendedEvidenceWeight !== null
    || reliabilityReport.productionThreshold !== null
    || reliabilityReport.evidenceWeightApplied !== 0) {
    return Object.freeze({ allowed: false, reason: 'MIDI_RELIABILITY_AUTHORITY_VIOLATION' })
  }
  const required = new Set(reliabilityReport.requiredSourceTypes ?? [])
  if (MIDI_RELIABILITY_REQUIRED_SOURCE_TYPES.some((sourceType) => !required.has(sourceType))) {
    return Object.freeze({ allowed: false, reason: 'MIDI_RELIABILITY_REQUIRED_STRATA_MISSING' })
  }
  for (const sourceType of MIDI_RELIABILITY_REQUIRED_SOURCE_TYPES) {
    if (!validMeasuredStratum(reliabilityReport, sourceType)) {
      return Object.freeze({ allowed: false, reason: 'MIDI_RELIABILITY_REQUIRED_STRATA_MISSING', sourceType })
    }
  }
  return Object.freeze({ allowed: true, reason: null })
}

function validateMidiShadowResult(midiEvidenceResult, scoreGraph) {
  if (!midiEvidenceResult || typeof midiEvidenceResult !== 'object') throw new TypeError('midiEvidenceResult is required after reliability is measured.')
  if (midiEvidenceResult.mode !== 'SHADOW_ONLY' || midiEvidenceResult.authority !== 'SHADOW_EVIDENCE_ONLY') {
    throw new TypeError('ScoreMosaic MIDI integration accepts shadow-only MIDI evidence results.')
  }
  if (midiEvidenceResult.sourceGraph !== scoreGraph) throw new TypeError('MIDI evidence result must preserve the exact ScoreGraph identity.')
  if (midiEvidenceResult.invariants?.automaticCorrectionAuthority !== false
    || midiEvidenceResult.invariants?.correctionPatchesProduced !== false
    || midiEvidenceResult.invariants?.scoreUnchanged !== true
    || midiEvidenceResult.invariants?.midiBytesUnchanged !== true) {
    throw new TypeError('MIDI evidence result violates required immutability/authority invariants.')
  }
  if (!Array.isArray(midiEvidenceResult.evidence) || midiEvidenceResult.evidence.some((item) => item?.weight !== 0)) {
    throw new TypeError('ScoreMosaic MIDI integration only accepts weight-zero MIDI evidence.')
  }
  const sourceType = midiEvidenceResult.midiReference?.sourceType
  if (![MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED].includes(sourceType)) {
    throw new TypeError('ScoreMosaic MIDI integration requires a calibrated MIDI reference source type.')
  }
  return sourceType
}

export function createScoreMosaicMidiShadowEvidencePacket({
  scoreGraph,
  canonicalDisagreements = [],
  scoreMosaicRef = null,
  midiEvidenceResult = null,
  midiReliabilityReport = null,
} = {}) {
  const basePacket = createScoreMosaicShadowEvidencePacket({ scoreGraph, canonicalDisagreements, scoreMosaicRef })
  const gate = evaluateMidiHostReliabilityGate(midiReliabilityReport)
  if (!gate.allowed) {
    return Object.freeze({
      ...basePacket,
      midiIntegration: Object.freeze({
        status: SCOREMOSAIC_MIDI_INTEGRATION_STATUS.BLOCKED,
        reason: gate.reason,
        sourceType: gate.sourceType ?? null,
        measuredReliabilityRequired: true,
      }),
      midiEvidence: Object.freeze([]),
      midiDiagnostics: Object.freeze([]),
      midiBoundaries: SCOREMOSAIC_MIDI_SHADOW_BOUNDARIES,
    })
  }

  const sourceType = validateMidiShadowResult(midiEvidenceResult, scoreGraph)
  const sourceReliability = midiReliabilityReport.bySourceType[sourceType]
  return Object.freeze({
    ...basePacket,
    midiIntegration: Object.freeze({
      status: SCOREMOSAIC_MIDI_INTEGRATION_STATUS.SHADOW_ENABLED,
      reason: null,
      sourceType,
      measuredReliabilityRequired: true,
      teacherGoldCasesForSource: sourceReliability.teacherGoldCases,
      reliabilityReportVersion: midiReliabilityReport.version,
    }),
    midiEvidence: Object.freeze([...midiEvidenceResult.evidence]),
    midiDiagnostics: Object.freeze([...(midiEvidenceResult.diagnostics ?? [])]),
    midiBoundaries: SCOREMOSAIC_MIDI_SHADOW_BOUNDARIES,
  })
}
