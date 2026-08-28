function normalizeTuplet(event) {
  const value = event.metadata?.tuplet ?? event.metadata?.timeModification
  if (!value || typeof value !== 'object') return null
  return {
    actual: value.actual ?? value.actualNotes ?? null,
    normal: value.normal ?? value.normalNotes ?? null,
    groupId: value.groupId ?? null,
    start: value.start === true,
    stop: value.stop === true,
    depth: value.depth ?? 1,
  }
}

export function detectTupletAnomalies(events) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const findings = []
  const groups = new Map()

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')
    const tuplet = normalizeTuplet(event)
    if (!tuplet) continue

    if (!Number.isInteger(tuplet.actual) || tuplet.actual < 1 || !Number.isInteger(tuplet.normal) || tuplet.normal < 1) {
      findings.push(Object.freeze({ code: 'TUPLET_RATIO_INVALID', eventId: event.id }))
    }
    if (Number.isInteger(tuplet.depth) && tuplet.depth > 1) {
      findings.push(Object.freeze({ code: 'NESTED_TUPLET_UNSUPPORTED', eventId: event.id, depth: tuplet.depth }))
    }
    if (tuplet.groupId) {
      if (!groups.has(tuplet.groupId)) groups.set(tuplet.groupId, { starts: 0, stops: 0, eventIds: [] })
      const group = groups.get(tuplet.groupId)
      if (tuplet.start) group.starts += 1
      if (tuplet.stop) group.stops += 1
      group.eventIds.push(event.id)
    }
  }

  for (const [groupId, group] of groups) {
    if (group.starts !== 1 || group.stops !== 1) {
      findings.push(Object.freeze({ code: 'TUPLET_GROUP_UNBALANCED', groupId, starts: group.starts, stops: group.stops, eventIds: Object.freeze([...group.eventIds]) }))
    }
  }

  return Object.freeze({ mode: 'RESEARCH_ONLY', errorClass: 'TUPLET', findings: Object.freeze(findings), proposedPatches: Object.freeze([]) })
}
