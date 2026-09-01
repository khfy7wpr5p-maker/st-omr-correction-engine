import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REAL_MIDI_TEACHER_CONFIRMED_PRIMARY_DECISION,
  REAL_MIDI_TEACHER_CONFIRMED_REGRESSION_V1,
  REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1,
  summarizeRealMidiTeacherConfirmedRegression,
} from '../src/index.js'

const fixture = REAL_MIDI_TEACHER_CONFIRMED_REGRESSION_V1

test('teacher-confirmed regression covers exactly the 40 reviewed shadow items', () => {
  assert.equal(fixture.items.length, 40)
  assert.equal(fixture.items.filter((item) => item.workId === 'sor').length, 20)
  assert.equal(fixture.items.filter((item) => item.workId === 'bach').length, 20)

  const batchIds = REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.works
    .flatMap((work) => work.reviewItems.map((item) => item.reviewId))
    .sort()
  const fixtureIds = fixture.items.map((item) => item.reviewId).sort()
  assert.deepEqual(fixtureIds, batchIds)
})

test('all 40 primary diagnostics are teacher-confirmed false positives', () => {
  assert.equal(fixture.items.every((item) => item.expectedPrimaryDecision === REAL_MIDI_TEACHER_CONFIRMED_PRIMARY_DECISION.DIAGNOSTIC_FALSE_POSITIVE), true)
  assert.equal(fixture.items.every((item) => item.verifiedLabel === false), true)
  assert.equal(fixture.items.filter((item) => item.primaryDiagnosticCode === 'MIDI_PITCH_CONFLICT').length, 32)
  assert.equal(fixture.items.filter((item) => item.primaryDiagnosticCode === 'MIDI_EXTRA_NOTE').length, 8)

  const summary = summarizeRealMidiTeacherConfirmedRegression()
  assert.deepEqual(summary, {
    sampleSize: 40,
    diagnosticCorrectCount: 0,
    diagnosticFalsePositiveCount: 40,
    ambiguousCount: 0,
    primaryDiagnosticPrecision: 0,
    recall: null,
    recallIdentifiable: false,
    automaticCorrectionAuthority: false,
  })
})

test('regression fixture does not invent reviewer identity or gold eligibility', () => {
  assert.equal(fixture.provenance.reviewerId, null)
  assert.equal(fixture.provenance.reviewedAt, null)
  assert.equal(fixture.provenance.reviewerIdentityClaimed, false)
  assert.equal(fixture.provenance.exactReviewTimestampClaimed, false)
  assert.equal(fixture.eligibility.teacherGoldEligible, false)
  assert.equal(fixture.eligibility.measuredReliabilityEligible, false)
  assert.equal(fixture.eligibility.calibrationEligible, false)
  assert.equal(fixture.eligibility.recallIdentifiable, false)
})

test('teacher-confirmed regression remains shadow-only and non-authoritative', () => {
  assert.equal(fixture.reviewScope, 'PRIMARY_DIAGNOSTIC_ONLY')
  assert.equal(fixture.safety.shadowOnly, true)
  assert.equal(fixture.safety.weight, 0)
  assert.equal(fixture.safety.automaticCorrectionAuthority, false)
  assert.equal(fixture.safety.sourceMutation, false)
  assert.equal(fixture.safety.extraMidiMeansMissingOmr, false)
  assert.equal(fixture.items.every((item) => item.automaticCorrectionAuthority === false), true)
  assert.equal(Object.isFrozen(fixture), true)
  assert.equal(Object.isFrozen(fixture.items), true)
})

test('only explicitly confirmed secondary diagnostics are recorded as real', () => {
  const realSecondary = fixture.items
    .flatMap((item) => (item.secondaryObservation?.confirmedRealDiagnosticCodes ?? []).map((code) => [item.reviewId, code]))
  assert.deepEqual(realSecondary, [
    ['sor-score-07', 'MIDI_DURATION_CONFLICT'],
    ['bach-score-10', 'MIDI_DURATION_CONFLICT'],
  ])
})
