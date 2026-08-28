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

test('first real-source review queue is pending and instrument balanced', () => {
  assert.equal(REFERENCE_REVIEW_QUEUE.length, 2)
  assert.equal(REFERENCE_REVIEW_QUEUE.every((packet) => packet.status === REVIEW_PACKET_STATUS.PENDING), true)
  const sourceIds = new Set(REFERENCE_REVIEW_QUEUE.map((packet) => packet.sourceId))
  assert.equal(sourceIds.has('piano-openscore-lieder-satie-je-te-veux'), true)
  assert.equal(sourceIds.has('classical-guitar-sor-op35-no13-study-in-c'), true)
})

test('pending review cannot silently become gold', () => {
  const packet = REFERENCE_REVIEW_QUEUE[0]
  const source = getReferenceCorpusSource(packet.sourceId)
  assert.throws(() => promoteReviewedSourceForGold(source, packet), /must be approved/i)
  assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
})

test('approved review can create a new gold-eligible source without mutating originals', () => {
  const packet = REFERENCE_REVIEW_QUEUE[0]
  const source = getReferenceCorpusSource(packet.sourceId)
  const approval = createTeacherApproval({ approvalId: 'teacher-e10b-001', approved: true })
  const approvedPacket = approveTeacherReviewPacket(packet, approval)
  const promoted = promoteReviewedSourceForGold(source, approvedPacket)

  assert.equal(approvedPacket.status, REVIEW_PACKET_STATUS.APPROVED)
  assert.equal(promoted.status, CORPUS_SOURCE_STATUS.GOLD_ELIGIBLE)
  assert.equal(packet.status, REVIEW_PACKET_STATUS.PENDING)
  assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
})

test('review packet cannot approve a different source', () => {
  const packet = REFERENCE_REVIEW_QUEUE[0]
  const wrongSource = getReferenceCorpusSource('classical-guitar-sor-op35-no13-study-in-c')
  const approval = createTeacherApproval({ approvalId: 'teacher-e10b-002', approved: true })
  const approvedPacket = approveTeacherReviewPacket(packet, approval)
  assert.throws(() => promoteReviewedSourceForGold(wrongSource, approvedPacket), /does not belong/i)
})

test('rejection is explicit and immutable', () => {
  const packet = REFERENCE_REVIEW_QUEUE[1]
  const rejected = rejectTeacherReviewPacket(packet, { reviewId: 'teacher-e10b-reject-001', reason: 'excerpt needs different measure range' })
  assert.equal(rejected.status, REVIEW_PACKET_STATUS.REJECTED)
  assert.equal(packet.status, REVIEW_PACKET_STATUS.PENDING)
})
