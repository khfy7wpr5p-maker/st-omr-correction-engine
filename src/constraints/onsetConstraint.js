import { CONSTRAINT_STATUS } from './meterConstraint.js'

export function evaluateOnsetConstraint(measure, events, options = {}) {
  const tolerance = options.tolerance ?? 0.01
  if (!measure || !Number.isFinite(measure.expectedQuarterBeats)) throw new TypeError('valid measure is required.')
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const findings = []
  for (const event of events.filter((value) => value.measureKey === measure.key)) {
    if (event.onset < -tolerance) findings.push(Object.freeze({ code: 'NEGATIVE_ONSET', eventId: event.id }))
    if (event.duration < 0) findings.push(Object.freeze({ code: 'NEGATIVE_DURATION', eventId: event.id }))
    if (event.end > measure.expectedQuarterBeats + tolerance) findings.push(Object.freeze({ code: 'EVENT_EXCEEDS_MEASURE', eventId: event.id, actual: event.end, expected: measure.expectedQuarterBeats }))
  }
  return Object.freeze({ code: 'ONSET_BOUNDARY', status: findings.length ? CONSTRAINT_STATUS.FAIL : CONSTRAINT_STATUS.PASS, hardFailure: findings.length > 0, findings: Object.freeze(findings) })
}
