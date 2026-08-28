import { EVIDENCE_SOURCE, createEvidence } from '../contracts/evidence.js'

const ADJACENCY_EPSILON = 1e-9

export const VOICE_EVIDENCE_WEIGHTS = Object.freeze({
  existingVoiceBase: 0.45,
  alternativeVoiceBase: 0.35,
  stemPrior: 0.2,
  beamContinuity: 0.2,
  sameStaffTemporalContinuity: 0.15,
})

function overlaps(a, b) {
  return a.onset < b.end && b.onset < a.end && !a.isChordTone && !b.isChordTone
}

function isTemporallyAdjacent(a, b) {
  return Math.abs(a.end - b.onset) <= ADJACENCY_EPSILON || Math.abs(b.end - a.onset) <= ADJACENCY_EPSILON
}

export function scoreVoiceAssignment(event, targetVoice, allEvents, profile) {
  const evidence = []
  const hardViolations = []
  let score = targetVoice === event.voice ? VOICE_EVIDENCE_WEIGHTS.existingVoiceBase : VOICE_EVIDENCE_WEIGHTS.alternativeVoiceBase

  const stem = event.metadata?.stemDirection
  const stemPrior = stem ? profile.stemVoicePrior?.[stem] : null
  if (stemPrior && stemPrior === targetVoice) {
    score += VOICE_EVIDENCE_WEIGHTS.stemPrior
    evidence.push(createEvidence({ source: EVIDENCE_SOURCE.SYMBOLIC, code: 'STEM_DIRECTION_PRIOR', weight: 0.7, location: { eventId: event.id } }))
  }

  const beamGroup = event.metadata?.beamGroup
  if (beamGroup) {
    const peers = allEvents.filter((peer) => peer.id !== event.id && peer.metadata?.beamGroup === beamGroup)
    if (peers.some((peer) => peer.voice === targetVoice)) {
      score += VOICE_EVIDENCE_WEIGHTS.beamContinuity
      evidence.push(createEvidence({ source: EVIDENCE_SOURCE.SYMBOLIC, code: 'BEAM_VOICE_CONTINUITY', weight: 0.8, location: { eventId: event.id } }))
    }
  }

  const sameVoiceEvents = allEvents.filter((peer) => peer.id !== event.id && peer.measureKey === event.measureKey && peer.staff === event.staff && peer.voice === targetVoice)
  if (sameVoiceEvents.some((peer) => !peer.isRest && isTemporallyAdjacent(event, peer))) {
    score += VOICE_EVIDENCE_WEIGHTS.sameStaffTemporalContinuity
    evidence.push(createEvidence({ source: EVIDENCE_SOURCE.SYMBOLIC, code: 'SAME_STAFF_TEMPORAL_VOICE_CONTINUITY', weight: 0.75, location: { eventId: event.id } }))
  }

  if (sameVoiceEvents.some((peer) => overlaps(event, peer))) hardViolations.push('VOICE_OVERLAP')

  const boundedScore = Math.max(0, Math.min(1, score))
  return Object.freeze({ score: Number(boundedScore.toFixed(6)), evidence: Object.freeze(evidence), hardViolations: Object.freeze(hardViolations) })
}
