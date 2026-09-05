import { PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { revertCorrectionPatches } from '../correction/patchReverter.js'
import { detectPitchAnomalies } from '../constraints/pitchAnomalyDetector.js'
import { detectOnsetAnomalies } from '../constraints/onsetAnomalyDetector.js'
import { detectDurationAnomalies } from '../constraints/durationConstraint.js'
import { detectStaffAnomalies } from '../constraints/staffAnomalyDetector.js'
import { detectTieAnomalies } from '../constraints/tieConstraint.js'
import { detectTupletAnomalies } from '../constraints/tupletConstraint.js'

const FIELD_FOR_OPERATION = Object.freeze({
  [PATCH_OPERATION.CHANGE_PITCH]: 'pitch',
  [PATCH_OPERATION.CHANGE_ONSET]: 'onset',
  [PATCH_OPERATION.CHANGE_VOICE]: 'voice',
  [PATCH_OPERATION.CHANGE_DURATION]: 'duration',
  [PATCH_OPERATION.CHANGE_STAFF]: 'staff',
  [PATCH_OPERATION.CHANGE_TIE]: 'tieTypes',
})

function stable(value) {
  return JSON.stringify(value)
}

function rawTieTypes(event) {
  return Object.hasOwn(event.metadata ?? {}, 'tieTypes') ? event.metadata.tieTypes : null
}

function metadataWithoutTieTypes(event) {
  const metadata = { ...(event.metadata ?? {}) }
  delete metadata.tieTypes
  return metadata
}

function addFinding(findings, code, detail = {}) {
  findings.push(Object.freeze({ code, ...detail }))
}

function validateEventDiffs(sourceGraph, projectedGraph, patches, findings) {
  if (sourceGraph.sourceId !== projectedGraph.sourceId) addFinding(findings, 'SOURCE_ID_CHANGED')
  if (stable(sourceGraph.measures) !== stable(projectedGraph.measures)) addFinding(findings, 'MEASURES_CHANGED')
  if (sourceGraph.events.length !== projectedGraph.events.length) {
    addFinding(findings, 'EVENT_COUNT_CHANGED', { before: sourceGraph.events.length, after: projectedGraph.events.length })
    return
  }

  const allowed = new Map()
  for (const patch of patches) {
    const field = FIELD_FOR_OPERATION[patch?.operation]
    if (!field) {
      addFinding(findings, 'UNSUPPORTED_REVALIDATION_OPERATION', { operation: patch?.operation ?? null })
      continue
    }
    const key = `${patch.measureKey}:${patch.eventId}`
    if (!allowed.has(key)) allowed.set(key, new Map())
    allowed.get(key).set(field, patch.after)
  }

  const projectedByKey = new Map(projectedGraph.events.map((event) => [`${event.measureKey}:${event.id}`, event]))
  for (const sourceEvent of sourceGraph.events) {
    const key = `${sourceEvent.measureKey}:${sourceEvent.id}`
    const projectedEvent = projectedByKey.get(key)
    if (!projectedEvent) {
      addFinding(findings, 'EVENT_IDENTITY_CHANGED', { eventId: sourceEvent.id, measureKey: sourceEvent.measureKey })
      continue
    }

    const permitted = allowed.get(key) ?? new Map()
    const fields = ['measureKey', 'onset', 'duration', 'voice', 'staff', 'pitch', 'isRest', 'isChordTone']
    for (const field of fields) {
      if (permitted.has(field)) {
        if (stable(projectedEvent[field]) !== stable(permitted.get(field))) addFinding(findings, 'PATCH_AFTER_NOT_PROJECTED', { eventId: sourceEvent.id, field })
      } else if (stable(projectedEvent[field]) !== stable(sourceEvent[field])) {
        addFinding(findings, 'UNINTENDED_EVENT_CHANGE', { eventId: sourceEvent.id, field })
      }
    }

    if (permitted.has('tieTypes')) {
      if (stable(rawTieTypes(projectedEvent)) !== stable(permitted.get('tieTypes'))) addFinding(findings, 'PATCH_AFTER_NOT_PROJECTED', { eventId: sourceEvent.id, field: 'tieTypes' })
      if (stable(metadataWithoutTieTypes(projectedEvent)) !== stable(metadataWithoutTieTypes(sourceEvent))) addFinding(findings, 'UNINTENDED_EVENT_CHANGE', { eventId: sourceEvent.id, field: 'metadata' })
    } else if (stable(projectedEvent.metadata) !== stable(sourceEvent.metadata)) {
      addFinding(findings, 'UNINTENDED_EVENT_CHANGE', { eventId: sourceEvent.id, field: 'metadata' })
    }
  }
}

function detectVoiceOverlap(events, tolerance, findings) {
  const groups = new Map()
  for (const event of events) {
    if (event.isChordTone || event.metadata?.grace === true) continue
    const key = `${event.measureKey}:${event.staff}:${event.voice}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(event)
  }

  for (const [voiceKey, group] of groups) {
    const ordered = [...group].sort((a, b) => a.onset - b.onset || a.end - b.end || a.id.localeCompare(b.id))
    let previous = null
    for (const event of ordered) {
      if (previous && event.onset < previous.end - tolerance) addFinding(findings, 'INDEPENDENT_VOICE_OVERLAP', { voiceKey, previousEventId: previous.id, eventId: event.id })
      if (!previous || event.end > previous.end) previous = event
    }
  }
}

function appendDetectorFindings(findings, prefix, result) {
  for (const finding of result.findings ?? []) addFinding(findings, `${prefix}_${finding.code}`, { finding })
}

export function revalidateProjectedRevisionV2({ sourceGraph, projectedGraph, patches = [], tolerance = 0.01 }) {
  if (!sourceGraph || typeof sourceGraph !== 'object') throw new TypeError('sourceGraph is required.')
  if (!projectedGraph || typeof projectedGraph !== 'object') throw new TypeError('projectedGraph is required.')
  if (!Array.isArray(patches)) throw new TypeError('patches must be an array.')
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be finite and non-negative.')

  const findings = []
  validateEventDiffs(sourceGraph, projectedGraph, patches, findings)
  detectVoiceOverlap(projectedGraph.events, tolerance, findings)
  appendDetectorFindings(findings, 'PITCH', detectPitchAnomalies(projectedGraph.events))
  appendDetectorFindings(findings, 'ONSET', detectOnsetAnomalies(projectedGraph.measures, projectedGraph.events, { tolerance }))
  appendDetectorFindings(findings, 'DURATION', detectDurationAnomalies(projectedGraph.measures, projectedGraph.events, { tolerance }))
  appendDetectorFindings(findings, 'STAFF', detectStaffAnomalies(projectedGraph.events))
  appendDetectorFindings(findings, 'TIE', detectTieAnomalies(projectedGraph.events, { tolerance }))
  appendDetectorFindings(findings, 'TUPLET', detectTupletAnomalies(projectedGraph.events))

  const reverted = revertCorrectionPatches(projectedGraph, patches)
  if (!reverted.ok) addFinding(findings, 'REVERT_FAILED', { code: reverted.code })
  else if (stable(reverted.graph) !== stable(sourceGraph)) addFinding(findings, 'REVERSIBILITY_MISMATCH')

  return Object.freeze({ mode: 'INDEPENDENT_REVALIDATION_V2', decision: findings.length === 0 ? 'PASS' : 'FAIL', findings: Object.freeze(findings), solverReused: false })
}
