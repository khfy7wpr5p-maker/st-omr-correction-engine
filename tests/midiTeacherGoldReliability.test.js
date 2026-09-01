import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIDI_EVALUATION_ORACLE_TYPE,
  MIDI_REFERENCE_SOURCE_TYPE,
  MIDI_RELIABILITY_STATUS,
  createMidiEvaluationCase,
  createMidiTeacherGoldReliabilityReport,
  runMidiEvidenceBenchmark,
} from '../src/index.js'

function teacherCase(id, sourceType) {
  return createMidiEvaluationCase({
    id,
    sourceType,
    oracleType: MIDI_EVALUATION_ORACLE_TYPE.TEACHER_VERIFIED,
    input: { id },
    expectedDiagnostics: [],
    verification: { approved: true, verifierId: `teacher-${id}`, reviewedAt: '2026-09-01T00:00:00Z' },
  })
}

async function benchmark(cases, confidenceById = {}, wrongById = {}) {
  return runMidiEvidenceBenchmark(cases, async (input) => ({
    alignment: { status: 'ALIGNED', confidence: confidenceById[input.id] ?? 0.9 },
    diagnostics: wrongById[input.id] ? [{ code: 'MIDI_PITCH_CONFLICT', location: null, details: {} }] : [],
  }))
}

test('teacher-gold reliability is measured separately for trusted and audio-derived sources', async () => {
  const cases = [
    teacherCase('trusted-good', MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE),
    teacherCase('trusted-bad', MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE),
    teacherCase('audio-good', MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED),
    teacherCase('audio-bad', MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED),
  ]
  const report = await benchmark(cases, {
    'trusted-good': 0.95,
    'trusted-bad': 0.85,
    'audio-good': 0.8,
    'audio-bad': 0.6,
  }, {
    'trusted-bad': true,
    'audio-bad': true,
  })
  const reliability = createMidiTeacherGoldReliabilityReport({ benchmarkCases: cases, benchmarkReport: report })

  assert.equal(reliability.status, MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD)
  assert.equal(reliability.measuredReliabilityAvailable, true)
  assert.equal(reliability.bySourceType.TRUSTED_REFERENCE.teacherGoldCases, 2)
  assert.equal(reliability.bySourceType.AUDIO_DERIVED.teacherGoldCases, 2)
  assert.ok(Number.isFinite(reliability.bySourceType.TRUSTED_REFERENCE.calibration.brierScore))
  assert.ok(Array.isArray(reliability.bySourceType.AUDIO_DERIVED.selectivePrediction.curve))
  assert.equal(reliability.recommendedEvidenceWeight, null)
  assert.equal(reliability.evidenceWeightApplied, 0)
  assert.equal(reliability.productionThreshold, null)
  assert.equal(reliability.productionReadiness, 'NOT_AUTHORIZED')
  assert.equal(reliability.automaticCorrectionAuthority, false)
})

test('programmatic oracle cases cannot masquerade as teacher-gold reliability', async () => {
  const cases = [
    createMidiEvaluationCase({
      id: 'synthetic-trusted',
      sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
      oracleType: MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE,
      input: { id: 'synthetic-trusted' },
      expectedDiagnostics: [],
    }),
    createMidiEvaluationCase({
      id: 'synthetic-audio',
      sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED,
      oracleType: MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE,
      input: { id: 'synthetic-audio' },
      expectedDiagnostics: [],
    }),
  ]
  const report = await benchmark(cases)
  const reliability = createMidiTeacherGoldReliabilityReport({ benchmarkCases: cases, benchmarkReport: report })

  assert.equal(reliability.status, MIDI_RELIABILITY_STATUS.INSUFFICIENT_TEACHER_GOLD)
  assert.equal(reliability.measuredReliabilityAvailable, false)
  assert.deepEqual(reliability.missingSourceTypes, [
    MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
    MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED,
  ])
  assert.equal(reliability.bySourceType.TRUSTED_REFERENCE.calibration, null)
  assert.equal(reliability.bySourceType.AUDIO_DERIVED.calibration, null)
})

test('one measured source type is insufficient for the trusted-vs-audio reliability contract', async () => {
  const cases = [teacherCase('trusted-only', MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE)]
  const report = await benchmark(cases, { 'trusted-only': 0.95 })
  const reliability = createMidiTeacherGoldReliabilityReport({ benchmarkCases: cases, benchmarkReport: report })

  assert.equal(reliability.status, MIDI_RELIABILITY_STATUS.INSUFFICIENT_TEACHER_GOLD)
  assert.equal(reliability.bySourceType.TRUSTED_REFERENCE.status, MIDI_RELIABILITY_STATUS.MEASURED_TEACHER_GOLD)
  assert.equal(reliability.bySourceType.AUDIO_DERIVED.status, MIDI_RELIABILITY_STATUS.INSUFFICIENT_TEACHER_GOLD)
  assert.deepEqual(reliability.missingSourceTypes, [MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED])
})

test('calibration rejects a benchmark report that could carry correction authority', async () => {
  const cases = [teacherCase('trusted', MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE)]
  const report = await benchmark(cases)
  assert.throws(() => createMidiTeacherGoldReliabilityReport({
    benchmarkCases: cases,
    benchmarkReport: { ...report, authority: 'CORRECTION', automaticCorrectionAuthority: true },
  }), /evaluation-only/)
})

test('calibration rejects benchmark result/case source identity mismatches', async () => {
  const cases = [teacherCase('trusted', MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE)]
  const report = await benchmark(cases)
  const altered = {
    ...report,
    cases: report.cases.map((item) => ({ ...item, sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED })),
  }
  assert.throws(() => createMidiTeacherGoldReliabilityReport({ benchmarkCases: cases, benchmarkReport: altered }), /identity mismatch/)
})
