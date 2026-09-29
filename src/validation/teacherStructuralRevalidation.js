import { createMeasure } from '../model/measure.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createScoreGraph } from '../model/scoreGraph.js'
import { fingerprintScoreGraph, TEACHER_STRUCTURAL_OPERATION } from '../contracts/teacherStructuralPatch.js'
import { detectPitchAnomalies } from '../constraints/pitchAnomalyDetector.js'
import { detectOnsetAnomalies } from '../constraints/onsetAnomalyDetector.js'
import { detectDurationAnomalies } from '../constraints/durationConstraint.js'
import { detectStaffAnomalies } from '../constraints/staffAnomalyDetector.js'
import { detectTieAnomalies } from '../constraints/tieConstraint.js'
import { detectTupletAnomalies } from '../constraints/tupletConstraint.js'
import { revertTeacherStructuralPatchSet } from '../correction/teacherStructuralReverter.js'

function stable(value) {
  return JSON.stringify(value)
}

function sameValue(a, b) {
  return stable(a) === stable(b)
}

function meterSnapshot(measure) {
  return {
    beats: measure.beats,
    beatType: measure.beatType,
    implicit: !!measure.implicit,
    pickup: !!measure.pickup,
  }
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

function tieTypes(event) {
  return Object.hasOwn(event.metadata ?? {}, 'tieTypes') ? event.metadata.tieTypes : null
}

function finding(code, detail = {}) {
  return Object.freeze({ code, ...detail })
}

function buildExpectedGraph(sourceGraph, patchSet, integrityFindings) {
  let measures = [...sourceGraph.measures]
  let events = [...sourceGraph.events]

  const currentGraph = () => createScoreGraph({ sourceId: sourceGraph.sourceId, measures, events })

  for (let order = 0; order < patchSet.patches.length; order += 1) {
    const patch = patchSet.patches[order]

    if (patch.operation === TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT) {
      if (events.some((event) => event.id === patch.eventId) || !measures.some((measure) => measure.key === patch.measureKey)) {
        integrityFindings.push(finding('STRUCTURAL_PATCH_INVALID', { order, operation: patch.operation }))
        return null
      }
      try {
        const inserted = createScoreEvent(patch.after)
        if (inserted.id !== patch.eventId || inserted.measureKey !== patch.measureKey) throw new TypeError('target mismatch')
        events = [...events, inserted]
      } catch {
        integrityFindings.push(finding('STRUCTURAL_PATCH_INVALID', { order, operation: patch.operation }))
        return null
      }
      continue
    }

    if (patch.operation === TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT) {
      const index = events.findIndex((event) => event.id === patch.eventId && event.measureKey === patch.measureKey)
      if (index < 0 || !sameValue(events[index], patch.before)) {
        integrityFindings.push(finding('STRUCTURAL_PATCH_BEFORE_MISMATCH', { order, operation: patch.operation, eventId: patch.eventId }))
        return null
      }
      events = events.filter((_, eventIndex) => eventIndex !== index)
      continue
    }

    if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER) {
      const index = measures.findIndex((measure) => measure.key === patch.measureKey)
      if (index < 0 || !sameValue(meterSnapshot(measures[index]), patch.before)) {
        integrityFindings.push(finding('STRUCTURAL_PATCH_BEFORE_MISMATCH', { order, operation: patch.operation, measureKey: patch.measureKey }))
        return null
      }
      try {
        const next = createMeasure({ key: patch.measureKey, ...patch.after })
        measures = measures.map((measure, measureIndex) => measureIndex === index ? next : measure)
      } catch {
        integrityFindings.push(finding('STRUCTURAL_PATCH_INVALID', { order, operation: patch.operation }))
        return null
      }
      continue
    }

    const index = events.findIndex((event) => event.id === patch.eventId && event.measureKey === patch.measureKey)
    if (index < 0) {
      integrityFindings.push(finding('STRUCTURAL_PATCH_TARGET_MISSING', { order, operation: patch.operation, eventId: patch.eventId }))
      return null
    }
    const event = events[index]
    let before
    let changes

    if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION) {
      before = event.duration
      changes = { duration: patch.after }
    } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE) {
      before = event.voice
      changes = { voice: patch.after }
    } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF) {
      before = event.staff
      changes = { staff: patch.after }
    } else if (patch.operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE) {
      before = tieTypes(event)
      const metadata = { ...(event.metadata ?? {}) }
      if (patch.after == null) delete metadata.tieTypes
      else metadata.tieTypes = [...patch.after]
      changes = { metadata: Object.freeze(metadata) }
    } else {
      integrityFindings.push(finding('STRUCTURAL_PATCH_INVALID', { order, operation: patch.operation }))
      return null
    }

    if (!sameValue(before, patch.before)) {
      integrityFindings.push(finding('STRUCTURAL_PATCH_BEFORE_MISMATCH', { order, operation: patch.operation, eventId: patch.eventId }))
      return null
    }

    try {
      const replacement = createScoreEvent(eventInput(event, changes))
      events = events.map((item, eventIndex) => eventIndex === index ? replacement : item)
    } catch {
      integrityFindings.push(finding('STRUCTURAL_PATCH_INVALID', { order, operation: patch.operation }))
      return null
    }

    currentGraph()
  }

  return createScoreGraph({ sourceId: sourceGraph.sourceId, measures, events })
}

function compareExpectedGraph(expectedGraph, projectedGraph, integrityFindings) {
  if (expectedGraph.sourceId !== projectedGraph.sourceId) {
    integrityFindings.push(finding('STRUCTURAL_SOURCE_ID_CHANGED'))
  }

  const expectedMeasureKeys = expectedGraph.measures.map((measure) => measure.key)
  const projectedMeasureKeys = projectedGraph.measures.map((measure) => measure.key)
  if (!sameValue(expectedMeasureKeys, projectedMeasureKeys)) {
    integrityFindings.push(finding('STRUCTURAL_MEASURE_STRUCTURE_CHANGED'))
  } else {
    for (let i = 0; i < expectedGraph.measures.length; i += 1) {
      if (!sameValue(expectedGraph.measures[i], projectedGraph.measures[i])) {
        integrityFindings.push(finding('STRUCTURAL_UNDECLARED_METER_CHANGE', { measureKey: expectedGraph.measures[i].key }))
      }
    }
  }

  const expectedIds = expectedGraph.events.map((event) => event.id)
  const projectedIds = projectedGraph.events.map((event) => event.id)
  const expectedSet = new Set(expectedIds)
  const projectedSet = new Set(projectedIds)

  for (const id of projectedIds) {
    if (!expectedSet.has(id)) integrityFindings.push(finding('STRUCTURAL_UNDECLARED_EVENT_INSERTION', { eventId: id }))
  }
  for (const id of expectedIds) {
    if (!projectedSet.has(id)) integrityFindings.push(finding('STRUCTURAL_UNDECLARED_EVENT_REMOVAL', { eventId: id }))
  }

  if (expectedIds.length === projectedIds.length && expectedIds.every((id) => projectedSet.has(id)) && !sameValue(expectedIds, projectedIds)) {
    integrityFindings.push(finding('STRUCTURAL_EVENT_ORDER_CHANGED'))
  }

  const projectedById = new Map(projectedGraph.events.map((event) => [event.id, event]))
  for (const expected of expectedGraph.events) {
    const actual = projectedById.get(expected.id)
    if (actual && !sameValue(expected, actual)) {
      integrityFindings.push(finding('STRUCTURAL_UNDECLARED_EVENT_CHANGE', { eventId: expected.id }))
    }
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

function findingKey(value) {
  return JSON.stringify(canonical(value))
}

function prefixed(prefix, result) {
  return (result.findings ?? []).map((item) => Object.freeze({ ...item, code: `${prefix}_${item.code}` }))
}

function voiceOverlapFindings(events, tolerance) {
  const groups = new Map()
  for (const event of events) {
    if (event.isChordTone || event.metadata?.grace === true) continue
    const key = `${event.measureKey}:${event.staff}:${event.voice}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(event)
  }

  const findings = []
  for (const [voiceKey, group] of groups) {
    const ordered = [...group].sort((a, b) => a.onset - b.onset || a.end - b.end || a.id.localeCompare(b.id))
    let previous = null
    for (const event of ordered) {
      if (previous && event.onset < previous.end - tolerance) {
        findings.push(finding('VOICE_OVERLAP', { voiceKey, previousEventId: previous.id, eventId: event.id }))
      }
      if (!previous || event.end > previous.end) previous = event
    }
  }
  return findings
}

function collectDetectorFindings(graph, tolerance) {
  const all = [
    ...prefixed('PITCH', detectPitchAnomalies(graph.events)),
    ...prefixed('ONSET', detectOnsetAnomalies(graph.measures, graph.events, { tolerance })),
    ...prefixed('DURATION', detectDurationAnomalies(graph.measures, graph.events, { tolerance })),
    ...prefixed('STAFF', detectStaffAnomalies(graph.events)),
    ...prefixed('TIE', detectTieAnomalies(graph.events, { tolerance })),
    ...prefixed('TUPLET', detectTupletAnomalies(graph.events)),
    ...voiceOverlapFindings(graph.events, tolerance),
  ]
  return Object.freeze([...all].sort((a, b) => findingKey(a).localeCompare(findingKey(b))))
}

function classifyFindings(sourceFindings, projectedFindings) {
  const sourceByKey = new Map(sourceFindings.map((item) => [findingKey(item), item]))
  const projectedByKey = new Map(projectedFindings.map((item) => [findingKey(item), item]))

  const residual = projectedFindings.filter((item) => sourceByKey.has(findingKey(item)))
  const resolved = sourceFindings.filter((item) => !projectedByKey.has(findingKey(item)))
  const added = projectedFindings.filter((item) => !sourceByKey.has(findingKey(item)))

  return {
    residual: Object.freeze(residual),
    resolved: Object.freeze(resolved),
    added: Object.freeze(added),
  }
}

export function revalidateTeacherStructuralRevision({ sourceGraph, projectedGraph, patchSet, tolerance = 0.01 } = {}) {
  if (!sourceGraph || typeof sourceGraph !== 'object') throw new TypeError('sourceGraph is required.')
  if (!projectedGraph || typeof projectedGraph !== 'object') throw new TypeError('projectedGraph is required.')
  if (!patchSet || typeof patchSet !== 'object') throw new TypeError('patchSet is required.')
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be finite and non-negative.')

  const sourceFingerprintBefore = fingerprintScoreGraph(sourceGraph)
  const integrityFindings = []

  if (sourceGraph.sourceId !== patchSet.baseSourceId || sourceFingerprintBefore !== patchSet.baseGraphFingerprint) {
    integrityFindings.push(finding('STRUCTURAL_BASE_REVISION_MISMATCH'))
  }

  const expectedGraph = buildExpectedGraph(sourceGraph, patchSet, integrityFindings)
  if (expectedGraph) compareExpectedGraph(expectedGraph, projectedGraph, integrityFindings)

  const sourceDetectorFindings = collectDetectorFindings(sourceGraph, tolerance)
  const projectedDetectorFindings = collectDetectorFindings(projectedGraph, tolerance)
  const classified = classifyFindings(sourceDetectorFindings, projectedDetectorFindings)

  let reversibilityVerified = false
  try {
    const reverted = revertTeacherStructuralPatchSet(projectedGraph, patchSet)
    if (!reverted.ok) {
      integrityFindings.push(finding('STRUCTURAL_REVERT_FAILED', { code: reverted.code }))
    } else if (!sameValue(reverted.graph, sourceGraph)) {
      integrityFindings.push(finding('STRUCTURAL_REVERSIBILITY_MISMATCH'))
    } else {
      reversibilityVerified = true
    }
  } catch {
    integrityFindings.push(finding('STRUCTURAL_REVERT_FAILED'))
  }

  const sourceMutationDetected = fingerprintScoreGraph(sourceGraph) !== sourceFingerprintBefore
  if (sourceMutationDetected) integrityFindings.push(finding('STRUCTURAL_SOURCE_MUTATION_DETECTED'))

  const findings = Object.freeze(integrityFindings)
  const integrityDecision = findings.length === 0 && classified.added.length === 0 && reversibilityVerified
    ? 'PASS'
    : 'FAIL'

  return Object.freeze({
    mode: 'TEACHER_STRUCTURAL_REVALIDATION_V1',
    integrityDecision,
    findings,
    resolvedFindings: classified.resolved,
    residualFindings: classified.residual,
    newFindings: classified.added,
    reversibilityVerified,
    sourceMutationDetected,
    musicalCorrectnessProven: false,
    finalTeacherApproval: false,
  })
}
