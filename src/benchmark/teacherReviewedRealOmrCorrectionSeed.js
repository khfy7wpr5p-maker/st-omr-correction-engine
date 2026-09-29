import { POLYPHONIC_ERROR_CLASS } from '../contracts/errorTaxonomy.js'
import {
  CORRECTION_EVENT_ORIGIN,
  TEACHER_DECISION,
  createTeacherGoldCorrectionEvent,
} from './teacherGoldCorrectionEvent.js'

export const TEACHER_REVIEWED_REAL_OMR_CORRECTION_SEED = Object.freeze({
  id: 'ses-97-franz-benda-caprice-m6-d4-duration',
  sourceAlias: 'IMSLP84783',
  engineId: 'audiveris',
  engineVersion: '5.11.0',
  engineBuild: '9e1e55cd2746037d059345881c53e6a6754bffbd',
  sourcePdf: Object.freeze({
    name: 'Franz,_Caprice_in_B_flat_major,_Ed._David_CS(1).pdf',
    sha256: '22dc1aee92db8b59ce9167f5771bda9cad797c2c5f459c6763c350284ed80dae',
  }),
  musicXml: Object.freeze({
    name: 'Franz,_Caprice_in_B_flat_major,_Ed._David_CS(1).xml',
    sha256: 'b4f6a04a19283e8559f47d5672c0d110385a74ed6f15f16009e58e23685ea113',
  }),
  omrArtifact: Object.freeze({
    name: 'Franz(1).omr',
    sha256: 'e639a7e9217f5bb3f7edb8caa8481b95e54cdd7416c38a492bc3886614d9c3a1',
  }),
  location: Object.freeze({
    page: 1,
    system: 2,
    measure: '6',
    staff: 1,
    voice: 1,
    pitch: 'D4',
  }),
  approval: Object.freeze({
    evidenceId: 'ses-97-franz-benda-m6-d4-duration-approval-2026-09-29',
    date: '2026-09-29',
    authority: 'explicit teacher/user review',
    teacherDecision: TEACHER_DECISION.ACCEPT_CORRECTION,
    correctionNeeded: true,
    correctionSafe: false,
    evidenceAvailable: true,
    originalQuarterBeats: 1,
    teacherGoldQuarterBeats: 0.25,
  }),
})

export function createTeacherReviewedRealOmrCorrectionGold() {
  const seed = TEACHER_REVIEWED_REAL_OMR_CORRECTION_SEED
  return createTeacherGoldCorrectionEvent({
    eventId: `${seed.id}:event`,
    sourceId: seed.id,
    engineId: seed.engineId,
    origin: CORRECTION_EVENT_ORIGIN.REAL_OMR,
    page: seed.location.page,
    system: seed.location.system,
    measure: seed.location.measure,
    staff: seed.location.staff,
    voice: seed.location.voice,
    errorClass: POLYPHONIC_ERROR_CLASS.DURATION,
    originalValue: seed.approval.originalQuarterBeats,
    teacherGoldValue: seed.approval.teacherGoldQuarterBeats,
    candidateValue: seed.approval.teacherGoldQuarterBeats,
    correctionNeeded: seed.approval.correctionNeeded,
    correctionSafe: seed.approval.correctionSafe,
    evidenceAvailable: seed.approval.evidenceAvailable,
    teacherDecision: seed.approval.teacherDecision,
    provenance: {
      teacherApprovalId: seed.approval.evidenceId,
      sourceRevisionId: `sha256:${seed.sourcePdf.sha256}`,
      sourceHash: seed.sourcePdf.sha256,
      engineVersion: seed.engineVersion,
      engineBuild: seed.engineBuild,
      sourceAlias: seed.sourceAlias,
      musicXmlHash: seed.musicXml.sha256,
      omrArtifactHash: seed.omrArtifact.sha256,
      teacherDecisionDate: seed.approval.date,
      reviewScope: 'SES-97',
    },
    bbox: Object.freeze({ x: 390, y: 1647, width: 27, height: 24 }),
    imageCropRef: 'ses-97-franz-benda-page1-system2-measure6-d4',
  })
}
