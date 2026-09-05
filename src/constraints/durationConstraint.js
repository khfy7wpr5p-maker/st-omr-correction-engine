import { evaluateMeterConstraint } from './meterConstraint.js'

function expectedDuration(event) {
  const value = event.metadata?.expectedDurationQuarterBeats ?? event.metadata?.expectedDuration
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function detectDurationAnomalies(measures, events, options = {}) {
  if (!Array.isArray(measures) || !Array.isArray(events)) throw new TypeError('measures and events must be arrays.')
  const tolerance = options.tolerance ?? 0.01
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be finite and non-negative.')
  const findings = []

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')
    const grace = event.metadata?.grace === true
    if (event.duration === 0 && !grace) findings.push(Object.freeze({ code: 'ZERO_DURATION_NON_GRACE', eventId: event.id }))

    const expected = expectedDuration(event)
    if (expected != null && Math.abs(event.duration - expected) > tolerance) {
      findings.push(Object.freeze({
        code: 'EXPLICIT_DURATION_MISMATCH',
        eventId: event.id,
        actual: event.duration,
        expected,
      }))
    }
  }

  for (const measure of measures) {
    const result = evaluateMeterConstraint(measure, events)
    for (const voice of result.voices) {
      if (voice.difference > tolerance) {
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
