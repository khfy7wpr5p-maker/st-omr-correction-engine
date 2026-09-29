import { createScoreEvent } from '../model/scoreEvent.js'
import {
  createTeacherStructuralPatch,
  createTeacherStructuralPatchSet,
  fingerprintScoreGraph,
  TEACHER_STRUCTURAL_OPERATION,
} from '../contracts/teacherStructuralPatch.js'
import { projectTeacherStructuralPatchSet } from './teacherStructuralProjection.js'

export function invertTeacherStructuralPatch(patch) {
  if (!patch || typeof patch !== 'object') throw new TypeError('patch is required.')

  if (patch.operation === TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT) {
    return createTeacherStructuralPatch({
      operation: TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT,
      measureKey: patch.measureKey,
      eventId: patch.eventId,
      eventIndex: patch.eventIndex,
      before: createScoreEvent(patch.after),
      after: null,
    })
  }

  if (patch.operation === TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT) {
    return createTeacherStructuralPatch({
      operation: TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT,
      measureKey: patch.measureKey,
      eventId: patch.eventId,
      eventIndex: patch.eventIndex,
      before: null,
      after: createScoreEvent(patch.before),
    })
  }

  return createTeacherStructuralPatch({
    operation: patch.operation,
    measureKey: patch.measureKey,
    eventId: patch.eventId,
    before: patch.after,
    after: patch.before,
  })
}

export function invertTeacherStructuralPatchSet(patchSet, { projectedGraph } = {}) {
  if (!patchSet || typeof patchSet !== 'object') throw new TypeError('patchSet is required.')
  if (!projectedGraph || typeof projectedGraph !== 'object') throw new TypeError('projectedGraph is required.')

  const inversePatches = [...patchSet.patches].reverse().map(invertTeacherStructuralPatch)
  return createTeacherStructuralPatchSet({
    patchSetId: `${patchSet.patchSetId}:revert`,
    baseSourceId: projectedGraph.sourceId,
    baseGraphFingerprint: fingerprintScoreGraph(projectedGraph),
    authorization: patchSet.authorization,
    patches: inversePatches,
  })
}

export function revertTeacherStructuralPatchSet(projectedGraph, patchSet) {
  const inverseSet = invertTeacherStructuralPatchSet(patchSet, { projectedGraph })
  return projectTeacherStructuralPatchSet(projectedGraph, inverseSet)
}
