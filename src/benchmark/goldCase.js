export function createGoldCase({ id, input, expectedPatches, teacherApproval }) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('gold case id is required.')
  if (!input || typeof input !== 'object') throw new TypeError('gold case input is required.')
  if (!Array.isArray(expectedPatches)) throw new TypeError('expectedPatches must be an array.')
  if (!teacherApproval || teacherApproval.approved !== true || typeof teacherApproval.approvalId !== 'string') {
    throw new TypeError('Teacher-approved provenance is required for benchmark gold cases.')
  }
  return Object.freeze({ id, input, expectedPatches: Object.freeze([...expectedPatches]), teacherApproval })
}
