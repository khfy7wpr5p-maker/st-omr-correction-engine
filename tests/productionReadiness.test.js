import test from 'node:test'
import assert from 'node:assert/strict'
import { CORRECTION_READINESS, evaluateCorrectionReadiness } from '../src/index.js'

const shadowEvidence = {
  testsPass: true,
  sourceMutationInvariantPass: true,
  reversibilityPass: true,
  failClosedPass: true,
}

const reviewEvidence = {
  ...shadowEvidence,
  teacherGoldEvidenceAvailable: true,
  teacherReviewContractAvailable: true,
  independentRevalidationAvailable: true,
}

const autoCandidateEvidence = {
  ...reviewEvidence,
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

test('readiness defaults to research only', () => {
  const result = evaluateCorrectionReadiness()
  assert.equal(result.achievedStatus, CORRECTION_READINESS.RESEARCH_ONLY)
  assert.equal(result.approved, true)
  assert.equal(result.numericThresholdInvented, false)
})

test('missing teacher-gold evidence prevents teacher-review readiness', () => {
  const result = evaluateCorrectionReadiness({
    requestedStatus: CORRECTION_READINESS.TEACHER_REVIEW_READY,
    evidence: shadowEvidence,
  })
  assert.equal(result.achievedStatus, CORRECTION_READINESS.SHADOW_READY)
  assert.equal(result.approved, false)
  assert.equal(result.blockers.some((item) => item.requirement === 'teacherGoldEvidenceAvailable'), true)
})

test('auto-correction candidate requires policy derived from teacher gold', () => {
  const evidence = { ...autoCandidateEvidence, policyDerivedFromTeacherGold: false }
  const result = evaluateCorrectionReadiness({ requestedStatus: CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE, evidence })
  assert.equal(result.achievedStatus, CORRECTION_READINESS.TEACHER_REVIEW_READY)
  assert.equal(result.approved, false)
})

test('production approval requires explicit human, policy and security approval after all lower gates', () => {
  const result = evaluateCorrectionReadiness({
    requestedStatus: CORRECTION_READINESS.PRODUCTION_APPROVED,
    evidence: autoCandidateEvidence,
  })
  assert.equal(result.achievedStatus, CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE)
  assert.equal(result.approved, false)
  assert.equal(result.blockers.some((item) => item.requirement === 'productionPolicyApproved'), true)
  assert.equal(result.productionBehaviorChanged, false)
})

test('production approval can only be represented when every explicit evidence gate is supplied', () => {
  const result = evaluateCorrectionReadiness({
    requestedStatus: CORRECTION_READINESS.PRODUCTION_APPROVED,
    evidence: {
      ...autoCandidateEvidence,
      productionPolicyApproved: true,
      humanApprovalRecorded: true,
      securityReviewPass: true,
    },
  })
  assert.equal(result.achievedStatus, CORRECTION_READINESS.PRODUCTION_APPROVED)
  assert.equal(result.approved, true)
})
