export function createCandidate({ id, patches = [], evidence = [], confidence = 0, hardViolations = [], rationale = null }) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('candidate id is required.')
  if (!Array.isArray(patches) || !Array.isArray(evidence) || !Array.isArray(hardViolations)) throw new TypeError('candidate collections must be arrays.')
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new RangeError('candidate confidence must be between 0 and 1.')
  return Object.freeze({ id, patches: Object.freeze([...patches]), evidence: Object.freeze([...evidence]), confidence, hardViolations: Object.freeze([...hardViolations]), rationale })
}
