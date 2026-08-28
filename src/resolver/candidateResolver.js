import { CORRECTION_STATUS } from '../contracts/status.js'
import { createCorrectionResult } from '../contracts/correctionResult.js'

export const DEFAULT_RESOLUTION_POLICY = Object.freeze({ minConfidence: 0.9, minMargin: 0.1, minIndependentEvidenceSources: 2, maxCandidates: 64 })

function independentSources(candidate) {
  return new Set((candidate.evidence || []).map((item) => item?.source).filter(Boolean)).size
}

export function resolveCandidates(candidates, options = {}) {
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array.')
  const policy = { ...DEFAULT_RESOLUTION_POLICY, ...options }
  if (candidates.length === 0) return createCorrectionResult({ status: CORRECTION_STATUS.NO_CHANGE })
  if (candidates.length > policy.maxCandidates) {
    return createCorrectionResult({ status: CORRECTION_STATUS.AMBIGUOUS, abstainReason: 'candidate-limit-exceeded' })
  }

  const eligible = candidates
    .filter((candidate) => (candidate.hardViolations || []).length === 0)
    .filter((candidate) => independentSources(candidate) >= policy.minIndependentEvidenceSources)
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))

  if (eligible.length === 0) return createCorrectionResult({ status: CORRECTION_STATUS.AMBIGUOUS, abstainReason: 'insufficient-independent-evidence' })

  const winner = eligible[0]
  const runnerUp = eligible[1] ?? null
  const margin = runnerUp ? winner.confidence - runnerUp.confidence : winner.confidence
  if (winner.confidence < policy.minConfidence) return createCorrectionResult({ status: CORRECTION_STATUS.AMBIGUOUS, candidates: eligible, confidence: winner.confidence, evidence: winner.evidence, abstainReason: 'confidence-below-threshold' })
  if (runnerUp && margin < policy.minMargin) return createCorrectionResult({ status: CORRECTION_STATUS.AMBIGUOUS, candidates: eligible, confidence: winner.confidence, evidence: winner.evidence, abstainReason: 'candidate-margin-too-small' })

  return createCorrectionResult({ status: CORRECTION_STATUS.RESOLVED, candidates: eligible, proposedPatches: winner.patches, confidence: winner.confidence, evidence: winner.evidence })
}
