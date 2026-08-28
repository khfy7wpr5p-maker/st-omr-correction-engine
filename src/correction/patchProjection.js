import { PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createScoreGraph } from '../model/scoreGraph.js'

function fieldForOperation(operation) {
  if (operation === PATCH_OPERATION.CHANGE_VOICE) return 'voice'
  if (operation === PATCH_OPERATION.CHANGE_DURATION) return 'duration'
  if (operation === PATCH_OPERATION.CHANGE_STAFF) return 'staff'
  return null
}

function sameValue(a, b) {
  return Object.is(a, b)
}

function cloneEventWith(event, field, value) {
  const next = {
    id: event.id,
    measureKey: event.measureKey,
    onset: event.onset,
    duration: event.duration,
    voice: event.voice,
    staff: event.staff,
    pitch: event.pitch,
    isRest: event.isRest,
    isChordTone: event.isChordTone,
    metadata: event.metadata,
    [field]: value,
  }
  return createScoreEvent(next)
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
    if (!sameValue(current[field], patch.before)) {
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
