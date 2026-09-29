import { createMeasure } from '../model/measure.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createScoreGraph } from '../model/scoreGraph.js'
import { fingerprintScoreGraph, TEACHER_STRUCTURAL_OPERATION, TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION } from '../contracts/teacherStructuralPatch.js'
import { validateTeacherStructuralPatchAgainstGraph } from './teacherStructuralPatchValidation.js'

function fail(code, sourceGraph) {
  return Object.freeze({
    ok: false,
    code,
    sourceGraph,
    graph: sourceGraph,
    audit: Object.freeze([]),
  })
}

function eventInput(event, changes = {}) {
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

function replaceEvent(events, patch, transform) {
  const index = events.findIndex((event) => event.id === patch.eventId && event.measureKey === patch.measureKey)
  if (index < 0) return null
  const next = [...events]
  next[index] = transform(events[index])
  return next
}

function applyNormalizedPatch({ graph, patch }) {
  let measures = [...graph.measures]
  let events = [...graph.events]

  if (patch.operation === TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT) {
    if (!Number.isInteger(patch.eventIndex) || patch.eventIndex < 0 || patch.eventIndex > events.length) return null
    events.splice(patch.eventIndex, 0, createScoreEvent(patch.after))
  } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT) {
    if (!Number.isInteger(patch.eventIndex) || patch.eventIndex < 0 || patch.eventIndex >= events.length) return null
    const target = events[patch.eventIndex]
    if (!target || target.id !== patch.eventId || target.measureKey !== patch.measureKey) return null
    events.splice(patch.eventIndex, 1)
  } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION) {
    const next = replaceEvent(events, patch, (event) => createScoreEvent(eventInput(event, { duration: patch.after })))
    if (!next) return null
    events = next
  } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE) {
    const next = replaceEvent(events, patch, (event) => createScoreEvent(eventInput(event, { voice: patch.after })))
    if (!next) return null
    events = next
  } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF) {
    const next = replaceEvent(events, patch, (event) => createScoreEvent(eventInput(event, { staff: patch.after })))
    if (!next) return null
    events = next
  } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE) {
    const next = replaceEvent(events, patch, (event) => {
      const metadata = { ...(event.metadata ?? {}) }
      if (patch.after == null) delete metadata.tieTypes
      else metadata.tieTypes = [...patch.after]
      return createScoreEvent(eventInput(event, { metadata: Object.freeze(metadata) }))
    })
    if (!next) return null
    events = next
  } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER) {
    const index = measures.findIndex((measure) => measure.key === patch.measureKey)
    if (index < 0) return null
    measures[index] = createMeasure({ key: patch.measureKey, ...patch.after })
  } else {
    return null
  }

  return createScoreGraph({ sourceId: graph.sourceId, measures, events })
}

export function projectTeacherStructuralPatchSet(scoreGraph, patchSet) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')
  if (!patchSet || typeof patchSet !== 'object') throw new TypeError('patchSet is required.')

  if (patchSet.schemaVersion !== TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION) return fail('STRUCTURAL_PATCH_SET_SCHEMA_UNSUPPORTED', scoreGraph)
  if (typeof patchSet.patchSetId !== 'string' || !patchSet.patchSetId.trim()) return fail('STRUCTURAL_PATCH_SET_INVALID', scoreGraph)
  if (
    patchSet.automaticApplyAuthority !== false
    || patchSet.finalTeacherApproval !== false
    || patchSet.studentShareEligible !== false
  ) return fail('STRUCTURAL_PATCH_SET_INVALID', scoreGraph)
  if (scoreGraph.sourceId !== patchSet.baseSourceId) return fail('STRUCTURAL_SOURCE_ID_MISMATCH', scoreGraph)
  if (fingerprintScoreGraph(scoreGraph) !== patchSet.baseGraphFingerprint) return fail('STRUCTURAL_BASE_FINGERPRINT_MISMATCH', scoreGraph)
  if (
    !patchSet.authorization
    || patchSet.authorization.mode !== 'EXPLICIT_TEACHER_EDIT'
    || typeof patchSet.authorization.actionId !== 'string'
    || !patchSet.authorization.actionId.trim()
  ) return fail('STRUCTURAL_TEACHER_AUTHORIZATION_REQUIRED', scoreGraph)
  if (!Array.isArray(patchSet.patches) || patchSet.patches.length === 0) return fail('STRUCTURAL_PATCH_SET_INVALID', scoreGraph)

  let workingGraph = scoreGraph
  const audit = []

  for (let order = 0; order < patchSet.patches.length; order += 1) {
    const requestedPatch = patchSet.patches[order]
    const validation = validateTeacherStructuralPatchAgainstGraph({ scoreGraph: workingGraph, patch: requestedPatch })
    if (!validation.ok) return fail(validation.code, scoreGraph)

    let projected
    try {
      projected = applyNormalizedPatch({ graph: workingGraph, patch: validation.normalizedPatch })
    } catch {
      return fail('STRUCTURAL_PROJECTION_INVALID', scoreGraph)
    }
    if (!projected) return fail('STRUCTURAL_PROJECTION_INVALID', scoreGraph)

    const normalized = validation.normalizedPatch
    audit.push(Object.freeze({
      patchSetId: patchSet.patchSetId,
      actionId: patchSet.authorization.actionId,
      order,
      operation: normalized.operation,
      measureKey: normalized.measureKey,
      eventId: normalized.eventId,
      eventIndex: normalized.eventIndex,
      before: normalized.before,
      after: normalized.after,
    }))
    workingGraph = projected
  }

  return Object.freeze({
    ok: true,
    code: 'TEACHER_STRUCTURAL_PROJECTED',
    sourceGraph: scoreGraph,
    graph: workingGraph,
    audit: Object.freeze(audit),
  })
}
