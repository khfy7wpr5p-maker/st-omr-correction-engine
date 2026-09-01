import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIDI_COMPARISON_CODE,
  MIDI_REFERENCE_SOURCE_TYPE,
  MIDI_EVALUATION_ORACLE_TYPE,
  createMidiEvaluationCase,
  runMidiEvidenceBenchmark,
} from '../src/index.js'

function diagnostic(code, scoreEventId = null, midiEventId = null) {
  return Object.freeze({ code, location: scoreEventId ? Object.freeze({ eventId: scoreEventId }) : null, details: Object.freeze({ scoreEventId, midiEventId }) })
}

test('benchmark reports diagnostic precision/recall and separates trusted from audio-derived strata', async () => {
  const cases = [
    createMidiEvaluationCase({ id: 'trusted-pitch-conflict', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, oracleType: MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE, input: { id: 'trusted' }, expectedDiagnostics: [{ code: MIDI_COMPARISON_CODE.PITCH_CONFLICT, scoreEventId: 's1', midiEventId: 'm1' }] }),
    createMidiEvaluationCase({ id: 'audio-derived-abstain', sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED, oracleType: MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE, input: { id: 'audio' }, expectedDiagnostics: [{ code: MIDI_COMPARISON_CODE.UNALIGNED }] }),
  ]
  const report = await runMidiEvidenceBenchmark(cases, async (input) => input.id === 'trusted'
    ? { alignment: { status: 'ALIGNED', confidence: 0.95 }, diagnostics: [diagnostic(MIDI_COMPARISON_CODE.PITCH_CONFLICT, 's1', 'm1')] }
    : { alignment: { status: 'UNALIGNED', confidence: 0 }, diagnostics: [diagnostic(MIDI_COMPARISON_CODE.UNALIGNED)] })
  assert.equal(report.total, 2)
  assert.equal(report.overall.diagnostic_precision, 1)
  assert.equal(report.overall.diagnostic_recall, 1)
  assert.equal(report.overall.exact_case_rate, 1)
  assert.equal(report.bySourceType.TRUSTED_REFERENCE.alignment_success_rate, 1)
  assert.equal(report.bySourceType.AUDIO_DERIVED.abstention_rate, 1)
  assert.equal(report.authority, 'EVALUATION_ONLY')
  assert.equal(report.automaticCorrectionAuthority, false)
})

test('false positive and false negative diagnostics are counted explicitly', async () => {
  const benchmarkCase = createMidiEvaluationCase({
    id: 'diagnostic-errors', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, oracleType: MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE, input: {},
    expectedDiagnostics: [
      { code: MIDI_COMPARISON_CODE.ONSET_CONFLICT, scoreEventId: 's1', midiEventId: 'm1' },
      { code: MIDI_COMPARISON_CODE.DURATION_CONFLICT, scoreEventId: 's2', midiEventId: 'm2' },
    ],
  })
  const report = await runMidiEvidenceBenchmark([benchmarkCase], async () => ({ alignment: { status: 'ALIGNED', confidence: 0.8 }, diagnostics: [diagnostic(MIDI_COMPARISON_CODE.ONSET_CONFLICT, 's1', 'm1'), diagnostic(MIDI_COMPARISON_CODE.PITCH_CONFLICT, 's3', 'm3')] }))
  assert.equal(report.overall.counts.truePositive, 1)
  assert.equal(report.overall.counts.falsePositive, 1)
  assert.equal(report.overall.counts.falseNegative, 1)
  assert.equal(report.overall.diagnostic_precision, 0.5)
  assert.equal(report.overall.diagnostic_recall, 0.5)
  assert.equal(report.overall.exact_case_rate, 0)
})

test('audio-derived MIDI cannot be promoted to independent ground truth', () => {
  assert.throws(() => createMidiEvaluationCase({ id: 'unsafe-audio-oracle', sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED, oracleType: MIDI_EVALUATION_ORACLE_TYPE.INDEPENDENT_REFERENCE, input: {}, verification: { independenceVerified: true } }), /cannot itself be treated/)
})

test('teacher-verified oracle requires explicit approval metadata', () => {
  assert.throws(() => createMidiEvaluationCase({ id: 'unverified-teacher', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, oracleType: MIDI_EVALUATION_ORACLE_TYPE.TEACHER_VERIFIED, input: {} }), /requires verification metadata/)
  const accepted = createMidiEvaluationCase({ id: 'verified-teacher', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, oracleType: MIDI_EVALUATION_ORACLE_TYPE.TEACHER_VERIFIED, input: {}, verification: { approved: true, verifierId: 'teacher-review-001', reviewedAt: '2026-09-01T00:00:00Z' } })
  assert.equal(accepted.verification.approved, true)
})

test('independent reference oracle requires explicit independence verification', () => {
  assert.throws(() => createMidiEvaluationCase({ id: 'not-independent', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, oracleType: MIDI_EVALUATION_ORACLE_TYPE.INDEPENDENT_REFERENCE, input: {}, verification: { independenceVerified: false } }), /explicit independence verification/)
})

test('agreement-only MIDI codes are rejected as error labels', () => {
  assert.throws(() => createMidiEvaluationCase({ id: 'agreement-label', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, oracleType: MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE, input: {}, expectedDiagnostics: [{ code: MIDI_COMPARISON_CODE.EXACT_MATCH }] }), /Agreement-only codes/)
})

test('duplicate case ids fail closed', async () => {
  const item = createMidiEvaluationCase({ id: 'duplicate', sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE, oracleType: MIDI_EVALUATION_ORACLE_TYPE.PROGRAMMATIC_ORACLE, input: {} })
  await assert.rejects(() => runMidiEvidenceBenchmark([item, item], async () => ({ alignment: { status: 'ALIGNED' }, diagnostics: [] })), /Duplicate MIDI evaluation case id/)
})
