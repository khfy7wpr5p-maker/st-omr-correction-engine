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

function sourceOrder(event) {
  return Number.isFinite(event.metadata?.sourceOrder) ? event.metadata.sourceOrder : Number.MAX_SAFE_INTEGER
}

function orderedLaneCandidates(notes, event) {
  return notes
    .filter((candidate) => candidate.id !== event.id && sameTieLane(event, candidate))
    .sort((a, b) => a.onset - b.onset || sourceOrder(a) - sourceOrder(b) || a.id.localeCompare(b.id))
}

export function detectTieAnomalies(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const tolerance = options.tolerance ?? 0.01
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be finite and non-negative.')

  const notes = events.filter((event) => event && !event.isRest && event.pitch != null)
  const findings = []

  for (const event of notes) {
    const flags = tieFlags(event)
    if (!flags.start && !flags.stop) continue

    const lane = orderedLaneCandidates(notes, event)

    if (flags.start) {
      const target = lane.find((candidate) => candidate.onset > event.onset + tolerance)
      if (!target) {
        findings.push(Object.freeze({ code: 'TIE_TARGET_MISSING', eventId: event.id }))
      } else if (!tieFlags(target).stop) {
        findings.push(Object.freeze({ code: 'TIE_STOP_MISSING', eventId: event.id, targetEventId: target.id }))
      }
    }

    if (flags.stop) {
      const source = [...lane].reverse().find((candidate) => candidate.onset < event.onset - tolerance)
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
