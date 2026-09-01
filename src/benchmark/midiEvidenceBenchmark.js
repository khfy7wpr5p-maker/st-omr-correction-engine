import { MIDI_COMPARISON_CODE, MIDI_REFERENCE_SOURCE_TYPE, isMidiComparisonCode, isMidiReferenceSourceType } from '../contracts/midiReferenceEvidence.js'

export const MIDI_EVALUATION_ORACLE_TYPE = Object.freeze({
  PROGRAMMATIC_ORACLE: 'PROGRAMMATIC_ORACLE',
  TEACHER_VERIFIED: 'TEACHER_VERIFIED',
  INDEPENDENT_REFERENCE: 'INDEPENDENT_REFERENCE',
})

const DIAGNOSTIC_CODES = Object.freeze([
  MIDI_COMPARISON_CODE.PITCH_CONFLICT,
  MIDI_COMPARISON_CODE.ONSET_CONFLICT,
  MIDI_COMPARISON_CODE.DURATION_CONFLICT,
  MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING,
  MIDI_COMPARISON_CODE.EXTRA_NOTE,
  MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH,
  MIDI_COMPARISON_CODE.UNALIGNED,
  MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT,
])

function freezeExpectedDiagnostic(item) {
  if (!item || !isMidiComparisonCode(item.code)) throw new TypeError('Expected diagnostic requires a valid MIDI comparison code.')
  if (!DIAGNOSTIC_CODES.includes(item.code)) throw new TypeError('Agreement-only codes are not benchmark labels.')
  return Object.freeze({ code: item.code, scoreEventId: item.scoreEventId ?? null, midiEventId: item.midiEventId ?? null })
}

function diagnosticKey(item) {
  return JSON.stringify([item.code, item.scoreEventId ?? item.location?.eventId ?? item.details?.scoreEventId ?? null, item.midiEventId ?? item.details?.midiEventId ?? null])
}

function metricRatio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null
}

function validateOracleVerification(oracleType, verification) {
  if (oracleType === MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE) return null
  if (!verification || typeof verification !== 'object') throw new TypeError('Non-programmatic MIDI oracle requires verification metadata.')
  if (oracleType === MIDI_EVALUATION_ORACLE_TYPE.TEACHER_VERIFIED) {
    if (verification.approved !== true || typeof verification.verifierId !== 'string' || !verification.verifierId.trim() || typeof verification.reviewedAt !== 'string' || !verification.reviewedAt.trim()) {
      throw new TypeError('Teacher-verified MIDI oracle requires approved verifierId and reviewedAt metadata.')
    }
  }
  if (oracleType === MIDI_EVALUATION_ORACLE_TYPE.INDEPENDENT_REFERENCE && verification.independenceVerified !== true) {
    throw new TypeError('Independent MIDI oracle requires explicit independence verification.')
  }
  return Object.freeze({ ...verification })
}

export function createMidiEvaluationCase({ id, sourceType, oracleType, input, expectedDiagnostics = [], rights = null, provenance = null, verification = null }) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('MIDI evaluation case id is required.')
  if (!isMidiReferenceSourceType(sourceType)) throw new TypeError('Valid MIDI sourceType is required.')
  if (!Object.values(MIDI_EVALUATION_ORACLE_TYPE).includes(oracleType)) throw new TypeError('Valid oracleType is required.')
  if (!input || typeof input !== 'object') throw new TypeError('MIDI evaluation input is required.')
  if (!Array.isArray(expectedDiagnostics)) throw new TypeError('expectedDiagnostics must be an array.')
  if (sourceType === MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED && oracleType === MIDI_EVALUATION_ORACLE_TYPE.INDEPENDENT_REFERENCE) {
    throw new TypeError('Audio-derived MIDI cannot itself be treated as an independent ground-truth oracle.')
  }
  const frozenVerification = validateOracleVerification(oracleType, verification)
  return Object.freeze({
    id: id.trim(), sourceType, oracleType, input,
    expectedDiagnostics: Object.freeze(expectedDiagnostics.map(freezeExpectedDiagnostic)),
    rights: rights ? Object.freeze({ ...rights }) : null,
    provenance: provenance ? Object.freeze({ ...provenance }) : null,
    verification: frozenVerification,
  })
}

function evaluateCase(expectedDiagnostics, actualDiagnostics) {
  const expected = new Set(expectedDiagnostics.map(diagnosticKey))
  const actual = new Set((actualDiagnostics ?? []).filter((item) => DIAGNOSTIC_CODES.includes(item?.code)).map(diagnosticKey))
  let truePositive = 0
  for (const key of actual) if (expected.has(key)) truePositive += 1
  const falsePositive = actual.size - truePositive
  const falseNegative = expected.size - truePositive
  return Object.freeze({ truePositive, falsePositive, falseNegative, precision: metricRatio(truePositive, truePositive + falsePositive), recall: metricRatio(truePositive, truePositive + falseNegative), exactLabelSetMatch: falsePositive === 0 && falseNegative === 0 })
}

function emptyAggregate() {
  return { cases: 0, aligned: 0, abstained: 0, truePositive: 0, falsePositive: 0, falseNegative: 0, exact: 0 }
}

function finalizeAggregate(value) {
  return Object.freeze({
    cases: value.cases,
    alignment_success_rate: metricRatio(value.aligned, value.cases),
    abstention_rate: metricRatio(value.abstained, value.cases),
    diagnostic_precision: metricRatio(value.truePositive, value.truePositive + value.falsePositive),
    diagnostic_recall: metricRatio(value.truePositive, value.truePositive + value.falseNegative),
    exact_case_rate: metricRatio(value.exact, value.cases),
    counts: Object.freeze({ truePositive: value.truePositive, falsePositive: value.falsePositive, falseNegative: value.falseNegative }),
  })
}

export async function runMidiEvidenceBenchmark(cases, analyze) {
  if (!Array.isArray(cases)) throw new TypeError('cases must be an array.')
  if (typeof analyze !== 'function') throw new TypeError('analyze must be a function.')
  const ids = new Set()
  const overall = emptyAggregate()
  const bySourceType = new Map()
  const results = []
  for (const benchmarkCase of cases) {
    if (!benchmarkCase || typeof benchmarkCase !== 'object') throw new TypeError('Invalid MIDI evaluation case.')
    if (ids.has(benchmarkCase.id)) throw new TypeError(`Duplicate MIDI evaluation case id: ${benchmarkCase.id}`)
    ids.add(benchmarkCase.id)
    const result = await analyze(benchmarkCase.input)
    const diagnostics = Array.isArray(result?.diagnostics) ? result.diagnostics : []
    const labelMetrics = evaluateCase(benchmarkCase.expectedDiagnostics, diagnostics)
    const alignmentStatus = result?.alignment?.status ?? 'INVALID'
    const aligned = alignmentStatus === 'ALIGNED'
    const abstained = alignmentStatus === 'UNALIGNED' || alignmentStatus === 'UNSUPPORTED'
    const aggregates = [overall, bySourceType.get(benchmarkCase.sourceType) ?? emptyAggregate()]
    if (!bySourceType.has(benchmarkCase.sourceType)) bySourceType.set(benchmarkCase.sourceType, aggregates[1])
    for (const aggregate of aggregates) {
      aggregate.cases += 1
      aggregate.aligned += aligned ? 1 : 0
      aggregate.abstained += abstained ? 1 : 0
      aggregate.truePositive += labelMetrics.truePositive
      aggregate.falsePositive += labelMetrics.falsePositive
      aggregate.falseNegative += labelMetrics.falseNegative
      aggregate.exact += labelMetrics.exactLabelSetMatch ? 1 : 0
    }
    results.push(Object.freeze({ id: benchmarkCase.id, sourceType: benchmarkCase.sourceType, oracleType: benchmarkCase.oracleType, alignmentStatus, alignmentConfidence: Number.isFinite(result?.alignment?.confidence) ? result.alignment.confidence : null, ...labelMetrics }))
  }
  return Object.freeze({ total: cases.length, overall: finalizeAggregate(overall), bySourceType: Object.freeze(Object.fromEntries([...bySourceType.entries()].map(([key, value]) => [key, finalizeAggregate(value)]))), cases: Object.freeze(results), authority: 'EVALUATION_ONLY', automaticCorrectionAuthority: false })
}
