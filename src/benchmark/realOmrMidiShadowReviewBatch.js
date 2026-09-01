import { createRealMidiOracleReviewItem } from './realMidiOracleReviewQueue.js'
import sorWork from './realOmrMidiShadowReviewBatchSorData.js'
import bachWork from './realOmrMidiShadowReviewBatchBachData.js'

export const REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_VERSION = '1.0.0'

export const REAL_OMR_MIDI_REVIEW_ITEM_KIND = Object.freeze({
  SCORE_EVENT_CONFLICT: 'SCORE_EVENT_CONFLICT',
  UNMATCHED_MIDI_WITNESS_GROUP: 'UNMATCHED_MIDI_WITNESS_GROUP',
})

const UNMATCHED_MIDI_GUARD = 'UNMATCHED_MIDI_WITNESS_NOT_PROVEN_MISSING_OMR_NOTE'

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function expandReviewSpec(spec) {
  const [reviewId, reviewPriorityRank, kind, measureKey, measureSuspicionCount, diagnosticCode, observedDiagnosticCodes, scoreEventId, midiEventIds] = spec
  return {
    reviewId,
    reviewPriorityRank,
    kind,
    measureKey,
    measureSuspicionCount,
    diagnosticCode,
    observedDiagnosticCodes,
    scoreEventId,
    midiEventIds,
    semanticGuard: kind === REAL_OMR_MIDI_REVIEW_ITEM_KIND.UNMATCHED_MIDI_WITNESS_GROUP ? UNMATCHED_MIDI_GUARD : null,
    status: 'PENDING',
    verifiedLabel: null,
    automaticCorrectionAuthority: false,
  }
}

const works = [sorWork, bachWork].map((work) => {
  const { reviewSpecs, ...rest } = work
  return { ...rest, reviewItems: reviewSpecs.map(expandReviewSpec) }
})

export const REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1 = deepFreeze({
  id: 'real-omr-midi-shadow-review-batch-v1',
  schemaVersion: REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_VERSION,
  status: 'PENDING_ORACLE_REVIEW',
  analysisBaseMainSha: '60838dd8e74138796a3422212a6b60860b696d4f',
  compatibleMainSha: '1616659728cdaf4d221f7d83b9ff4042f6cb2b80',
  codeIdentity: {
    midiScoreAlignmentBlobSha: '27f61ec0cb1b47f460cfffba9c164cb981df9b52',
    midiInstrumentContractBlobSha: '39e2e8440546cad3a25a538d711f9e0061dfe730',
    audiverisMusicXmlImporterBlobSha: 'f751be0cb65e190c60c26330834a1a58c22e8744',
  },
  safety: {
    shadowOnly: true,
    weight: 0,
    teacherGold: false,
    measuredReliability: false,
    automaticCorrectionAuthority: false,
    sourceMutation: false,
    extraMidiMeansMissingOmr: false,
  },
  works,
  batchSha256: 'fe2ba6369e4c16a8b18a011fa3bbf6954a67b0cc4165d3ac2276436e5e4c43e7',
})

export function getRealOmrMidiShadowReviewWork(id) {
  const work = REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.works.find((entry) => entry.id === id)
  if (!work) throw new TypeError(`Unknown real OMR/MIDI shadow review work: ${id}`)
  return work
}

export function materializeRealOmrMidiShadowReviewQueue(workId, pairReadiness) {
  const work = getRealOmrMidiShadowReviewWork(workId)
  if (pairReadiness?.id !== work.pairId) throw new TypeError('Pair readiness does not match the review work.')
  return Object.freeze(work.reviewItems.map((spec) => createRealMidiOracleReviewItem({
    reviewId: `${REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.id}:${spec.reviewId}`,
    pairReadiness,
    diagnosticCode: spec.diagnosticCode,
    scoreEventId: spec.scoreEventId,
    midiEventId: spec.midiEventIds.length === 1 ? spec.midiEventIds[0] : null,
    location: { measureKey: spec.measureKey },
    details: {
      reviewPriorityRank: spec.reviewPriorityRank,
      reviewItemKind: spec.kind,
      measureKey: spec.measureKey,
      measureSuspicionCount: spec.measureSuspicionCount,
      observedDiagnosticCodes: spec.observedDiagnosticCodes,
      midiEventIds: spec.midiEventIds,
      semanticGuard: spec.semanticGuard,
      reviewOrderingOnly: true,
      confidenceOrAuthorityMeaning: false,
      sourceOmrSha256: work.provenance.omrSourceSha256,
      canonicalGraphSha256: work.provenance.canonicalGraphSha256,
      midiSha256: work.provenance.midiSha256,
      comparisonStrategy: work.comparison.strategy,
    },
  })))
}
