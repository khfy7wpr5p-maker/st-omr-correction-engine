import { promoteCorpusSourceForGold } from './corpusSource.js'

export const REVIEW_PACKET_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
})

function nonEmpty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

export function createTeacherReviewPacket({ id, sourceId, excerpt, focusTags = [], notes = null }) {
  nonEmpty(id, 'id')
  nonEmpty(sourceId, 'sourceId')
  if (!excerpt || typeof excerpt !== 'object' || Array.isArray(excerpt)) throw new TypeError('excerpt must be an object.')
  if (!Array.isArray(focusTags)) throw new TypeError('focusTags must be an array.')

  return Object.freeze({
    id,
    sourceId,
    excerpt: Object.freeze({ ...excerpt }),
    focusTags: Object.freeze([...focusTags]),
    notes,
    status: REVIEW_PACKET_STATUS.PENDING,
    teacherApproval: null,
    rejection: null,
  })
}

export function approveTeacherReviewPacket(packet, teacherApproval) {
  if (!packet || packet.status !== REVIEW_PACKET_STATUS.PENDING) throw new TypeError('Only pending review packets can be approved.')
  if (!teacherApproval || teacherApproval.approved !== true || typeof teacherApproval.approvalId !== 'string' || !teacherApproval.approvalId.trim()) {
    throw new TypeError('Explicit teacher approval provenance is required.')
  }
  return Object.freeze({ ...packet, status: REVIEW_PACKET_STATUS.APPROVED, teacherApproval: Object.freeze({ ...teacherApproval }) })
}

export function rejectTeacherReviewPacket(packet, { reviewId, reason }) {
  if (!packet || packet.status !== REVIEW_PACKET_STATUS.PENDING) throw new TypeError('Only pending review packets can be rejected.')
  nonEmpty(reviewId, 'reviewId')
  nonEmpty(reason, 'reason')
  return Object.freeze({ ...packet, status: REVIEW_PACKET_STATUS.REJECTED, rejection: Object.freeze({ reviewId, reason }) })
}

export function promoteReviewedSourceForGold(source, approvedPacket) {
  if (!source || !approvedPacket) throw new TypeError('source and approvedPacket are required.')
  if (approvedPacket.status !== REVIEW_PACKET_STATUS.APPROVED) throw new TypeError('Review packet must be approved before gold promotion.')
  if (approvedPacket.sourceId !== source.id) throw new TypeError('Review packet does not belong to this corpus source.')
  return promoteCorpusSourceForGold(source, approvedPacket.teacherApproval)
}
