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
})

const pianoPacket = approveTeacherReviewPacket(
  getReferenceReviewPacket('review-piano-satie-je-te-veux-opening'),
  TEACHER_APPROVALS.piano,
)
const guitarPacket = approveTeacherReviewPacket(
  getReferenceReviewPacket('review-guitar-sor-op35-no13-home-theme'),
  TEACHER_APPROVALS.guitar,
)

export const APPROVED_REVIEW_PACKETS = Object.freeze([pianoPacket, guitarPacket])

export const GOLD_ELIGIBLE_REFERENCE_CORPUS = Object.freeze([
  promoteReviewedSourceForGold(getReferenceCorpusSource(pianoPacket.sourceId), pianoPacket),
  promoteReviewedSourceForGold(getReferenceCorpusSource(guitarPacket.sourceId), guitarPacket),
])

export function getGoldEligibleReferenceSource(id) {
  const source = GOLD_ELIGIBLE_REFERENCE_CORPUS.find((entry) => entry.id === id)
  if (!source) throw new TypeError(`Unknown gold-eligible reference source: ${id}`)
  return source
}
