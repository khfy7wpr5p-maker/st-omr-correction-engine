function lookupExpectedStaff(event, expectedStaffs) {
  if (expectedStaffs instanceof Map && expectedStaffs.has(event.id)) return expectedStaffs.get(event.id)
  if (expectedStaffs && typeof expectedStaffs === 'object' && !Array.isArray(expectedStaffs) && Object.hasOwn(expectedStaffs, event.id)) return expectedStaffs[event.id]
  return event.metadata?.expectedStaff ?? null
}

export function detectStaffAnomalies(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const expectedStaffs = options.expectedStaffs ?? null
  const findings = []

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')
    const expected = lookupExpectedStaff(event, expectedStaffs)
    if (expected == null) continue

    if (!Number.isInteger(expected) || expected < 1) {
      findings.push(Object.freeze({ code: 'EXPECTED_STAFF_INVALID', eventId: event.id, expected }))
      continue
    }

    if (event.staff !== expected) {
      findings.push(Object.freeze({
        code: 'EXPLICIT_STAFF_MISMATCH',
        eventId: event.id,
        actual: event.staff,
        expected,
      }))
    }
  }

  return Object.freeze({
    mode: 'RESEARCH_ONLY',
    errorClass: 'STAFF',
    findings: Object.freeze(findings),
    proposedPatches: Object.freeze([]),
  })
}
