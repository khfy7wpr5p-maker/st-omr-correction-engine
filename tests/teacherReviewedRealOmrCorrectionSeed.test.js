import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_READINESS,
  TEACHER_REVIEWED_REAL_OMR_CORRECTION_SEED,
  createTeacherReviewedRealOmrCorrectionGold,
  evaluateRealOmrCorrectionReadiness,
  evaluateRealOmrGoldEligibility,
  projectApprovedRealOmrNoCorrectionGold,
} from '../src/index.js'

const autoEvidence = {
  testsPass: true,
  sourceMutationInvariantPass: true,
  reversibilityPass: true,
  failClosedPass: true,
  teacherReviewContractAvailable: true,
  independentRevalidationAvailable: true,
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

test('SES-97 Franz D4 duration evidence is pinned to the teacher-reviewed source package', () => {
  const seed = TEACHER_REVIEWED_REAL_OMR_CORRECTION_SEED

  assert.equal(seed.id, 'ses-97-franz-benda-caprice-m6-d4-duration')
  assert.equal(seed.engineId, 'audiveris')
  assert.equal(seed.engineVersion, '5.11.0')
  assert.equal(seed.engineBuild, '9e1e55cd2746037d059345881c53e6a6754bffbd')
  assert.equal(seed.sourceAlias, 'IMSLP84783')
  assert.equal(seed.sourcePdf.sha256, '22dc1aee92db8b59ce9167f5771bda9cad797c2c5f459c6763c350284ed80dae')
  assert.equal(seed.musicXml.sha256, 'b4f6a04a19283e8559f47d5672c0d110385a74ed6f15f16009e58e23685ea113')
  assert.equal(seed.omrArtifact.sha256, 'e639a7e9217f5bb3f7edb8caa8481b95e54cdd7416c38a492bc3886614d9c3a1')
  assert.equal(seed.approval.date, '2026-09-29')
  assert.equal(seed.approval.correctionSafe, false)
})

test('SES-97 Franz D4 teacher decision creates one eligible unsafe correction-needed DURATION event', () => {
  const event = createTeacherReviewedRealOmrCorrectionGold()
  const eligibility = evaluateRealOmrGoldEligibility(event)

  assert.equal(eligibility.eligible, true)
  assert.equal(event.origin, 'REAL_OMR')
  assert.equal(event.errorClass, 'DURATION')
  assert.equal(event.page, 1)
  assert.equal(event.system, 2)
  assert.equal(event.measure, '6')
  assert.equal(event.staff, 1)
  assert.equal(event.voice, 1)
  assert.equal(event.originalValue, 1)
  assert.equal(event.candidateValue, 0.25)
  assert.equal(event.teacherGoldValue, 0.25)
  assert.equal(event.teacherDecision, 'ACCEPT_CORRECTION')
  assert.equal(event.correctionNeeded, true)
  assert.equal(event.correctionSafe, false)
  assert.equal(event.evidenceAvailable, true)
})

test('SES-97 teacher gold advances correction-needed evidence without enabling automatic DURATION correction', () => {
  const events = [
    ...projectApprovedRealOmrNoCorrectionGold(),
    createTeacherReviewedRealOmrCorrectionGold(),
  ]
  const result = evaluateRealOmrCorrectionReadiness({
    events,
    requestedStatus: CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE,
    evidence: autoEvidence,
  })

  assert.equal(result.summary.realOmrLabelCount, 55)
  assert.equal(result.summary.eligibleRealOmrLabelCount, 55)
  assert.equal(result.summary.acceptedCorrectionNeededCount, 1)
  assert.equal(result.summary.acceptedCorrectionNeededSourceCount, 1)
  assert.equal(result.summary.safeAcceptedCorrectionNeededCount, 0)
  assert.equal(result.summary.independentRealOmrSourceCount, 2)
  assert.deepEqual(result.summary.correctionNeededByClass, { DURATION: 1 })
  assert.equal(result.correctionNeededTeacherGoldAvailable, true)
  assert.equal(result.correctionSafeTeacherGoldAvailable, false)
  assert.equal(result.achievedStatus, CORRECTION_READINESS.TEACHER_REVIEW_READY)
  assert.equal(result.approved, false)
  assert.equal(
    result.blockers.some((item) => item.requirement === 'correctionSafeTeacherGoldEvidenceAvailable'),
    true,
  )
})
