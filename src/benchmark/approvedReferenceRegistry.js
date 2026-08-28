import { createTeacherApproval } from '../evidence/teacherEvidence.js'
import { getReferenceCorpusSource } from './referenceCorpusRegistry.js'
import { getReferenceReviewPacket } from './referenceReviewQueue.js'
import { approveTeacherReviewPacket, promoteReviewedSourceForGold } from './teacherReviewPacket.js'

export const TEACHER_APPROVALS = Object.freeze({
  piano: createTeacherApproval({
    approvalId: 'teacher-review-2026-08-28-satie-je-te-veux-m1-8',
    approved: true,
    notes: 'Explicit musical approval provided in the project conversation on 2026-08-28 for the bounded piano review packet.',
  }),
  guitar: createTeacherApproval({
    approvalId: 'teacher-review-2026-08-28-sor-op35-no13-m1-8',
    approved: true,
    notes: 'Explicit musical approval provided in the project conversation on 2026-08-28 for the bounded classical-guitar review packet.',
  }),
  paradis: createTeacherApproval({
    approvalId: 'teacher-review-2026-08-28-paradis-an-das-klavier-m1-8',
    approved: true,
    notes: 'Explicit musical approval provided in the project conversation on 2026-08-28 for Paradis, An das Klavier, measures 1-8, piano staves 2-3.',
  }),
  webern: createTeacherApproval({
    approvalId: 'teacher-review-2026-08-28-webern-op4-no4-m1-8',
    approved: true,
    notes: 'Explicit musical approval provided in the project conversation on 2026-08-28 for Webern Op. 4 No. 4, measures 1-8, piano staves 2-3.',
  }),
  lagrima: createTeacherApproval({
    approvalId: 'teacher-review-2026-08-28-tarrega-lagrima-m1-8',
    approved: true,
    notes: 'Explicit musical approval provided in the project conversation on 2026-08-28 for Tarrega, Lagrima, measures 1-8, classical-guitar staff 1.',
  }),
  dowland: createTeacherApproval({
    approvalId: 'teacher-review-2026-08-28-dowland-fantasia-7-m1-8',
    approved: true,
    notes: 'Explicit musical approval provided in the project conversation on 2026-08-28 for Dowland, Fantasia Number 7, measures 1-8, classical-guitar staff 1.',
  }),
})

const approvalSpecs = Object.freeze([
  ['review-piano-satie-je-te-veux-opening', TEACHER_APPROVALS.piano],
  ['review-guitar-sor-op35-no13-home-theme', TEACHER_APPROVALS.guitar],
  ['review-piano-paradis-an-das-klavier-opening', TEACHER_APPROVALS.paradis],
  ['review-piano-webern-op4-no4-opening', TEACHER_APPROVALS.webern],
  ['review-guitar-tarrega-lagrima-opening', TEACHER_APPROVALS.lagrima],
  ['review-guitar-dowland-fantasia-7-opening', TEACHER_APPROVALS.dowland],
])

export const APPROVED_REVIEW_PACKETS = Object.freeze(
  approvalSpecs.map(([packetId, approval]) => approveTeacherReviewPacket(getReferenceReviewPacket(packetId), approval)),
)

export const GOLD_ELIGIBLE_REFERENCE_CORPUS = Object.freeze(
  APPROVED_REVIEW_PACKETS.map((packet) => promoteReviewedSourceForGold(getReferenceCorpusSource(packet.sourceId), packet)),
)

export function getGoldEligibleReferenceSource(id) {
  const source = GOLD_ELIGIBLE_REFERENCE_CORPUS.find((entry) => entry.id === id)
  if (!source) throw new TypeError(`Unknown gold-eligible reference source: ${id}`)
  return source
}
