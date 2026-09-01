import { MIDI_REFERENCE_SOURCE_TYPE } from '../contracts/midiReferenceEvidence.js'
import { MIDI_EVALUATION_ORACLE_TYPE } from './midiEvidenceBenchmark.js'
import { evaluateConfidenceCalibration } from './confidenceCalibration.js'
import { evaluateSelectivePrediction } from './selectivePredictionMetrics.js'

export const MIDI_RELIABILITY_STATUS = Object.freeze({
  INSUFFICIENT_TEACHER_GOLD: 'INSUFFICIENT_TEACHER_GOLD',
  MEASURED_TEACHER_GOLD: 'MEASURED_TEACHER_GOLD',
})

export const MIDI_RELIABILITY_REQUIRED_SOURCE_TYPES = Object.freeze([
  MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
  MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED,
])

function validVerification(benchmarkCase) {
  const verification = benchmarkCase?.verification
  return benchmarkCase?.oracleType === MIDI_EVALUATION_ORACLE_TYPE.TEACHER_VERIFIED
    && verification?.approved === true
    && typeof verification.verifierId === 'string'
    && verification.verifierId.trim().length > 0
    && typeof verification.reviewedAt === 'string'
    && verification.reviewedAt.trim().length > 0
}

function freezeIds(values) {
  return Object.freeze([...values].sort((a, b) => a.localeCompare(b)))
}

function reportCaseMap(benchmarkReport) {
  if (!benchmarkReport || typeof benchmarkReport !== 'object') throw new TypeError('benchmarkReport is required.')
  if (!Array.isArray(benchmarkReport.cases)) throw new TypeError('benchmarkReport.cases must be an array.')
  const map = new Map()
  for (const result of benchmarkReport.cases) {
    if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new TypeError('benchmark report cases require ids.')
    if (map.has(result.id)) throw new TypeError(`Duplicate benchmark report case id: ${result.id}`)
    map.set(result.id, result)
  }
  return map
}

function teacherGoldCaseMap(benchmarkCases) {
  if (!Array.isArray(benchmarkCases)) throw new TypeError('benchmarkCases must be an array.')
  const map = new Map()
  for (const benchmarkCase of benchmarkCases) {
    if (!benchmarkCase || typeof benchmarkCase.id !== 'string' || !benchmarkCase.id.trim()) throw new TypeError('benchmarkCases require ids.')
    if (map.has(benchmarkCase.id)) throw new TypeError(`Duplicate benchmark case id: ${benchmarkCase.id}`)
    map.set(benchmarkCase.id, benchmarkCase)
  }
  return map
}

function measurementRecord(benchmarkCase, result) {
  if (!validVerification(benchmarkCase)) return null
  if (benchmarkCase.sourceType !== result.sourceType || benchmarkCase.oracleType !== result.oracleType) {
    throw new TypeError(`Benchmark result identity mismatch for case ${benchmarkCase.id}.`)
  }
  if (!Number.isFinite(result.alignmentConfidence) || result.alignmentConfidence < 0 || result.alignmentConfidence > 1) {
    return null
  }
  if (typeof result.exactLabelSetMatch !== 'boolean') throw new TypeError(`Benchmark case ${benchmarkCase.id} is missing exactLabelSetMatch.`)
  return Object.freeze({
    id: benchmarkCase.id,
    confidence: result.alignmentConfidence,
    correct: result.exactLabelSetMatch,
    sourceType: benchmarkCase.sourceType,
    verifierId: benchmarkCase.verification.verifierId,
    reviewedAt: benchmarkCase.verification.reviewedAt,
  })
}

function emptySourceMeasurement(sourceType, reasons) {
  return Object.freeze({
    sourceType,
    status: MIDI_RELIABILITY_STATUS.INSUFFICIENT_TEACHER_GOLD,
    teacherGoldCases: 0,
    measuredCaseIds: Object.freeze([]),
    excludedCaseIds: Object.freeze([]),
    exclusionReasons: Object.freeze([...reasons]),
    calibration: null,
    selectivePrediction: null,
    benchmarkMetrics: null,
  })
}

function sourceMeasurement(sourceType, benchmarkCases, benchmarkReport, caseResults, options) {
  const sourceCases = [...benchmarkCases.values()].filter((item) => item.sourceType === sourceType)
  const teacherCases = sourceCases.filter(validVerification)
  const records = []
  const excluded = []
  const exclusionReasons = new Set()

  for (const benchmarkCase of teacherCases) {
    const result = caseResults.get(benchmarkCase.id)
    if (!result) {
      excluded.push(benchmarkCase.id)
      exclusionReasons.add('MISSING_BENCHMARK_RESULT')
      continue
    }
    const record = measurementRecord(benchmarkCase, result)
    if (!record) {
      excluded.push(benchmarkCase.id)
      exclusionReasons.add('MISSING_BOUNDED_ALIGNMENT_CONFIDENCE')
      continue
    }
    records.push(record)
  }

  if (!records.length) {
    if (!teacherCases.length) exclusionReasons.add('NO_TEACHER_VERIFIED_CASES')
    const empty = emptySourceMeasurement(sourceType, exclusionReasons)
    return Object.freeze({ ...empty, excludedCaseIds: freezeIds(excluded) })
  }

  const calibration = evaluateConfidenceCalibration(records, { binCount: options.binCount })
  const selectivePrediction = evaluateSelectivePrediction(records, { thresholds: options.thresholds })
  return Object.freeze({
    sourceType,
    status: MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD,
    teacherGoldCases: records.length,
    measuredCaseIds: freezeIds(records.map((item) => item.id)),
    excludedCaseIds: freezeIds(excluded),
    exclusionReasons: Object.freeze([...exclusionReasons].sort()),
    calibration,
    selectivePrediction,
    benchmarkMetrics: benchmarkReport.bySourceType?.[sourceType] ?? null,
  })
}

export function createMidiTeacherGoldReliabilityReport({
  benchmarkCases,
  benchmarkReport,
  binCount = 10,
  thresholds = [0, 0.5, 0.75, 0.9, 0.95],
} = {}) {
  if (!Number.isInteger(binCount) || binCount < 2 || binCount > 100) throw new TypeError('binCount must be an integer between 2 and 100.')
  if (!Array.isArray(thresholds) || !thresholds.length || thresholds.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new TypeError('thresholds must be a non-empty array of values in [0,1].')
  }
  const cases = teacherGoldCaseMap(benchmarkCases)
  const results = reportCaseMap(benchmarkReport)
  if (benchmarkReport.authority !== 'EVALUATION_ONLY' || benchmarkReport.automaticCorrectionAuthority !== false) {
    throw new TypeError('MIDI reliability calibration requires an evaluation-only benchmark report.')
  }

  for (const result of results.values()) {
    if (!cases.has(result.id)) throw new TypeError(`Benchmark result has no matching case: ${result.id}`)
  }

  const bySourceType = {}
  for (const sourceType of MIDI_RELIABILITY_REQUIRED_SOURCE_TYPES) {
    bySourceType[sourceType] = sourceMeasurement(sourceType, cases, benchmarkReport, results, { binCount, thresholds })
  }

  const missingSourceTypes = MIDI_RELIABILITY_REQUIRED_SOURCE_TYPES.filter(
    (sourceType) => bySourceType[sourceType].status !== MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD,
  )
  const status = missingSourceTypes.length
    ? MIDI_RELIABILITY_STATUS.INSUFFICIENT_TEACHER_GOLD
    : MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD

  return Object.freeze({
    schema: 'st_omr_midi_teacher_gold_reliability',
    version: '1.0.0',
    status,
    teacherGoldOnly: true,
    requiredSourceTypes: MIDI_RELIABILITY_REQUIRED_SOURCE_TYPES,
    missingSourceTypes: Object.freeze(missingSourceTypes),
    bySourceType: Object.freeze(bySourceType),
    measuredReliabilityAvailable: status === MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD,
    productionReadiness: 'NOT_AUTHORIZED',
    productionThreshold: null,
    recommendedEvidenceWeight: null,
    evidenceWeightApplied: 0,
    authority: 'RESEARCH_ONLY',
    automaticCorrectionAuthority: false,
    correctionPatchesProduced: false,
  })
}
