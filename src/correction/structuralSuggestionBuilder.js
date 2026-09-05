import { createCorrectionPatch, PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { createEvidence, EVIDENCE_SOURCE } from '../contracts/evidence.js'

function boundedConfidence(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('confidence must be between 0 and 1.')
  return value
}

function stable(value) {
  return JSON.stringify(value)
}

function canonicalTieTypes(event) {
  const values = new Set()
  for (const type of event.metadata?.tieTypes ?? []) if (type === 'start' || type === 'stop') values.add(type)
  for (const type of event.metadata?.ties ?? []) if (type === 'start' || type === 'stop') values.add(type)
  if (event.metadata?.tieStart === true) values.add('start')
  if (event.metadata?.tieStop === true) values.add('stop')
  return ['start', 'stop'].filter((type) => values.has(type))
}

function rawTieTypes(event) {
  return Object.hasOwn(event.metadata ?? {}, 'tieTypes') ? [...event.metadata.tieTypes] : null
}

function tieTypesWith(event, type) {
  const next = new Set(canonicalTieTypes(event))
  next.add(type)
  return Object.freeze(['start', 'stop'].filter((candidate) => next.has(candidate)))
}

function evidenceFor(errorClass, finding, eventId) {
  return createEvidence({
    source: EVIDENCE_SOURCE.SYMBOLIC,
    code: `DETERMINISTIC_${finding.code}`,
    weight: 1,
    location: Object.freeze({ eventId }),
    details: Object.freeze({ errorClass, finding }),
  })
}

function buildSuggestion({ event, errorClass, operation, before, after, finding, confidence }) {
  if (stable(before) === stable(after)) return null
  const evidence = Object.freeze([evidenceFor(errorClass, finding, event.id)])
  const patch = createCorrectionPatch({
    eventId: event.id,
    measureKey: event.measureKey,
    operation,
    before,
    after,
    evidence,
    confidence,
    solverVersion: 'CE-E2E-01-shadow-proposal',
  })
  return Object.freeze({
    id: `${event.id}:${errorClass}:${operation}:${finding.code}`,
    mode: 'SHADOW_ONLY',
    applyEnabled: false,
    automationEligible: false,
    eventId: event.id,
    measureKey: event.measureKey,
    errorClass,
    operation,
    before,
    after,
    confidence,
    evidence,
    rationale: finding.code,
    proposedPatches: Object.freeze([patch]),
  })
}

function pushIfPresent(list, suggestion) {
  if (suggestion) list.push(suggestion)
}

export function buildStructuralCorrectionSuggestions({ scoreGraph, analyses = {}, confidence = 0 } = {}) {
  if (!scoreGraph || !Array.isArray(scoreGraph.events)) throw new TypeError('scoreGraph with events is required.')
  boundedConfidence(confidence)
  if (!analyses || typeof analyses !== 'object' || Array.isArray(analyses)) throw new TypeError('analyses must be an object.')

  const byId = new Map(scoreGraph.events.map((event) => [event.id, event]))
  const suggestions = []
  const abstentions = []

  for (const finding of analyses.pitch?.findings ?? []) {
    if (finding.code !== 'EXPLICIT_PITCH_MISMATCH') continue
    const event = byId.get(finding.eventId)
    if (!event) continue
    pushIfPresent(suggestions, buildSuggestion({ event, errorClass: 'PITCH', operation: PATCH_OPERATION.CHANGE_PITCH, before: event.pitch, after: finding.expected, finding, confidence }))
  }

  for (const finding of analyses.duration?.findings ?? []) {
    if (finding.code !== 'EXPLICIT_DURATION_MISMATCH') continue
    const event = byId.get(finding.eventId)
    if (!event) continue
    pushIfPresent(suggestions, buildSuggestion({ event, errorClass: 'DURATION', operation: PATCH_OPERATION.CHANGE_DURATION, before: event.duration, after: finding.expected, finding, confidence }))
  }

  for (const finding of analyses.onset?.findings ?? []) {
    if (finding.code !== 'EXPLICIT_ONSET_MISMATCH' && finding.code !== 'CHORD_TONE_ONSET_MISMATCH') continue
    const event = byId.get(finding.eventId)
    if (!event) continue
    pushIfPresent(suggestions, buildSuggestion({ event, errorClass: 'ONSET', operation: PATCH_OPERATION.CHANGE_ONSET, before: event.onset, after: finding.expected, finding, confidence }))
  }

  for (const finding of analyses.staff?.findings ?? []) {
    if (finding.code !== 'EXPLICIT_STAFF_MISMATCH') continue
    const event = byId.get(finding.eventId)
    if (!event) continue
    pushIfPresent(suggestions, buildSuggestion({ event, errorClass: 'STAFF', operation: PATCH_OPERATION.CHANGE_STAFF, before: event.staff, after: finding.expected, finding, confidence }))
  }

  for (const finding of analyses.tie?.findings ?? []) {
    let target = null
    let type = null
    if (finding.code === 'TIE_STOP_MISSING' && finding.targetEventId) {
      target = byId.get(finding.targetEventId)
      type = 'stop'
    } else if (finding.code === 'TIE_START_MISSING' && finding.sourceEventId) {
      target = byId.get(finding.sourceEventId)
      type = 'start'
    }

    if (!target || !type) {
      abstentions.push(Object.freeze({ errorClass: 'TIE', finding, reason: 'tie-counterpart-not-uniquely-correctable' }))
      continue
    }

    pushIfPresent(suggestions, buildSuggestion({
      event: target,
      errorClass: 'TIE',
      operation: PATCH_OPERATION.CHANGE_TIE,
      before: rawTieTypes(target),
      after: tieTypesWith(target, type),
      finding,
      confidence,
    }))
  }

  const unique = []
  const seen = new Set()
  for (const suggestion of suggestions) {
    const key = `${suggestion.eventId}:${suggestion.operation}:${stable(suggestion.after)}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(suggestion)
  }

  return Object.freeze({
    mode: 'SHADOW_ONLY',
    applyEnabled: false,
    suggestions: Object.freeze(unique),
    abstentions: Object.freeze(abstentions),
  })
}
