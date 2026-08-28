import test from 'node:test'
import assert from 'node:assert/strict'
import {
  POLYPHONIC_ERROR_CLASS,
  REAL_OMR_ANNOTATION_STATUS,
  TEACHER_DECISION,
  annotateRealOmrObservation,
  buildRealOmrAnnotationBatch,
  createRealOmrReviewObservation,
  evaluateRealOmrGoldEligibility,
} from '../src/index.js'

const HASH = 'b'.repeat(64)

function observation(overrides = {}) {
  return createRealOmrReviewObservation({
    observationId: 'obs-1',
    sourceId: 'scan-1',
    engineId: 'audiveris',
    engineVersion: '5.7-test',
    sourceRevisionId: 'rev-1',
    sourceHash: HASH,
    page: 0,
    system: 1,
    measure: 12,
    staff: 1,
    voice: 3,
    errorClass: POLYPHONIC_ERROR_CLASS.VOICE,
    originalValue: 1,
    candidateValue: 3,
    candidateConfidence: 0.93,
    evidenceRefs: ['validator:voice-overlap', 'visual:crop-12'],
    imageCropRef: 'crop-12',
    ...overrides,
  })
}

test('real OMR observation remains pending and has no teacher decision', () => {
  const item = observation()
  assert.equal(item.status, REAL_OMR_ANNOTATION_STATUS.PENDING_TEACHER_REVIEW)
  assert.equal('teacherDecision' in item, false)
  assert.equal('teacherGoldValue' in item, false)
})

test('annotation batch is deterministic and bounded', () => {
  const later = observation({ observationId: 'obs-2', page: 2 })
  const earlier = observation({ observationId: 'obs-0', page: 0, system: 0, measure: 1 })
  const batch = buildRealOmrAnnotationBatch([later, earlier], { batchId: 'batch-1', maxItems: 1 })

  assert.equal(batch.items.length, 1)
  assert.equal(batch.items[0].observationId, 'obs-0')
  assert.equal(batch.deferredCount, 1)
  assert.equal(batch.teacherDecisionsCreated, 0)
})

test('batch rejects duplicate observation identities', () => {
  const item = observation()
  assert.throws(() => buildRealOmrAnnotationBatch([item, item], { batchId: 'batch-dup' }), /duplicate observationId/)
})

test('teacher annotation requires explicit decision and gold value', () => {
  const item = observation()
  assert.throws(() => annotateRealOmrObservation(item, {
    teacherApprovalId: 'teacher-1',
    correctionNeeded: true,
    correctionSafe: true,
    evidenceAvailable: true,
  }), /Explicit teacherDecision/)

  assert.throws(() => annotateRealOmrObservation(item, {
    teacherApprovalId: 'teacher-1',
    teacherDecision: TEACHER_DECISION.ACCEPT_CORRECTION,
    correctionNeeded: true,
    correctionSafe: true,
    evidenceAvailable: true,
  }), /Explicit teacherGoldValue/)
})

test('explicit teacher annotation creates a REAL_OMR gold event with pinned provenance', () => {
  const item = observation()
  const event = annotateRealOmrObservation(item, {
    teacherApprovalId: 'teacher-event-1',
    teacherDecision: TEACHER_DECISION.ACCEPT_CORRECTION,
    teacherGoldValue: 3,
    correctionNeeded: true,
    correctionSafe: true,
    evidenceAvailable: true,
    reviewNote: 'Voice 3 confirmed from source.',
  })
  const eligibility = evaluateRealOmrGoldEligibility(event)

  assert.equal(event.origin, 'REAL_OMR')
  assert.equal(event.teacherDecision, TEACHER_DECISION.ACCEPT_CORRECTION)
  assert.equal(event.provenance.sourceHash, HASH)
  assert.equal(eligibility.eligible, true)
})

test('ambiguous teacher annotation stays valid gold evidence but is excluded from calibration', () => {
  const event = annotateRealOmrObservation(observation(), {
    teacherApprovalId: 'teacher-event-ambiguous',
    teacherDecision: TEACHER_DECISION.AMBIGUOUS,
    teacherGoldValue: null,
    correctionNeeded: true,
    correctionSafe: false,
    evidenceAvailable: true,
  })
  const eligibility = evaluateRealOmrGoldEligibility(event)

  assert.equal(event.teacherDecision, TEACHER_DECISION.AMBIGUOUS)
  assert.equal(eligibility.eligible, false)
  assert.ok(eligibility.reasons.includes('TEACHER_DECISION_AMBIGUOUS'))
})
