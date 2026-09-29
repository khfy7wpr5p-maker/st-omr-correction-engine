import { createMeasure } from '../model/measure.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createTeacherStructuralPatch, TEACHER_STRUCTURAL_OPERATION } from '../contracts/teacherStructuralPatch.js'

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

function stable(value) {
  return JSON.stringify(canonical(value))
}

function sameValue(a, b) {
  return stable(a) === stable(b)
}

function result(ok, code, patch, normalizedPatch = null) {
  return Object.freeze({ ok, code, patch, normalizedPatch })
}

function meterSnapshot(measure) {
  return Object.freeze({
    beats: measure.beats,
    beatType: measure.beatType,
    implicit: !!measure.implicit,
    pickup: !!measure.pickup,
  })
}

function currentTieTypes(event) {
  return Object.hasOwn(event.metadata ?? {}, 'tieTypes') ? event.metadata.tieTypes : null
}

function validTieTypes(value) {
  return value == null || (
    Array.isArray(value)
    && value.every((item) => item === 'start' || item === 'stop')
    && new Set(value).size === value.length
  )
}

function cloneEventInput(event, changes = {}) {
  return {
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
    ...changes,
  }
}

function requiredInsertFields(after) {
  return ['id', 'measureKey', 'onset', 'duration', 'voice', 'staff', 'pitch', 'isRest']
    .every((field) => Object.hasOwn(after, field))
}

function findEvent(scoreGraph, patch) {
  return scoreGraph.events.find((event) => event.id === patch.eventId && event.measureKey === patch.measureKey) ?? null
}

function normalizedFieldPatch(patch, after) {
  return createTeacherStructuralPatch({
    operation: patch.operation,
    measureKey: patch.measureKey,
    eventId: patch.eventId,
    eventIndex: patch.eventIndex ?? null,
    before: patch.before,
    after,
  })
}

export function validateTeacherStructuralPatchAgainstGraph({ scoreGraph, patch } = {}) {
  if (!scoreGraph || !Array.isArray(scoreGraph.measures) || !Array.isArray(scoreGraph.events)) throw new TypeError('scoreGraph is required.')
  if (!patch || typeof patch !== 'object') throw new TypeError('patch is required.')

  const operation = patch.operation

  if (operation === TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT) {
    if (!Number.isInteger(patch.eventIndex) || patch.eventIndex < 0 || patch.eventIndex > scoreGraph.events.length) {
      return result(false, 'INVALID_INSERT_EVENT_INDEX', patch)
    }
    if (!scoreGraph.measures.some((measure) => measure.key === patch.measureKey)) {
      return result(false, 'INSERT_MEASURE_NOT_FOUND', patch)
    }
    if (scoreGraph.events.some((event) => event.id === patch.eventId)) {
      return result(false, 'INSERT_EVENT_ID_ALREADY_EXISTS', patch)
    }
    if (!patch.after || typeof patch.after !== 'object' || !requiredInsertFields(patch.after)) {
      return result(false, 'INVALID_INSERT_EVENT', patch)
    }
    if (patch.after.id !== patch.eventId || patch.after.measureKey !== patch.measureKey) {
      return result(false, 'INVALID_INSERT_EVENT', patch)
    }

    let event
    try {
      event = createScoreEvent(patch.after)
    } catch {
      return result(false, 'INVALID_INSERT_EVENT', patch)
    }
    return result(true, 'VALID_STRUCTURAL_PATCH', patch, createTeacherStructuralPatch({
      operation,
      measureKey: patch.measureKey,
      eventId: patch.eventId,
      eventIndex: patch.eventIndex,
      before: null,
      after: event,
    }))
  }

  if (operation === TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT) {
    if (!Number.isInteger(patch.eventIndex) || patch.eventIndex < 0 || patch.eventIndex >= scoreGraph.events.length) {
      return result(false, 'INVALID_REMOVE_EVENT_INDEX', patch)
    }
    const event = findEvent(scoreGraph, patch)
    if (!event) return result(false, 'STRUCTURAL_TARGET_NOT_FOUND', patch)
    if (scoreGraph.events[patch.eventIndex] !== event) return result(false, 'STALE_STRUCTURAL_EVENT_INDEX', patch)
    if (!sameValue(event, patch.before)) return result(false, 'STALE_STRUCTURAL_BEFORE_MISMATCH', patch)
    return result(true, 'VALID_STRUCTURAL_PATCH', patch, createTeacherStructuralPatch({
      operation,
      measureKey: patch.measureKey,
      eventId: patch.eventId,
      eventIndex: patch.eventIndex,
      before: event,
      after: null,
    }))
  }

  if (operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER) {
    const measure = scoreGraph.measures.find((item) => item.key === patch.measureKey)
    if (!measure) return result(false, 'STRUCTURAL_TARGET_NOT_FOUND', patch)
    const current = meterSnapshot(measure)
    if (!sameValue(current, patch.before)) return result(false, 'STALE_STRUCTURAL_BEFORE_MISMATCH', patch)

    let next
    try {
      const required = ['beats', 'beatType', 'implicit', 'pickup']
      if (!patch.after || !required.every((field) => Object.hasOwn(patch.after, field))) throw new TypeError('incomplete meter')
      const created = createMeasure({ key: measure.key, ...patch.after })
      next = meterSnapshot(created)
    } catch {
      return result(false, 'INVALID_STRUCTURAL_AFTER', patch)
    }

    return result(true, 'VALID_STRUCTURAL_PATCH', patch, createTeacherStructuralPatch({
      operation,
      measureKey: patch.measureKey,
      before: current,
      after: next,
    }))
  }

  const event = findEvent(scoreGraph, patch)
  if (!event) return result(false, 'STRUCTURAL_TARGET_NOT_FOUND', patch)

  if (operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION) {
    if (!sameValue(event.duration, patch.before)) return result(false, 'STALE_STRUCTURAL_BEFORE_MISMATCH', patch)
    try {
      createScoreEvent(cloneEventInput(event, { duration: patch.after }))
    } catch {
      return result(false, 'INVALID_STRUCTURAL_AFTER', patch)
    }
    return result(true, 'VALID_STRUCTURAL_PATCH', patch, normalizedFieldPatch(patch, patch.after))
  }

  if (operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE) {
    if (!sameValue(event.voice, patch.before)) return result(false, 'STALE_STRUCTURAL_BEFORE_MISMATCH', patch)
    try {
      createScoreEvent(cloneEventInput(event, { voice: patch.after }))
    } catch {
      return result(false, 'INVALID_STRUCTURAL_AFTER', patch)
    }
    return result(true, 'VALID_STRUCTURAL_PATCH', patch, normalizedFieldPatch(patch, patch.after))
  }

  if (operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF) {
    if (!sameValue(event.staff, patch.before)) return result(false, 'STALE_STRUCTURAL_BEFORE_MISMATCH', patch)
    try {
      createScoreEvent(cloneEventInput(event, { staff: patch.after }))
    } catch {
      return result(false, 'INVALID_STRUCTURAL_AFTER', patch)
    }
    return result(true, 'VALID_STRUCTURAL_PATCH', patch, normalizedFieldPatch(patch, patch.after))
  }

  if (operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE) {
    const current = currentTieTypes(event)
    if (!sameValue(current, patch.before)) return result(false, 'STALE_STRUCTURAL_BEFORE_MISMATCH', patch)
    if (!validTieTypes(patch.after)) return result(false, 'INVALID_STRUCTURAL_AFTER', patch)
    const metadata = { ...(event.metadata ?? {}) }
    if (patch.after == null) delete metadata.tieTypes
    else metadata.tieTypes = [...patch.after]
    try {
      createScoreEvent(cloneEventInput(event, { metadata }))
    } catch {
      return result(false, 'INVALID_STRUCTURAL_AFTER', patch)
    }
    return result(true, 'VALID_STRUCTURAL_PATCH', patch, normalizedFieldPatch(patch, patch.after == null ? null : [...patch.after]))
  }

  return result(false, 'UNSUPPORTED_TEACHER_STRUCTURAL_OPERATION', patch)
}
