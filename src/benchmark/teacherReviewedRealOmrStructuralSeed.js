import { CORRECTION_EVENT_ORIGIN } from './teacherGoldCorrectionEvent.js'

export const REAL_OMR_STRUCTURAL_FAILURE_CLASS = Object.freeze({
  MISSING_EVENTS: 'MISSING_EVENTS',
  VOICE_TIMING_COLLAPSE: 'VOICE_TIMING_COLLAPSE',
  VOICE_ONSET_COLLAPSE: 'VOICE_ONSET_COLLAPSE',
})

const measureEvidence = Object.freeze([
  Object.freeze({
    measure: '21',
    classifications: Object.freeze([
      REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
      REAL_OMR_STRUCTURAL_FAILURE_CLASS.VOICE_TIMING_COLLAPSE,
    ]),
    observedXml: Object.freeze({
      nominalMeasureDivisions: 8,
      voice1DurationDivisions: 9,
      voice2DurationDivisions: null,
      pitchedEventCount: 5,
    }),
  }),
  Object.freeze({
    measure: '28',
    classifications: Object.freeze([
      REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
    ]),
    observedXml: Object.freeze({
      nominalMeasureDivisions: 8,
      voice1DurationDivisions: 12,
      voice2DurationDivisions: null,
      pitchedEventCount: 2,
    }),
  }),
  Object.freeze({
    measure: '29',
    classifications: Object.freeze([
      REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
      REAL_OMR_STRUCTURAL_FAILURE_CLASS.VOICE_TIMING_COLLAPSE,
    ]),
    observedXml: Object.freeze({
      nominalMeasureDivisions: 8,
      voice1DurationDivisions: 9,
      voice2DurationDivisions: null,
      pitchedEventCount: 5,
    }),
  }),
  Object.freeze({
    measure: '31',
    classifications: Object.freeze([
      REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
      REAL_OMR_STRUCTURAL_FAILURE_CLASS.VOICE_ONSET_COLLAPSE,
    ]),
    observedXml: Object.freeze({
      nominalMeasureDivisions: 8,
      voice1DurationDivisions: 10,
      voice2DurationDivisions: 8,
      pitchedEventCount: 8,
    }),
  }),
])

export const TEACHER_REVIEWED_REAL_OMR_STRUCTURAL_SEED = Object.freeze({
  schemaVersion: 'teacher-reviewed-real-omr-structural-evidence-v1',
  id: 'ses-110-sor-op35-no13-structural',
  sourceAlias: 'sor-op35-no13-study13',
  origin: CORRECTION_EVENT_ORIGIN.REAL_OMR,
  engineId: 'audiveris',
  engineVersion: '5.11.0',
  sourcePdf: Object.freeze({
    name: 'sorf_op35_no13-let.pdf',
    sha256: 'a9980b0aae5722e81b60f89e244895dfba79d4c371a2a6aca5be2fb8831477c1',
    byteLength: 180030,
    title: 'Fernando Sor — Op. 35 No. 13 / Study No. 13',
    rights: 'Creative Commons Attribution ShareAlike 4.0 International',
  }),
  musicXml: Object.freeze({
    name: 'sorf_op35_no13-let(1).musicxml',
    sha256: '8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b',
    byteLength: 70470,
    measureCount: 32,
    pitchedEventCount: 175,
    explicitRestCount: 0,
    rawOmrOutput: true,
  }),
  measures: measureEvidence,
  approval: Object.freeze({
    evidenceId: 'ses-110-sor-op35-no13-structural-approval-2026-09-29',
    date: '2026-09-29',
    authority: 'explicit teacher/user review',
    status: 'VERIFIED_STRUCTURAL_FAILURE',
    correctionNeeded: true,
    correctionSafe: false,
    evidenceAvailable: true,
    classificationTeacherApproved: true,
    correctedRevisionTeacherApproved: false,
  }),
  structuralPatchGate: Object.freeze({
    patchEligible: false,
    exactTeacherPatchValuesAvailable: false,
    reason: 'EXACT_TEACHER_STRUCTURAL_PATCH_VALUES_NOT_RECORDED',
  }),
  automaticCorrectionAuthority: false,
  readinessEligible: false,
})

export function createTeacherReviewedRealOmrStructuralEvidence() {
  return TEACHER_REVIEWED_REAL_OMR_STRUCTURAL_SEED
}
