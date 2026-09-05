function lookupExpectedPitch(event, expectedPitches) {
  if (expectedPitches instanceof Map && expectedPitches.has(event.id)) return expectedPitches.get(event.id)
  if (expectedPitches && typeof expectedPitches === 'object' && !Array.isArray(expectedPitches) && Object.hasOwn(expectedPitches, event.id)) return expectedPitches[event.id]
  return event.metadata?.expectedPitch ?? null
}

function validPitch(value) {
  return Number.isInteger(value) && value >= 0 && value <= 127
}

export function detectPitchAnomalies(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const expectedPitches = options.expectedPitches ?? null
  const findings = []

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')

    if (event.isRest) {
      if (event.pitch != null) findings.push(Object.freeze({ code: 'REST_HAS_PITCH', eventId: event.id, actual: event.pitch }))
      continue
    }

    if (event.pitch == null) {
      findings.push(Object.freeze({ code: 'NOTE_PITCH_MISSING', eventId: event.id }))
      continue
    }

    const expected = lookupExpectedPitch(event, expectedPitches)
    if (expected == null) continue
    if (!validPitch(expected)) {
      findings.push(Object.freeze({ code: 'EXPECTED_PITCH_INVALID', eventId: event.id, expected }))
      continue
    }

    if (event.pitch !== expected) {
      findings.push(Object.freeze({
        code: 'EXPLICIT_PITCH_MISMATCH',
        eventId: event.id,
        actual: event.pitch,
        expected,
      }))
    }
  }

  return Object.freeze({
    mode: 'RESEARCH_ONLY',
    errorClass: 'PITCH',
    findings: Object.freeze(findings),
    proposedPatches: Object.freeze([]),
  })
}
