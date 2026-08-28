import { evaluateMeterConstraint } from './meterConstraint.js'

export function detectDurationAnomalies(measures, events) {
  if (!Array.isArray(measures) || !Array.isArray(events)) throw new TypeError('measures and events must be arrays.')
  const findings = []

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')
    const grace = event.metadata?.grace === true
    if (event.duration === 0 && !grace) findings.push(Object.freeze({ code: 'ZERO_DURATION_NON_GRACE', eventId: event.id }))
  }

  for (const measure of measures) {
    const result = evaluateMeterConstraint(measure, events)
    for (const voice of result.voices) {
      if (voice.difference > 0.01) {
        findings.push(Object.freeze({
          code: 'VOICE_DURATION_EXCEEDS_MEASURE',
          measureKey: measure.key,
          voiceKey: voice.voiceKey,
          actualQuarterBeats: voice.actualQuarterBeats,
          expectedQuarterBeats: voice.expectedQuarterBeats,
        }))
      }
    }
  }

  return Object.freeze({ mode: 'RESEARCH_ONLY', errorClass: 'DURATION', findings: Object.freeze(findings), proposedPatches: Object.freeze([]) })
}
