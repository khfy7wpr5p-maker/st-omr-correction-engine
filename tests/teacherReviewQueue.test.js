import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORPUS_SOURCE_STATUS,
  REFERENCE_REVIEW_QUEUE,
  REVIEW_PACKET_STATUS,
  approveTeacherReviewPacket,
  createTeacherApproval,
  getReferenceCorpusSource,
  promoteReviewedSourceForGold,
  rejectTeacherReviewPacket,
} from '../src/index.js'

test('expanded real-source review queue is pending and instrument balanced', () => {
  assert.equal(REFERENCE_REVIEW_QUEUE.length, 6)
  assert.equal(REFERENCE_REVIEW_QUEUE.every((packet) => packet.status === REVIEW_PACKET_STATUS.PENDING), true)
  const profiles = REFERENCE_REVIEW_QUEUE.map((packet) => getReferenceCorpusSource(packet.sourceId).instrumentProfile)
  assert.equal(profiles.filter((profile) => profile === 'piano').length, 3)
  assert.equal(profiles.filter((profile) => profile === 'classical-guitar').length, 3)
})

test('existing approved sources remain represented without changing pending queue originals', () => {
  const sourceIds = new Set(REFERENCE_REVIEW_QUEUE.map((packet) => packet.sourceId))
  assert.equal(sourceIds.has('piano-openscore-lieder-satie-je-te-veux'), true)
  assert.equal(sourceIds.has('classical-guitar-sor-op35-no13-study-in-c'), true)
})

test('new reference review focus reflects source-verified challenge diversity', () => {
  const paradís = REFERENCE_REVIEW_QUEUE.find((packet) => packet.sourceId === 'piano-openscore-paradis-an-das-klavier')
  const webern = REFERENCE_REVIEW_QUEUE.find((packet) => packet.sourceId === 'piano-openscore-webern-op4-no4')
  const lagrima = REFERENCE_REVIEW_QUEUE.find((packet) => packet.sourceId === 'classical-guitar-tarrega-lagrima')
  const dowland = REFERENCE_REVIEW_QUEUE.find((packet) => packet.sourceId === 'classical-guitar-dowland-fantasia-7')

  assert.equal(paradís.focusTags.includes('2-4-meter'), true)
  assert.equal(webern.focusTags.includes('irregular-opening-measure'), true)
  assert.equal(lagrima.focusTags.includes('three-voice-polyphony'), true)
  assert.equal(dowland.focusTags.includes('four-voice-polyphony'), true)
  assert.equal(dowland.focusTags.includes('tuplets'), true)
  assert.equal([paradís, webern, lagrima, dowland].every((packet) => packet.status === REVIEW_PACKET_STATUS.PENDING), true)
})

test('pending review cannot silently become gold', () => {
  const packet = REFERENCE_REVIEW_QUEUE.find((entry) => entry.sourceId === 'piano-openscore-paradis-an-das-klavier')
  const source = getReferenceCorpusSource(packet.sourceId)
  assert.throws(() => promoteReviewedSourceForGold(source, packet), /must be approved/i)
  assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
})

test('approved review can create a new gold-eligible source without mutating originals', () => {
  const packet = REFERENCE_REVIEW_QUEUE.find((entry) => entry.sourceId === 'piano-openscore-paradis-an-das-klavier')
  const source = getReferenceCorpusSource(packet.sourceId)
  const approval = createTeacherApproval({ approvalId: 'teacher-e10g-fixture-001', approved: true })
  const approvedPacket = approveTeacherReviewPacket(packet, approval)
  const promoted = promoteReviewedSourceForGold(source, approvedPacket)

  assert.equal(approvedPacket.status, REVIEW_PACKET_STATUS.APPROVED)
  assert.equal(promoted.status, CORPUS_SOURCE_STATUS.GOLD_ELIGIBLE)
  assert.equal(packet.status, REVIEW_PACKET_STATUS.PENDING)
  assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
})

test('review packet cannot approve a different source', () => {
  const packet = REFERENCE_REVIEW_QUEUE.find((entry) => entry.sourceId === 'classical-guitar-tarrega-lagrima')
  const wrongSource = getReferenceCorpusSource('classical-guitar-dowland-fantasia-7')
  const approval = createTeacherApproval({ approvalId: 'teacher-e10g-fixture-002', approved: true })
  const approvedPacket = approveTeacherReviewPacket(packet, approval)
  assert.throws(() => promoteReviewedSourceForGold(wrongSource, approvedPacket), /does not belong/i)
})

test('rejection is explicit and immutable', () => {
  const packet = REFERENCE_REVIEW_QUEUE.find((entry) => entry.sourceId === 'piano-openscore-webern-op4-no4')
  const rejected = rejectTeacherReviewPacket(packet, { reviewId: 'teacher-e10g-reject-001', reason: 'excerpt needs different measure range' })
  assert.equal(rejected.status, REVIEW_PACKET_STATUS.REJECTED)
  assert.equal(packet.status, REVIEW_PACKET_STATUS.PENDING)
})
