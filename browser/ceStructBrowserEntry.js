import { processSesliTabTeacherStructuralEdit } from '../adapters/seslitab/teacherStructuralEditAdapter.js'
import {
  createTeacherEditAuthorization,
  createTeacherStructuralPatch,
  createTeacherStructuralPatchSet,
  fingerprintScoreGraph,
  TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION,
} from '../src/contracts/teacherStructuralPatch.js'
import { createMeasure } from '../src/model/measure.js'
import { createScoreEvent } from '../src/model/scoreEvent.js'
import { createScoreGraph } from '../src/model/scoreGraph.js'

const metadata = Object.freeze({
  contract: 'ST_OMR_CORRECTION_ENGINE_CE_STRUCT_BROWSER',
  contractVersion: '1.0.0',
  runtimeVersion: '1.0.0',
  patchSchemaVersion: TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION,
})

export const contract = metadata.contract
export const contractVersion = metadata.contractVersion
export const runtimeVersion = metadata.runtimeVersion
export const patchSchemaVersion = metadata.patchSchemaVersion

export {
  createMeasure,
  createScoreEvent,
  createScoreGraph,
  createTeacherEditAuthorization,
  createTeacherStructuralPatch,
  createTeacherStructuralPatchSet,
  fingerprintScoreGraph,
  processSesliTabTeacherStructuralEdit,
}
