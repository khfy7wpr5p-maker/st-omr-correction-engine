import { createCorrectionPatch } from '../contracts/correctionPatch.js'
import { projectCorrectionPatches } from './patchProjection.js'

export function revertCorrectionPatches(scoreGraph, patches) {
  if (!Array.isArray(patches)) throw new TypeError('patches must be an array.')
  const reversed = [...patches].reverse().map((patch) => createCorrectionPatch({
    eventId: patch.eventId,
    measureKey: patch.measureKey,
    operation: patch.operation,
    before: patch.after,
    after: patch.before,
    evidence: patch.evidence,
    confidence: patch.confidence,
    solverVersion: `${patch.solverVersion}:revert`,
  }))
  return projectCorrectionPatches(scoreGraph, reversed)
}
