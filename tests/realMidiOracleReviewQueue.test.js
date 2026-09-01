import test from 'node:test'
import assert from 'node:assert/strict'
import { MIDI_COMPARISON_CODE } from '../src/contracts/midiReferenceEvidence.js'
import {
  REAL_MIDI_ORACLE_REVIEWER_KIND,
  REAL_MIDI_ORACLE_REVIEW_STATUS,
  createRealMidiOracleReviewItem,
  resolveRealMidiOracleReviewItem,
} from '../src/benchmark/realMidiOracleReviewQueue.js'
import { REAL_MIDI_PAIR_STATUS } from '../src/benchmark/realMidiPairReadiness.js'

const readyPair = Object.freeze({
  id: 'real-pair-1',
  status: REAL_MIDI_PAIR_STATUS.READY_FOR_ORACLE_REVIEW,
  readyForOracleReview: true,
})

test('oracle review queue rejects non-ready real pairs', () => {
  assert.throws(() => createRealMidiOracleReviewItem({
    reviewId: 'r1',
    pairReadiness: { ...readyPair, status: REAL_MIDI_PAIR_STATUS.NEEDS_CANONICAL_SCOREGRAPH, readyForOracleReview: false },
    diagnosticCode: MIDI_COMPARISON_CODE.PITCH_CONFLICT,
  }), /READY_FOR_ORACLE_REVIEW/)
})

test('pending review item has no verified label or correction authority', () => {
  const item = createRealMidiOracleReviewItem({
    reviewId: 'r2',
    pairReadiness: readyPair,
    diagnosticCode: MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING,
    scoreEventId: 'score-1',
    midiEventId: 'midi-2',
  })
  assert.equal(item.status, REAL_MIDI_ORACLE_REVIEW_STATUS.PENDING)
  assert.equal(item.verifiedLabel, null)
  assert.equal(item.reviewer, null)
  assert.equal(item.automaticCorrectionAuthority, false)
})

test('verified oracle label requires explicit teacher or independent reviewer', () => {
  const item = createRealMidiOracleReviewItem({
    reviewId: 'r3',
    pairReadiness: readyPair,
    diagnosticCode: MIDI_COMPARISON_CODE.ONSET_CONFLICT,
  })
  assert.throws(() => resolveRealMidiOracleReviewItem(item, {
    reviewerKind: 'AUTOMATION',
    reviewerId: 'bot',
    verifiedLabel: true,
  }), /teacher or independent-reference/)
  const verified = resolveRealMidiOracleReviewItem(item, {
    reviewerKind: REAL_MIDI_ORACLE_REVIEWER_KIND.TEACHER,
    reviewerId: 'teacher-review-1',
    verifiedLabel: true,
  })
  assert.equal(verified.status, REAL_MIDI_ORACLE_REVIEW_STATUS.VERIFIED)
  assert.equal(verified.verifiedLabel, true)
  assert.equal(verified.automaticCorrectionAuthority, false)
})

test('ambiguous review is a successful abstention and creates no label', () => {
  const item = createRealMidiOracleReviewItem({
    reviewId: 'r4',
    pairReadiness: readyPair,
    diagnosticCode: MIDI_COMPARISON_CODE.DURATION_CONFLICT,
  })
  const resolved = resolveRealMidiOracleReviewItem(item, {
    reviewerKind: REAL_MIDI_ORACLE_REVIEWER_KIND.INDEPENDENT_REFERENCE,
    reviewerId: 'reference-review-1',
    verifiedLabel: null,
    ambiguous: true,
    note: 'Edition-level duration is not safely comparable.',
  })
  assert.equal(resolved.status, REAL_MIDI_ORACLE_REVIEW_STATUS.AMBIGUOUS)
  assert.equal(resolved.verifiedLabel, null)
})
