import { POLYPHONIC_ERROR_CLASS, isPolyphonicErrorClass } from '../../src/contracts/errorTaxonomy.js'

export const SCOREMOSAIC_SHADOW_BOUNDARIES = Object.freeze({
  winnerSelection: false,
  quorumMutation: false,
  candidateDeletion: false,
  teacherRevisionMutation: false,
  musicXmlMerge: false,
  patchApplication: false,
})

function normalizeDisagreement(item) {
  if (!item || typeof item !== 'object') throw new TypeError('disagreements must contain objects.')
  if (typeof item.id !== 'string' || !item.id.trim()) throw new TypeError('disagreement id is required.')
  const errorClass = isPolyphonicErrorClass(item.errorClass) ? item.errorClass : POLYPHONIC_ERROR_CLASS.OTHER
  return Object.freeze({
    id: item.id,
    errorClass,
    eventId: typeof item.eventId === 'string' && item.eventId.trim() ? item.eventId : null,
    measureKey: typeof item.measureKey === 'string' && item.measureKey.trim() ? item.measureKey : null,
    staff: Number.isInteger(item.staff) && item.staff > 0 ? item.staff : null,
    voice: Number.isInteger(item.voice) && item.voice > 0 ? item.voice : null,
    engineEvidence: Object.freeze(Array.isArray(item.engineEvidence) ? [...item.engineEvidence] : []),
    visualEvidence: item.visualEvidence ?? null,
    sourceQualityEvidence: item.sourceQualityEvidence ?? null,
    provenance: item.provenance ?? null,
  })
}

export function createScoreMosaicShadowEvidencePacket({ scoreGraph, canonicalDisagreements = [], scoreMosaicRef = null }) {
  if (!scoreGraph || !Array.isArray(scoreGraph.events)) throw new TypeError('scoreGraph with events is required.')
  if (!Array.isArray(canonicalDisagreements)) throw new TypeError('canonicalDisagreements must be an array.')

  const normalized = canonicalDisagreements.map(normalizeDisagreement)
  const ids = new Set()
  for (const item of normalized) {
    if (ids.has(item.id)) throw new TypeError('disagreement ids must be unique.')
    ids.add(item.id)
  }

  const evidence = [...normalized].sort((a, b) => a.id.localeCompare(b.id))
  return Object.freeze({
    mode: 'shadow',
    authority: 'evidence-only',
    scoreMosaicRef,
    sourceGraph: scoreGraph,
    evidence: Object.freeze(evidence),
    boundaries: SCOREMOSAIC_SHADOW_BOUNDARIES,
  })
}
