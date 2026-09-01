import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1,
  getRealOmrMidiShadowReviewWork,
  materializeRealOmrMidiShadowReviewQueue,
} from '../src/benchmark/realOmrMidiShadowReviewBatch.js'
import { REAL_MIDI_PAIR_STATUS } from '../src/benchmark/realMidiPairReadiness.js'

function ready(workId) {
  const work = getRealOmrMidiShadowReviewWork(workId)
  return Object.freeze({
    id: work.pairId,
    status: REAL_MIDI_PAIR_STATUS.READY_FOR_ORACLE_REVIEW,
    readyForOracleReview: true,
    blockers: Object.freeze([]),
    automaticCorrectionAuthority: false,
  })
}

test('real OMR/MIDI shadow batch pins exact provenance and all-measure alignment', () => {
  const batch = REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1
  assert.equal(batch.status, 'PENDING_ORACLE_REVIEW')
  assert.equal(batch.batchSha256, 'fe2ba6369e4c16a8b18a011fa3bbf6954a67b0cc4165d3ac2276436e5e4c43e7')
  assert.deepEqual(batch.safety, {
    shadowOnly: true,
    weight: 0,
    teacherGold: false,
    measuredReliability: false,
    automaticCorrectionAuthority: false,
    sourceMutation: false,
    extraMidiMeansMissingOmr: false,
  })
  const sor = getRealOmrMidiShadowReviewWork('sor')
  const bach = getRealOmrMidiShadowReviewWork('bach')
  assert.equal(sor.provenance.omrSourceSha256, '8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b')
  assert.equal(sor.provenance.canonicalGraphSha256, 'e93d2ac8f6488b986dc4fbd2ce2ef4d13531b389cd9c17c8786bf8d2716f49a2')
  assert.equal(sor.provenance.midiSha256, '35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527')
  assert.equal(sor.comparison.alignedMeasures, 32)
  assert.equal(sor.comparison.unalignedMeasures, 0)
  assert.equal(bach.provenance.omrSourceSha256, '684250fb632299a0df3664623a851ec149cf3952c76956f1d1ad9d4572779fdd')
  assert.equal(bach.provenance.canonicalGraphSha256, '5c5b6bf8eb8f5c25ae37bfd4f5e2f5316e22248f37ab32776244fed6ba839b1e')
  assert.equal(bach.provenance.midiSha256, '3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f')
  assert.equal(bach.comparison.alignedMeasures, 35)
  assert.equal(bach.comparison.unalignedMeasures, 0)
})

test('bounded review selection contains only suspicious observations and no labels', () => {
  for (const work of REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.works) {
    assert.equal(work.reviewItems.length, 20)
    assert.equal(work.reviewItems.every((item) => item.status === 'PENDING'), true)
    assert.equal(work.reviewItems.every((item) => item.verifiedLabel === null), true)
    assert.equal(work.reviewItems.every((item) => item.automaticCorrectionAuthority === false), true)
    assert.equal(work.reviewItems.some((item) => item.observedDiagnosticCodes.includes('MIDI_EXACT_MATCH')), false)
    assert.equal(work.reviewItems.some((item) => item.observedDiagnosticCodes.includes('MIDI_PITCH_MATCH')), false)
    assert.equal(work.selectionPolicy.reviewOrderingOnly, true)
    assert.equal(work.selectionPolicy.confidenceOrAuthorityMeaning, false)
  }
})

test('unmatched MIDI witnesses stay explicitly non-conclusive', () => {
  for (const work of REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.works) {
    const witnesses = work.reviewItems.filter((item) => item.kind === 'UNMATCHED_MIDI_WITNESS_GROUP')
    assert.equal(witnesses.length, 4)
    for (const item of witnesses) {
      assert.equal(item.diagnosticCode, 'MIDI_EXTRA_NOTE')
      assert.equal(item.scoreEventId, null)
      assert.equal(item.semanticGuard, 'UNMATCHED_MIDI_WITNESS_NOT_PROVEN_MISSING_OMR_NOTE')
      assert.equal(item.midiEventIds.length > 0, true)
    }
  }
})

test('queue materialization preserves the existing READY_FOR_ORACLE_REVIEW gate', () => {
  const sorQueue = materializeRealOmrMidiShadowReviewQueue('sor', ready('sor'))
  assert.equal(sorQueue.length, 20)
  assert.equal(sorQueue.every((item) => item.status === 'PENDING'), true)
  assert.equal(sorQueue.every((item) => item.verifiedLabel === null), true)
  assert.equal(sorQueue.every((item) => item.automaticCorrectionAuthority === false), true)

  assert.throws(
    () => materializeRealOmrMidiShadowReviewQueue('bach', {
      id: getRealOmrMidiShadowReviewWork('bach').pairId,
      status: REAL_MIDI_PAIR_STATUS.NEEDS_CANONICAL_SCOREGRAPH,
      readyForOracleReview: false,
    }),
    /READY_FOR_ORACLE_REVIEW/,
  )
  assert.throws(() => materializeRealOmrMidiShadowReviewQueue('sor', ready('bach')), /does not match/)
})

test('pinned descriptive totals remain shadow measurements, not precision or reliability claims', () => {
  const sor = getRealOmrMidiShadowReviewWork('sor')
  const bach = getRealOmrMidiShadowReviewWork('bach')
  assert.deepEqual(sor.comparison.diagnosticCounts, {
    MIDI_EXACT_MATCH: 108,
    MIDI_PITCH_CONFLICT: 50,
    MIDI_DURATION_CONFLICT: 25,
    MIDI_EXTRA_NOTE: 164,
    MIDI_AMBIGUOUS_MATCH: 4,
    MIDI_PITCH_MATCH: 8,
    MIDI_ONSET_CONFLICT: 9,
    MIDI_SCORE_NOTE_MISSING: 5,
  })
  assert.deepEqual(bach.comparison.diagnosticCounts, {
    MIDI_EXACT_MATCH: 356,
    MIDI_PITCH_CONFLICT: 89,
    MIDI_DURATION_CONFLICT: 84,
    MIDI_ONSET_CONFLICT: 26,
    MIDI_EXTRA_NOTE: 31,
    MIDI_PITCH_MATCH: 69,
    MIDI_SCORE_NOTE_MISSING: 59,
    MIDI_AMBIGUOUS_MATCH: 4,
  })
  assert.equal(REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.safety.measuredReliability, false)
  assert.equal(REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.safety.teacherGold, false)
})
