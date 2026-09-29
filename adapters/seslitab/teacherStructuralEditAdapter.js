import { projectTeacherStructuralPatchSet } from '../../src/correction/teacherStructuralProjection.js'
import { revalidateTeacherStructuralRevision } from '../../src/validation/teacherStructuralRevalidation.js'

export function processSesliTabTeacherStructuralEdit({ scoreGraph, patchSet } = {}) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')
  if (!patchSet || typeof patchSet !== 'object') throw new TypeError('patchSet is required.')

  const projection = projectTeacherStructuralPatchSet(scoreGraph, patchSet)
  const revalidation = projection.ok
    ? revalidateTeacherStructuralRevision({
        sourceGraph: scoreGraph,
        projectedGraph: projection.graph,
        patchSet,
      })
    : null

  const teacherCorrectedRevisionEligible = projection.ok
    && revalidation?.integrityDecision === 'PASS'

  return Object.freeze({
    mode: 'TEACHER_AUTHORIZED_STRUCTURAL_EDIT',
    sourceGraph: scoreGraph,
    patchSet,
    projection,
    revalidation,
    teacherCorrectedRevisionEligible,
    automaticApplyAuthority: false,
    finalTeacherApproval: false,
    studentShareEligible: false,
    musicXmlWriteBackAuthority: false,
    learningAuthority: false,
  })
}
