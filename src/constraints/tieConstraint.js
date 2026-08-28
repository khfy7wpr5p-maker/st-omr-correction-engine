function tieFlags(event) {
  const ties = Array.isArray(event.metadata?.ties) ? event.metadata.ties : []
  return {
    start: event.metadata?.tieStart === true || ties.includes('start'),
    stop: event.metadata?.tieStop === true || ties.includes('stop'),
  }
}

function sameTieLane(a, b) {
  return a.pitch === b.pitch && a.voice === b.voice && a.staff === b.staff
}

export function detectTieAnomalies(events) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const notes = events.filter((event) => event && !event.isRest && event.pitch != null)
  const findings = []

  for (let index = 0; index < notes.length; index += 1) {
    const event = notes[index]
    const flags = tieFlags(event)
    if (!flags.start && !flags.stop) continue

    if (flags.start) {
      const target = notes.slice(index + 1).find((candidate) => sameTieLane(event, candidate))
      if (!target) findings.push(Object.freeze({ code: 'TIE_TARGET_MISSING', eventId: event.id }))
      else if (!tieFlags(target).stop) findings.push(Object.freeze({ code: 'TIE_STOP_MISSING', eventId: event.id, targetEventId: target.id }))
    }

    if (flags.stop) {
      const source = notes.slice(0, index).reverse().find((candidate) => sameTieLane(event, candidate))
      if (!source || !tieFlags(source).start) findings.push(Object.freeze({ code: 'TIE_START_MISSING', eventId: event.id }))
    }
  }

  return Object.freeze({
    mode: 'RESEARCH_ONLY',
    errorClass: 'TIE',
    findings: Object.freeze(findings),
    proposedPatches: Object.freeze([]),
  })
}
