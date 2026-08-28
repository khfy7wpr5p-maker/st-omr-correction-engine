import { EVIDENCE_SOURCE, createEvidence } from '../contracts/evidence.js'

function overlaps(a, b) {
  return a.onset < b.end && b.onset < a.end && !a.isChordTone && !b.isChordTone
}

export function scoreVoiceAssignment(event, targetVoice, allEvents, profile) {
  const evidence = []
  const hardViolations = []
  let score = targetVoice === event.voice ? 0.45 : 0.35

  const stem = event.metadata?.stemDirection
  const stemPrior = stem ? profile.stemVoicePrior?.[stem] : null
  if (stemPrior && stemPrior === targetVoice) {
    score += 0.2
    evidence.push(createEvidence({ source: EVIDENCE_SOURCE.SYMBOLIC, code: 'STEM_DIRECTION_PRIOR', weight: 0.7, location: { eventId: event.id } }))
  }

  const beamGroup = event.metadata?.beamGroup
  if (beamGroup) {
    const peers = allEvents.filter((peer) => peer.id !== event.id && peer.metadata?.beamGroup === beamGroup)
    if (peers.some((peer) => peer.voice === targetVoice)) {
      score += 0.2
      evidence.push(createEvidence({ source: EVIDENCE_SOURCE.SYMBOLIC, code: 'BEAM_VOICE_CONTINUITY', weight: 0.8, location: { eventId: event.id } }))
    }
  }

  const sameVoiceEvents = allEvents.filter((peer) => peer.id !== event.id && peer.measureKey === event.measureKey && peer.staff === event.staff && peer.voice === targetVoice)
  if (sameVoiceEvents.some((peer) => overlaps(event, peer))) hardViolations.push('VOICE_OVERLAP')

  return Object.freeze({ score: Math.max(0, Math.min(1, score)), evidence: Object.freeze(evidence), hardViolations: Object.freeze(hardViolations) })
}
