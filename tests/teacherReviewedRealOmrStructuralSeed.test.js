import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REAL_OMR_STRUCTURAL_FAILURE_CLASS,
  TEACHER_REVIEWED_REAL_OMR_STRUCTURAL_SEED,
  createTeacherReviewedRealOmrStructuralEvidence,
} from '../src/index.js'

test('SES-110 Sor structural evidence pins exact source and raw Audiveris provenance', () => {
  const seed = TEACHER_REVIEWED_REAL_OMR_STRUCTURAL_SEED

  assert.equal(seed.id, 'ses-110-sor-op35-no13-structural')
  assert.equal(seed.origin, 'REAL_OMR')
  assert.equal(seed.engineId, 'audiveris')
  assert.equal(seed.engineVersion, '5.11.0')
  assert.equal(seed.sourcePdf.name, 'sorf_op35_no13-let.pdf')
  assert.equal(seed.sourcePdf.sha256, 'a9980b0aae5722e81b60f89e244895dfba79d4c371a2a6aca5be2fb8831477c1')
  assert.equal(seed.sourcePdf.byteLength, 180030)
  assert.equal(seed.musicXml.name, 'sorf_op35_no13-let(1).musicxml')
  assert.equal(seed.musicXml.sha256, '8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b')
  assert.equal(seed.musicXml.byteLength, 70470)
  assert.equal(seed.musicXml.measureCount, 32)
  assert.equal(seed.musicXml.pitchedEventCount, 175)
  assert.equal(seed.musicXml.explicitRestCount, 0)
})

test('SES-110 records only the four teacher-approved structural failure measures', () => {
  const packet = createTeacherReviewedRealOmrStructuralEvidence()

  assert.deepEqual(packet.measures.map((item) => item.measure), ['21', '28', '29', '31'])
  assert.deepEqual(packet.measures[0].classifications, [
    REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
    REAL_OMR_STRUCTURAL_FAILURE_CLASS.VOICE_TIMING_COLLAPSE,
  ])
  assert.deepEqual(packet.measures[1].classifications, [
    REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
  ])
  assert.deepEqual(packet.measures[2].classifications, [
    REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
    REAL_OMR_STRUCTURAL_FAILURE_CLASS.VOICE_TIMING_COLLAPSE,
  ])
  assert.deepEqual(packet.measures[3].classifications, [
    REAL_OMR_STRUCTURAL_FAILURE_CLASS.MISSING_EVENTS,
    REAL_OMR_STRUCTURAL_FAILURE_CLASS.VOICE_ONSET_COLLAPSE,
  ])

  assert.deepEqual(packet.measures.map((item) => item.observedXml.voice1DurationDivisions), [9, 12, 9, 10])
  assert.deepEqual(packet.measures.map((item) => item.observedXml.pitchedEventCount), [5, 2, 5, 8])
  assert.equal(packet.measures[3].observedXml.voice2DurationDivisions, 8)
})

test('SES-110 structural evidence remains teacher-verified but cannot invent CE-STRUCT patch values', () => {
  const packet = createTeacherReviewedRealOmrStructuralEvidence()

  assert.equal(packet.approval.status, 'VERIFIED_STRUCTURAL_FAILURE')
  assert.equal(packet.approval.correctionNeeded, true)
  assert.equal(packet.approval.evidenceAvailable, true)
  assert.equal(packet.approval.correctionSafe, false)
  assert.equal(packet.approval.classificationTeacherApproved, true)
  assert.equal(packet.approval.correctedRevisionTeacherApproved, false)

  assert.equal(packet.structuralPatchGate.patchEligible, false)
  assert.equal(packet.structuralPatchGate.exactTeacherPatchValuesAvailable, false)
  assert.equal(packet.structuralPatchGate.reason, 'EXACT_TEACHER_STRUCTURAL_PATCH_VALUES_NOT_RECORDED')
  assert.equal(packet.automaticCorrectionAuthority, false)
  assert.equal(packet.readinessEligible, false)
  assert.equal('patches' in packet, false)
  assert.equal('teacherGoldValue' in packet, false)
})
