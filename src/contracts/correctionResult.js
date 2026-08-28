import { CORRECTION_STATUS, isCorrectionStatus } from './status.js'

export function createCorrectionResult({ status = CORRECTION_STATUS.NO_CHANGE, candidates = [], proposedPatches = [], confidence = 0, evidence = [], abstainReason = null }) {
  if (!isCorrectionStatus(status)) throw new TypeError('Invalid correction status.')
  if (!Array.isArray(candidates) || !Array.isArray(proposedPatches) || !Array.isArray(evidence)) throw new TypeError('Result collections must be arrays.')
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new RangeError('confidence must be between 0 and 1.')
  if (status === CORRECTION_STATUS.AMBIGUOUS && (!abstainReason || typeof abstainReason !== 'string')) {
    throw new TypeError('AMBIGUOUS results require an abstainReason.')
  }
  return Object.freeze({ status, candidates: Object.freeze([...candidates]), proposedPatches: Object.freeze([...proposedPatches]), confidence, evidence: Object.freeze([...evidence]), abstainReason })
}
