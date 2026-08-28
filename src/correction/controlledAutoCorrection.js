import { CORRECTION_STATUS } from '../contracts/status.js'
import { PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { DEFAULT_RESOLUTION_POLICY } from '../resolver/candidateResolver.js'
import { projectCorrectionPatches } from './patchProjection.js'

export const CONTROLLED_CORRECTION_DECISION = Object.freeze({
  ACCEPT: 'ACCEPT',
  REVIEW: 'REVIEW',
  BLOCK: 'BLOCK',
})

export const E11A_CONTROLLED_POLICY = Object.freeze({
  minConfidence: DEFAULT_RESOLUTION_POLICY.minConfidence,
  minIndependentEvidenceSources: DEFAULT_RESOLUTION_POLICY.minIndependentEvidenceSources,
  maxPatches: 1,
  allowedOperations: Object.freeze([PATCH_OPERATION.CHANGE_VOICE]),
})

function independentEvidenceSources(evidence) {
  return new Set((evidence || []).map((item) => item?.source).filter(Boolean)).size
}

function normalizeRevalidation(value) {
  if (!value || typeof value !== 'object') return null
  if (!Object.values(CONTROLLED_CORRECTION_DECISION).includes(value.decision)) return null
  const findings = Array.isArray(value.findings) ? Object.freeze([...value.findings]) : Object.freeze([])
  const reason = typeof value.reason === 'string' && value.reason.trim() ? value.reason : null
  return Object.freeze({ decision: value.decision, findings, reason })
}

function result({ decision, code, sourceGraph, graph = sourceGraph, patch = null, audit = [], revalidation = null }) {
  return Object.freeze({
    decision,
    code,
    applied: decision === CONTROLLED_CORRECTION_DECISION.ACCEPT,
    sourceGraph,
    graph,
    patch,
    audit: Object.freeze([...audit]),
    revalidation,
  })
}

export async function applyControlledVoiceCorrection({ scoreGraph, correctionResult, revalidate }) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')
  if (!correctionResult || typeof correctionResult !== 'object') throw new TypeError('correctionResult is required.')

  if (correctionResult.status !== CORRECTION_STATUS.RESOLVED) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.REVIEW, code: 'CORRECTION_NOT_RESOLVED', sourceGraph: scoreGraph })
  }

  if (correctionResult.confidence < E11A_CONTROLLED_POLICY.minConfidence) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.REVIEW, code: 'CONFIDENCE_BELOW_E11A_THRESHOLD', sourceGraph: scoreGraph })
  }

  if (independentEvidenceSources(correctionResult.evidence) < E11A_CONTROLLED_POLICY.minIndependentEvidenceSources) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.REVIEW, code: 'INSUFFICIENT_INDEPENDENT_EVIDENCE', sourceGraph: scoreGraph })
  }

  if (!Array.isArray(correctionResult.proposedPatches) || correctionResult.proposedPatches.length !== E11A_CONTROLLED_POLICY.maxPatches) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.REVIEW, code: 'E11A_REQUIRES_SINGLE_PATCH', sourceGraph: scoreGraph })
  }

  const patch = correctionResult.proposedPatches[0]
  if (!E11A_CONTROLLED_POLICY.allowedOperations.includes(patch?.operation)) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.REVIEW, code: 'E11A_OPERATION_NOT_ALLOWED', sourceGraph: scoreGraph, patch })
  }

  if (patch.confidence < E11A_CONTROLLED_POLICY.minConfidence) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.REVIEW, code: 'PATCH_CONFIDENCE_BELOW_E11A_THRESHOLD', sourceGraph: scoreGraph, patch })
  }

  if (independentEvidenceSources(patch.evidence) < E11A_CONTROLLED_POLICY.minIndependentEvidenceSources) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.REVIEW, code: 'PATCH_EVIDENCE_INSUFFICIENT', sourceGraph: scoreGraph, patch })
  }

  if (typeof revalidate !== 'function') {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.BLOCK, code: 'REVALIDATION_REQUIRED', sourceGraph: scoreGraph, patch })
  }

  const projected = projectCorrectionPatches(scoreGraph, [patch])
  if (!projected.ok) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.BLOCK, code: `PROJECTION_${projected.code}`, sourceGraph: scoreGraph, patch, audit: projected.audit })
  }

  let gate
  try {
    gate = normalizeRevalidation(await revalidate(Object.freeze({
      sourceGraph: scoreGraph,
      projectedGraph: projected.graph,
      patch,
      correctionResult,
    })))
  } catch {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.BLOCK, code: 'REVALIDATION_ERROR', sourceGraph: scoreGraph, patch, audit: projected.audit })
  }

  if (!gate) {
    return result({ decision: CONTROLLED_CORRECTION_DECISION.BLOCK, code: 'INVALID_REVALIDATION_RESULT', sourceGraph: scoreGraph, patch, audit: projected.audit })
  }

  if (gate.decision !== CONTROLLED_CORRECTION_DECISION.ACCEPT) {
    return result({ decision: gate.decision, code: 'REVALIDATION_DID_NOT_ACCEPT', sourceGraph: scoreGraph, patch, audit: projected.audit, revalidation: gate })
  }

  return result({
    decision: CONTROLLED_CORRECTION_DECISION.ACCEPT,
    code: 'E11A_ACCEPTED',
    sourceGraph: scoreGraph,
    graph: projected.graph,
    patch,
    audit: projected.audit,
    revalidation: gate,
  })
}
