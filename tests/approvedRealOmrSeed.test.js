import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APPROVED_REAL_OMR_SEED,
  createApprovedRealOmrSeedFixture,
  projectApprovedRealOmrNoCorrectionGold,
  summarizeApprovedRealOmrSeedGold,
  detectDurationAnomalies,
  detectOnsetAnomalies,
  detectTieAnomalies,
  evaluateRealOmrGoldEligibility,
} from '../src/index.js'

test('approved real OMR seed is pinned to exact SesliTab evidence chain', () => {
  assert.equal(APPROVED_REAL_OMR_SEED.repository, 'khfy7wpr5p-maker/seslitab-guitar-reader')
  assert.equal(APPROVED_REAL_OMR_SEED.commitSha, '7cdf08f784a38b9e50cfb465eab87cb65a6622a1')
  assert.equal(APPROVED_REAL_OMR_SEED.engineId, 'audiveris')
  assert.equal(APPROVED_REAL_OMR_SEED.engineVersion, '5.11.0')
  assert.equal(APPROVED_REAL_OMR_SEED.license, 'CC0-1.0')
  assert.equal(APPROVED_REAL_OMR_SEED.sourcePdf.sha256, 'df4b8ea20b6420ebdf6b3e1d625016090105fed0c2f60a4e03874d3c3be2b9b9')
  assert.equal(APPROVED_REAL_OMR_SEED.musicXml.sha256, '009dd2fd4439a4138ed62cd0e0945a5611add8db38c58c7b0f90429ccd9970f6')
  assert.equal(APPROVED_REAL_OMR_SEED.omrArtifact.sha256, '7424e684825b51e8fd31596c94acd5ef008a84fbaecb5c0524222aaec8f8a21a')
  assert.equal(APPROVED_REAL_OMR_SEED.approval.fullScoreMusicalEquivalenceApproved, true)
  assert.equal(APPROVED_REAL_OMR_SEED.approval.tieRecognitionExplicitlyApproved, true)
})

test('approved Audiveris score snapshot is a clean real-world negative regression for tie, duration and onset detectors', () => {
  const fixture = createApprovedRealOmrSeedFixture()
  assert.equal(fixture.measures.length, 12)
  assert.equal(fixture.events.length, 22)
  assert.equal(fixture.measures[0].pickup, true)

  const duration = detectDurationAnomalies(fixture.measures, fixture.events)
  const onset = detectOnsetAnomalies(fixture.measures, fixture.events)
  const ties = detectTieAnomalies(fixture.events)

  assert.deepEqual(duration.findings, [])
  assert.deepEqual(onset.findings, [])
  assert.deepEqual(ties.findings, [])
})

test('whole-score approval projects only no-correction gold labels and preserves source-count distinction', () => {
  const gold = projectApprovedRealOmrNoCorrectionGold()
  const summary = summarizeApprovedRealOmrSeedGold()

  assert.equal(gold.length, 54)
  assert.equal(summary.independentSourceCount, 1)
  assert.equal(summary.scoreEventCount, 22)
  assert.equal(summary.goldLabelCount, 54)
  assert.deepEqual(summary.byClass, { PITCH: 22, DURATION: 22, TIE: 10 })
  assert.equal(summary.correctionNeededCount, 0)
  assert.equal(summary.productionReadinessClaim, false)

  for (const event of gold) {
    assert.equal(event.origin, 'REAL_OMR')
    assert.equal(event.teacherDecision, 'NO_CORRECTION_NEEDED')
    assert.equal(event.correctionNeeded, false)
    assert.equal(event.correctionSafe, false)
    assert.equal(evaluateRealOmrGoldEligibility(event).eligible, true)
  }
})
