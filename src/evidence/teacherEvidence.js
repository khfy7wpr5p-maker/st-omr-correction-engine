import { EVIDENCE_SOURCE, createEvidence } from '../contracts/evidence.js'

export function createTeacherApproval({ approvalId, approved, notes = null }) {
  if (typeof approvalId !== 'string' || !approvalId.trim()) throw new TypeError('approvalId is required.')
  if (approved !== true) throw new TypeError('Teacher approval must be explicit and true.')
  return Object.freeze({ approvalId, approved: true, notes })
}

export function createTeacherEvidence({ approval, code = 'TEACHER_APPROVED', location = null, details = null }) {
  if (!approval || approval.approved !== true || typeof approval.approvalId !== 'string') {
    throw new TypeError('Approved teacher provenance is required.')
  }
  return createEvidence({
    source: EVIDENCE_SOURCE.TEACHER,
    code,
    weight: 1,
    location,
    details: Object.freeze({ approvalId: approval.approvalId, payload: details }),
  })
}
