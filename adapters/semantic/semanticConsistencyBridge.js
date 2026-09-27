import { createHash } from 'node:crypto'
import {
  SEMANTIC_CONSISTENCY_AUTHORITY,
  SEMANTIC_CONSISTENCY_DIAGNOSTIC as CODE,
  SEMANTIC_CONSISTENCY_MODE,
  SEMANTIC_CONSISTENCY_STATUS as STATUS,
} from './semanticConsistencyContract.js'
import {
  SemanticConsistencyReferenceError,
  validateSemanticConsistencyReference,
} from './semanticReference.js'
import { compareScoreGraphWithSemanticReference } from './semanticConsistencyComparison.js'

function deepFreeze(value, skip = null) {
  if (!value || typeof value !== 'object' || value === skip || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child, skip)
  return Object.freeze(value)
}

function fingerprint(scoreGraph) {
  return createHash('sha256').update(JSON.stringify(scoreGraph)).digest('hex')
}

function sourceMismatch(message) {
  return Object.freeze({
    status: STATUS.UNSUPPORTED,
    diagnostics: Object.freeze([
      Object.freeze({ code: CODE.SOURCE_MISMATCH, message, location: null }),
    ]),
  })
}

function packet({ scoreGraph, provenance, comparison, scoreUnchanged }) {
  const result = {
    mode: SEMANTIC_CONSISTENCY_MODE,
    authority: SEMANTIC_CONSISTENCY_AUTHORITY,
    effectiveWeight: 0,
    resolverEligible: false,
    candidateEvidenceEligible: false,
    automaticCorrectionAuthority: false,
    teacherGoldAuthority: false,
    readinessPromotionAuthority: false,
    sourceGraph: scoreGraph,
    provenance,
    status: comparison.status,
    diagnostics: comparison.diagnostics,
    invariants: {
      scoreUnchanged,
      sourceMutation: false,
      correctionPatchesProduced: false,
      automaticCorrectionAuthority: false,
      resolverEligible: false,
    },
  }
  deepFreeze(result, scoreGraph)
  return Object.freeze(result)
}

export function analyzeSemanticConsistency({
  scoreGraph,
  provenance,
  semanticSnapshot,
  observedSourceSha256,
  observedSourceId,
  sourceProfile,
}) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')

  const before = fingerprint(scoreGraph)
  let reference = null
  let comparison = null

  if (!sourceProfile || sourceProfile.status !== STATUS.PASS) {
    comparison = Object.freeze({
      status: STATUS.UNSUPPORTED,
      diagnostics: Object.freeze(
        Array.isArray(sourceProfile?.diagnostics) && sourceProfile.diagnostics.length > 0
          ? [...sourceProfile.diagnostics]
          : [Object.freeze({
              code: CODE.PROFILE_UNSUPPORTED,
              message: 'A PASS semantic source-profile admission is required.',
              location: null,
            })]
      ),
    })
  } else if (sourceProfile.sourceSha256 !== observedSourceSha256) {
    comparison = sourceMismatch('Semantic source-profile bytes do not match the observed source SHA-256.')
  } else if (scoreGraph.sourceId !== observedSourceId) {
    comparison = sourceMismatch('ScoreGraph source identity does not match the observed semantic source.')
  } else {
    try {
      reference = validateSemanticConsistencyReference({
        provenance,
        semanticSnapshot,
        observedSourceSha256,
        observedSourceId,
      })
      comparison = compareScoreGraphWithSemanticReference({ scoreGraph, reference })
    } catch (error) {
      if (!(error instanceof SemanticConsistencyReferenceError)) throw error
      comparison = sourceMismatch(error.message)
    }
  }

  const after = fingerprint(scoreGraph)
  if (before !== after) throw new Error('SEMANTIC_SOURCE_MUTATION_INVARIANT')

  const exposedProvenance = reference?.provenance ?? deepFreeze({ ...(provenance ?? {}) })
  return packet({
    scoreGraph,
    provenance: exposedProvenance,
    comparison,
    scoreUnchanged: true,
  })
}
