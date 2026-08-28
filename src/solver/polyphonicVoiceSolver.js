import { createCandidate } from '../candidates/candidate.js'
import { createCorrectionPatch, PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { EVIDENCE_SOURCE, createEvidence } from '../contracts/evidence.js'
import { getInstrumentProfile } from '../profiles/index.js'
import { scoreVoiceAssignment } from './voiceAssignmentScorer.js'

export const DEFAULT_VOICE_SOLVER_LIMITS = Object.freeze({ maxAmbiguousEvents: 6, maxCandidates: 32 })

export function generateVoiceCandidates({ events, ambiguousEventIds, instrumentProfile = 'generic', validatorFindings = [], limits = {} }) {
  if (!Array.isArray(events) || !Array.isArray(ambiguousEventIds) || !Array.isArray(validatorFindings)) throw new TypeError('events, ambiguousEventIds and validatorFindings must be arrays.')
  const profile = typeof instrumentProfile === 'string' ? getInstrumentProfile(instrumentProfile) : instrumentProfile
  const policy = { ...DEFAULT_VOICE_SOLVER_LIMITS, ...limits }
  if (ambiguousEventIds.length === 0) return Object.freeze({ candidates: Object.freeze([]), exhausted: false, reason: 'no-ambiguous-events' })
  if (ambiguousEventIds.length > policy.maxAmbiguousEvents) return Object.freeze({ candidates: Object.freeze([]), exhausted: true, reason: 'ambiguous-event-limit-exceeded' })

  const eventById = new Map(events.map((event) => [event.id, event]))
  const ambiguous = ambiguousEventIds.map((id) => eventById.get(id)).filter(Boolean)
  if (ambiguous.length !== ambiguousEventIds.length) return Object.freeze({ candidates: Object.freeze([]), exhausted: false, reason: 'unknown-event-id' })

  const validatorEvidence = validatorFindings.map((finding) => createEvidence({ source: EVIDENCE_SOURCE.VALIDATOR, code: finding.code || 'VALIDATOR_FINDING', weight: finding.weight ?? 0.7, location: finding.location ?? null }))
  const candidates = []

  for (const event of ambiguous) {
    for (let targetVoice = 1; targetVoice <= profile.maxVoices; targetVoice += 1) {
      if (targetVoice === event.voice) continue
      if (candidates.length >= policy.maxCandidates) return Object.freeze({ candidates: Object.freeze(candidates), exhausted: true, reason: 'candidate-limit-exceeded' })
      const scored = scoreVoiceAssignment(event, targetVoice, events, profile)
      const patch = createCorrectionPatch({ eventId: event.id, measureKey: event.measureKey, operation: PATCH_OPERATION.CHANGE_VOICE, before: event.voice, after: targetVoice, evidence: [...validatorEvidence, ...scored.evidence], confidence: scored.score, solverVersion: 'E5-shadow' })
      candidates.push(createCandidate({ id: `${event.id}:voice:${targetVoice}`, patches: [patch], evidence: [...validatorEvidence, ...scored.evidence], confidence: scored.score, hardViolations: scored.hardViolations, rationale: 'shadow-voice-assignment' }))
    }
  }

  return Object.freeze({ candidates: Object.freeze(candidates), exhausted: false, reason: null })
}
