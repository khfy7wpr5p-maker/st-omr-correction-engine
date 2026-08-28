import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_EVENT_ORIGIN,
  POLYPHONIC_ERROR_CLASS,
  TEACHER_DECISION,
  buildRealOmrCalibrationRecords,
  createRealOmrCalibrationRecord,
  createTeacherGoldCorrectionEvent,
  evaluateRealOmrGoldEligibility,
} from '../src/index.js'

const SOURCE_HASH = 'a'.repeat(64)

function realEvent(overrides = {}) {
  return createTeacherGoldCorrectionEvent({
    eventId: 'real-omr-1',
    sourceId: 'scan-1',
    engineId: 'audiveris',
    origin: CORRECTION_EVENT_ORIGIN.REAL_OMR,
    page: 0,
    system: 0,
    measure: 4,
    staff: 1,
    voice: 3,
    errorClass: POLYPHONIC_ERROR_CLASS.VOICE,
    originalValue: 1,
    teacherGoldValue: 3,
    candidateValue: 3,
    correctionNeeded: true,
    correctionSafe: true,
    evidenceAvailable: true,
    teacherDecision: TEACHER_DECISION.ACCEPT_CORRECTION,
    provenance: {
      teacherApprovalId: 'teacher-approval-1',
      sourceRevisionId: 'source-revision-1',
      sourceHash: SOURCE_HASH,
      engineVersion: 'audiveris-test-version',
    },
    ...overrides,
  })
}

test('real OMR event with pinned provenance is calibration eligible', () => {
  const event = realEvent()
  const eligibility = evaluateRealOmrGoldEligibility(event)
  const record = createRealOmrCalibrationRecord({ event, confidence: 0.93 })

  assert.equal(eligibility.eligible, true)
  assert.deepEqual(eligibility.reasons, [])
  assert.equal(record.correct, true)
  assert.equal(record.confidence, 0.93)
  assert.equal(record.eventId, event.eventId)
})

test('controlled mutations cannot enter the real OMR calibration set', () => {
  const event = realEvent({ origin: CORRECTION_EVENT_ORIGIN.CONTROLLED_MUTATION })
  const eligibility = evaluateRealOmrGoldEligibility(event)

  assert.equal(eligibility.eligible, false)
  assert.ok(eligibility.reasons.includes('ORIGIN_NOT_REAL_OMR'))
  assert.throws(() => createRealOmrCalibrationRecord({ event, confidence: 0.9 }), /ORIGIN_NOT_REAL_OMR/)
})

test('ambiguous teacher decisions remain excluded from calibration', () => {
  const event = realEvent({ teacherDecision: TEACHER_DECISION.AMBIGUOUS })
  const eligibility = evaluateRealOmrGoldEligibility(event)

  assert.equal(eligibility.eligible, false)
  assert.ok(eligibility.reasons.includes('TEACHER_DECISION_AMBIGUOUS'))
})

test('real OMR calibration requires source hash and engine version provenance', () => {
  const event = realEvent({
    provenance: {
      teacherApprovalId: 'teacher-approval-1',
      sourceRevisionId: 'source-revision-1',
      sourceHash: 'not-a-sha256',
    },
  })
  const eligibility = evaluateRealOmrGoldEligibility(event)

  assert.equal(eligibility.eligible, false)
  assert.ok(eligibility.reasons.includes('PROVENANCE_ENGINEVERSION_REQUIRED'))
  assert.ok(eligibility.reasons.includes('PROVENANCE_SOURCE_HASH_INVALID'))
})

test('calibration set rejects duplicate real OMR event identities', () => {
  const event = realEvent()
  assert.throws(() => buildRealOmrCalibrationRecords([
    { event, confidence: 0.91 },
    { event, confidence: 0.92 },
  ]), /duplicate REAL_OMR eventId/)
})

test('calibration correctness is evaluated against teacher gold value', () => {
  const event = realEvent({ candidateValue: { voice: 2 }, teacherGoldValue: { voice: 3 } })
  const [record] = buildRealOmrCalibrationRecords([{ event, confidence: 0.8 }])
  assert.equal(record.correct, false)
})
