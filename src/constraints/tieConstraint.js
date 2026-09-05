function tieFlags(event) {
  const legacyTies = Array.isArray(event.metadata?.ties) ? event.metadata.ties : []
  const importedTieTypes = Array.isArray(event.metadata?.tieTypes) ? event.metadata.tieTypes : []
  const ties = new Set([...legacyTies, ...importedTieTypes])
  return {
    start: event.metadata?.tieStart === true || ties.has('start'),
    stop: event.metadata?.tieStop === true || ties.has('stop'),
  }
}

function sameTieLane(a, b) {
  return a.pitch === b.pitch && a.voice === b.voice && a.staff === b.staff
}

function orderedLaneCandidates(notes, event, sourceIndex) {
  const eventIndex = sourceIndex.get(event.id)
  const eventSourceOrder = Number.isFinite(event.metadata?.sourceOrder) ? event.metadata.sourceOrder : null

  return notes
    .filter((candidate) => candidate.id !== event.id && sameTieLane(event, candidate))
    .map((candidate) => ({
      candidate,
      sourceOrder: Number.isFinite(candidate.metadata?.sourceOrder) ? candidate.metadata.sourceOrder : null,
      arrayIndex: sourceIndex.get(candidate.id),
    }))
    .sort((a, b) => {
      if (eventSourceOrder != null && a.sourceOrder != null && b.sourceOrder != null) return a.sourceOrder - b.sourceOrder
      return a.arrayIndex - b.arrayIndex
    })
    .map(({ candidate }) => candidate)
    .filter((candidate) => {
      const candidateOrder = Number.isFinite(candidate.metadata?.sourceOrder) ? candidate.metadata.sourceOrder : null
      if (eventSourceOrder != null && candidateOrder != null) return candidateOrder !== eventSourceOrder
      return sourceIndex.get(candidate.id) !== eventIndex
    })
}

function isAfter(event, candidate, sourceIndex) {
  const eventOrder = Number.isFinite(event.metadata?.sourceOrder) ? event.metadata.sourceOrder : null
  const candidateOrder = Number.isFinite(candidate.metadata?.sourceOrder) ? candidate.metadata.sourceOrder : null
  if (eventOrder != null && candidateOrder != null) return candidateOrder > eventOrder
  return sourceIndex.get(candidate.id) > sourceIndex.get(event.id)
}

function isBefore(event, candidate, sourceIndex) {
  const eventOrder = Number.isFinite(event.metadata?.sourceOrder) ? event.metadata.sourceOrder : null
  const candidateOrder = Number.isFinite(candidate.metadata?.sourceOrder) ? candidate.metadata.sourceOrder : null
  if (eventOrder != null && candidateOrder != null) return candidateOrder < eventOrder
  return sourceIndex.get(candidate.id) < sourceIndex.get(event.id)
}

export function detectTieAnomalies(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const tolerance = options.tolerance ?? 0.01
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be finite and non-negative.')

  const notes = events.filter((event) => event && !event.isRest && event.pitch != null)
  const sourceIndex = new Map(events.map((event, index) => [event.id, index]))
  const findings = []

  for (const event of notes) {
    const flags = tieFlags(event)
    if (!flags.start && !flags.stop) continue

    const lane = orderedLaneCandidates(notes, event, sourceIndex)

    if (flags.start) {
      const target = lane.find((candidate) => isAfter(event, candidate, sourceIndex))
      if (!target) {
        findings.push(Object.freeze({ code: 'TIE_TARGET_MISSING', eventId: event.id }))
      } else if (!tieFlags(target).stop) {
        findings.push(Object.freeze({ code: 'TIE_STOP_MISSING', eventId: event.id, targetEventId: target.id }))
      }
    }

    if (flags.stop) {
      const before = lane.filter((candidate) => isBefore(event, candidate, sourceIndex))
      const source = before.at(-1)
      if (!source) {
        findings.push(Object.freeze({ code: 'TIE_START_MISSING', eventId: event.id }))
      } else if (!tieFlags(source).start) {
        findings.push(Object.freeze({ code: 'TIE_START_MISSING', eventId: event.id, sourceEventId: source.id }))
      }
    }
  }

  return Object.freeze({
    mode: 'RESEARCH_ONLY',
    errorClass: 'TIE',
    findings: Object.freeze(findings),
    proposedPatches: Object.freeze([]),
  })
}
