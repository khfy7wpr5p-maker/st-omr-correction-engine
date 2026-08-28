import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_EVENT_ORIGIN,
  POLYPHONIC_ERROR_CLASS,
  TEACHER_DECISION,
  buildRealOmrCalibrationRecords,
  createRealOmrEvidenceSplit,
  createTeacherGoldCorrectionEvent,
  summarizeRealOmrEvidenceSplit,
} from '../src/index.js'

function event({ eventId, sourceId, sourceHash, engineId = 'engine-a', errorClass = POLYPHONIC_ERROR_CLASS.VOICE }) {
  return createTeacherGoldCorrectionEvent({
    eventId,
    sourceId,
    engineId,
    origin: CORRECTION_EVENT_ORIGIN.REAL_OMR,
    page: 0,
    system: 0,
    measure: 1,
    staff: 1,
    voice: 1,
    errorClass,
    originalValue: 1,
    teacherGoldValue: 2,
    candidateValue: 2,
    correctionNeeded: true,
    correctionSafe: true,
    evidenceAvailable: true,
    teacherDecision: TEACHER_DECISION.ACCEPT_CORRECTION,
    provenance: {
      teacherApprovalId: `approval-${eventId}`,
      sourceRevisionId: `revision-${sourceId}`,
      sourceHash,
      engineVersion: '1.0.0',
    },
  })
}

function record(args, confidence = 0.9) {
  return buildRealOmrCalibrationRecords([{ event: event(args), confidence }])[0]
}

test('real OMR split accepts distinct source hashes', () => {
  const split = createRealOmrEvidenceSplit({
    splitId: 'split-1',
    calibration: [record({ eventId: 'e1', sourceId: 's1', sourceHash: 'a'.repeat(64) })],
    finalEvaluation: [record({ eventId: 'e2', sourceId: 's2', sourceHash: 'b'.repeat(64) })],
  })
  const summary = summarizeRealOmrEvidenceSplit(split)

  assert.equal(split.leakageFree, true)
  assert.equal(split.eventCounts.calibration, 1)
  assert.equal(split.eventCounts.finalEvaluation, 1)
  assert.equal(summary.calibrationByErrorClass.VOICE, 1)
})

test('split rejects the same event in calibration and final evaluation', () => {
  const calibration = record({ eventId: 'same', sourceId: 's1', sourceHash: 'a'.repeat(64) })
  const evaluation = { ...calibration }
  assert.throws(() => createRealOmrEvidenceSplit({
    splitId: 'split-event-leak',
    calibration: [calibration],
    finalEvaluation: [evaluation],
  }), /event leakage/)
})

test('split rejects different events from the same source bytes across partitions', () => {
  const sharedHash = 'c'.repeat(64)
  assert.throws(() => createRealOmrEvidenceSplit({
    splitId: 'split-source-leak',
    calibration: [record({ eventId: 'e1', sourceId: 'scan-a', sourceHash: sharedHash })],
    finalEvaluation: [record({ eventId: 'e2', sourceId: 'scan-a', sourceHash: sharedHash })],
  }), /source leakage/)
})

test('split rejects duplicate identities inside one partition', () => {
  const item = record({ eventId: 'dup', sourceId: 's1', sourceHash: 'd'.repeat(64) })
  assert.throws(() => createRealOmrEvidenceSplit({
    splitId: 'split-dup',
    calibration: [item, item],
    finalEvaluation: [],
  }), /duplicate eventId in calibration/)
})

test('summary reports class and engine composition without inventing readiness thresholds', () => {
  const split = createRealOmrEvidenceSplit({
    splitId: 'split-summary',
    calibration: [
      record({ eventId: 'v1', sourceId: 's1', sourceHash: '1'.repeat(64), engineId: 'engine-a', errorClass: POLYPHONIC_ERROR_CLASS.VOICE }),
      record({ eventId: 'd1', sourceId: 's2', sourceHash: '2'.repeat(64), engineId: 'engine-b', errorClass: POLYPHONIC_ERROR_CLASS.DURATION }),
    ],
    finalEvaluation: [
      record({ eventId: 'v2', sourceId: 's3', sourceHash: '3'.repeat(64), engineId: 'engine-a', errorClass: POLYPHONIC_ERROR_CLASS.VOICE }),
    ],
  })
  const summary = summarizeRealOmrEvidenceSplit(split)

  assert.deepEqual(summary.calibrationByEngine, { 'engine-a': 1, 'engine-b': 1 })
  assert.deepEqual(summary.finalEvaluationByEngine, { 'engine-a': 1 })
  assert.equal('productionReady' in summary, false)
  assert.equal('minimumRequired' in summary, false)
})
