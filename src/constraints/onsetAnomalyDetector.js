import { evaluateOnsetConstraint } from './onsetConstraint.js'

function finiteTolerance(value) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('tolerance must be finite and non-negative.')
  return value
}

export function detectOnsetAnomalies(measures, events, options = {}) {
  if (!Array.isArray(measures) || !Array.isArray(events)) throw new TypeError('measures and events must be arrays.')
  const tolerance = finiteTolerance(options.tolerance ?? 0.01)
  const findings = []
  const byId = new Map(events.map((event) => [event?.id, event]))

  for (const measure of measures) {
    const boundary = evaluateOnsetConstraint(measure, events, { tolerance })
    findings.push(...boundary.findings)
  }

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')

    const expected = event.metadata?.expectedOnsetQuarterBeats
    if (Number.isFinite(expected) && Math.abs(event.onset - expected) > tolerance) {
      findings.push(Object.freeze({
        code: 'EXPLICIT_ONSET_MISMATCH',
        eventId: event.id,
        actual: event.onset,
        expected,
      }))
    }

    if (event.isChordTone && typeof event.metadata?.chordAnchorId === 'string') {
      const anchor = byId.get(event.metadata.chordAnchorId)
      if (!anchor) {
        findings.push(Object.freeze({ code: 'CHORD_ANCHOR_MISSING', eventId: event.id, anchorId: event.metadata.chordAnchorId }))
      } else if (Math.abs(event.onset - anchor.onset) > tolerance) {
        findings.push(Object.freeze({
          code: 'CHORD_TONE_ONSET_MISMATCH',
          eventId: event.id,
          anchorId: anchor.id,
          actual: event.onset,
          expected: anchor.onset,
        }))
      }
    }
  }

  return Object.freeze({
    mode: 'RESEARCH_ONLY',
    errorClass: 'ONSET',
    serializationOrderIsAuthority: false,
    findings: Object.freeze(findings),
    proposedPatches: Object.freeze([]),
  })
}
