export function createScoreGraph({ measures = [], events = [], sourceId = null }) {
  if (!Array.isArray(measures) || !Array.isArray(events)) throw new TypeError('measures and events must be arrays.')
  const measureKeys = new Set()
  for (const measure of measures) {
    if (!measure?.key || measureKeys.has(measure.key)) throw new TypeError('measure keys must be present and unique.')
    measureKeys.add(measure.key)
  }
  const eventIds = new Set()
  for (const event of events) {
    if (!event?.id || eventIds.has(event.id)) throw new TypeError('event ids must be present and unique.')
    if (!measureKeys.has(event.measureKey)) throw new TypeError(`event ${event.id} references unknown measure.`)
    eventIds.add(event.id)
  }
  return Object.freeze({ sourceId, measures: Object.freeze([...measures]), events: Object.freeze([...events]) })
}
