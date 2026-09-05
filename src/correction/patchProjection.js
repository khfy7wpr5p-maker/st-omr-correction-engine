import { PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createScoreGraph } from '../model/scoreGraph.js'

function fieldForOperation(operation) {
  if (operation === PATCH_OPERATION.CHANGE_PITCH) return 'pitch'
  if (operation === PATCH_OPERATION.CHANGE_ONSET) return 'onset'
  if (operation === PATCH_OPERATION.CHANGE_VOICE) return 'voice'
  if (operation === PATCH_OPERATION.CHANGE_DURATION) return 'duration'
  if (operation === PATCH_OPERATION.CHANGE_STAFF) return 'staff'
  if (operation === PATCH_OPERATION.CHANGE_TIE) return 'tieTypes'
  return null
}

function stable(value) {
  return JSON.stringify(value)
}

function sameValue(a, b) {
  return stable(a) === stable(b)
}

function rawTieTypes(event) {
  return Object.hasOwn(event.metadata ?? {}, 'tieTypes') ? event.metadata.tieTypes : null
}

function validTieTypes(value) {
  return value == null || (Array.isArray(value) && value.every((type) => type === 'start' || type === 'stop') && new Set(value).size === value.length)
}

function cloneEventWith(event, field, value) {
  if (field === 'pitch' && event.isRest && value != null) throw new TypeError('rest events cannot receive a pitch correction.')

  let metadata = event.metadata
  if (field === 'tieTypes') {
    if (!validTieTypes(value)) throw new TypeError('tieTypes must be null or a unique start/stop array.')
    const nextMetadata = { ...(event.metadata ?? {}) }
    if (value == null) delete nextMetadata.tieTypes
    else nextMetadata.tieTypes = Object.freeze([...value])
    metadata = Object.freeze(nextMetadata)
  }

  const next = {
    id: event.id,
    measureKey: event.measureKey,
    onset: field === 'onset' ? value : event.onset,
    duration: field === 'duration' ? value : event.duration,
    voice: field === 'voice' ? value : event.voice,
    staff: field === 'staff' ? value : event.staff,
    pitch: field === 'pitch' ? value : event.pitch,
    isRest: event.isRest,
    isChordTone: event.isChordTone,
    metadata,
  }
  return createScoreEvent(next)
}

function currentValue(event, field) {
  return field === 'tieTypes' ? rawTieTypes(event) : event[field]
}

export function projectCorrectionPatches(scoreGraph, patches) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')
  if (!Array.isArray(patches)) throw new TypeError('patches must be an array.')

  let events = [...scoreGraph.events]
  const audit = []

  for (const patch of patches) {
    const field = fieldForOperation(patch?.operation)
    if (!field) {
      return Object.freeze({ ok: false, code: 'UNSUPPORTED_PATCH_OPERATION', patch, graph: scoreGraph, audit: Object.freeze(audit) })
    }

    const index = events.findIndex((event) => event.id === patch.eventId && event.measureKey === patch.measureKey)
    if (index < 0) {
      return Object.freeze({ ok: false, code: 'PATCH_TARGET_NOT_FOUND', patch, graph: scoreGraph, audit: Object.freeze(audit) })
    }

    const current = events[index]
    if (!sameValue(currentValue(current, field), patch.before)) {
      return Object.freeze({ ok: false, code: 'STALE_PATCH_BEFORE_MISMATCH', patch, graph: scoreGraph, audit: Object.freeze(audit) })
    }

    let replacement
    try {
      replacement = cloneEventWith(current, field, patch.after)
    } catch {
      return Object.freeze({ ok: false, code: 'PATCH_VALUE_INVALID', patch, graph: scoreGraph, audit: Object.freeze(audit) })
    }

    events[index] = replacement
    audit.push(Object.freeze({ eventId: patch.eventId, measureKey: patch.measureKey, operation: patch.operation, before: patch.before, after: patch.after, solverVersion: patch.solverVersion, confidence: patch.confidence }))
  }

  const projected = createScoreGraph({ measures: scoreGraph.measures, events, sourceId: scoreGraph.sourceId })
  return Object.freeze({ ok: true, code: 'PROJECTED', graph: projected, audit: Object.freeze(audit) })
}
