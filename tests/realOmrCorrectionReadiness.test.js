import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_EVENT_ORIGIN,
  CORRECTION_READINESS,
  POLYPHONIC_ERROR_CLASS,
  TEACHER_DECISION,
  createTeacherGoldCorrectionEvent,
  evaluateRealOmrCorrectionReadiness,
  projectApprovedRealOmrNoCorrectionGold,
  summarizeRealOmrCorrectionEvidence,
} from '../src/index.js'

const shadowEvidence = {
  testsPass: true,
  sourceMutationInvariantPass: true,
  reversibilityPass: true,
  failClosedPass: true,
  teacherReviewContractAvailable: true,
  independentRevalidationAvailable: true,
}

const autoEvidence = {
  ...shadowEvidence,
  calibrationEvidenceAvailable: true,
  riskCoverageEvidenceAvailable: true,
  riskRegressionPass: true,
  falseCorrectionThresholdPass: true,
  boundedSinglePurposePatch: true,
  independentEvidenceAvailable: true,
  noConflictingEvidence: true,
  benchmarkThresholdPass: true,
  policyDerivedFromTeacherGold: true,
}

function correctionEvent({ origin = CORRECTION_EVENT_ORIGIN.REAL_OMR, safe = true, sourceId = 'real-source-1' } = {}) {
  return createTeacherGoldCorrectionEvent({
    eventId: `${sourceId}:pitch:1`,
    sourceId,
    engineId: 'audiveris',
    origin,
    page: 0,
    system: 0,
    measure: '1',
    staff: 1,
    voice: 1,
    errorClass: POLYPHONIC_ERROR_CLASS.PITCH,
    originalValue: 'C4',
    teacherGoldValue: 'C#4',
    candidateValue: 'C#4',
    correctionNeeded: true,
    correctionSafe: safe,
    evidenceAvailable: true,
    teacherDecision: TEACHER_DECISION.ACCEPT_CORRECTION,
    provenance: { sourceHash: 'abc', engineVersion: '5.11.0', teacherApprovalId: 'approval-1' },
  })
}

test('approved no-correction REAL_OMR seed cannot promote correction readiness', () => {
  const events = projectApprovedRealOmrNoCorrectionGold()
  const result = evaluateRealOmrCorrectionReadiness({
    events,
    requestedStatus: CORRECTION_READINESS.PRODUCTION_APPROVED,
    evidence: autoEvidence,
  })

  assert.equal(result.achievedStatus, CORRECTION_READINESS.SHADOW_READY)
  assert.equal(result.approved, false)
  assert.equal(result.correctionNeededTeacherGoldAvailable, false)
  assert.equal(result.noCorrectionLabelsUsedForAutomaticPromotion, false)
  assert.equal(result.summary.realOmrLabelCount, 54)
  assert.equal(result.summary.noCorrectionNeededCount, 54)
  assert.equal(result.summary.acceptedCorrectionNeededCount, 0)
  assert.equal(result.blockers.some((item) => item.requirement === 'teacherGoldEvidenceAvailable'), true)
})

test('controlled mutation corrections do not count as real OMR correction-needed evidence', () => {
  const events = [correctionEvent({ origin: CORRECTION_EVENT_ORIGIN.CONTROLLED_MUTATION })]
  const summary = summarizeRealOmrCorrectionEvidence(events)
  const result = evaluateRealOmrCorrectionReadiness({
    events,
    requestedStatus: CORRECTION_READINESS.TEACHER_REVIEW_READY,
    evidence: shadowEvidence,
  })

  assert.equal(summary.realOmrLabelCount, 0)
  assert.equal(summary.acceptedCorrectionNeededCount, 0)
  assert.equal(result.achievedStatus, CORRECTION_READINESS.SHADOW_READY)
  assert.equal(result.approved, false)
})

test('unsafe accepted real OMR correction evidence cannot become an auto-correction candidate', () => {
  const result = evaluateRealOmrCorrectionReadiness({
    events: [correctionEvent({ safe: false })],
    requestedStatus: CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE,
    evidence: autoEvidence,
  })

  assert.equal(result.correctionNeededTeacherGoldAvailable, true)
  assert.equal(result.correctionSafeTeacherGoldAvailable, false)
  assert.equal(result.achievedStatus, CORRECTION_READINESS.TEACHER_REVIEW_READY)
  assert.equal(result.approved, false)
  assert.equal(result.blockers.some((item) => item.requirement === 'correctionSafeTeacherGoldEvidenceAvailable'), true)
})

test('safe accepted real OMR correction evidence may pass only the explicitly supplied lower gates', () => {
  const result = evaluateRealOmrCorrectionReadiness({
    events: [correctionEvent({ safe: true })],
    requestedStatus: CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE,
    evidence: autoEvidence,
  })

  assert.equal(result.summary.acceptedCorrectionNeededCount, 1)
  assert.equal(result.summary.safeAcceptedCorrectionNeededCount, 1)
  assert.equal(result.achievedStatus, CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE)
  assert.equal(result.approved, true)
  assert.equal(result.productionBehaviorChanged, false)
})
