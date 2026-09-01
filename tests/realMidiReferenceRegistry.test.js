import test from 'node:test'
import assert from 'node:assert/strict'
import { MIDI_REFERENCE_SOURCE_TYPE } from '../src/contracts/midiReferenceEvidence.js'
import { evaluateMidiCorpusCoverage } from '../src/benchmark/midiCorpusCoverage.js'
import {
  ASAP_V1_1_BACH_BWV846_REFERENCE,
  REAL_MIDI_ORACLE_STATUS,
  REAL_MIDI_REFERENCE_REGISTRY,
  evaluateRealMidiReferenceAdmission,
  getRealMidiReferenceAdmission,
} from '../src/benchmark/realMidiReferenceRegistry.js'

test('ASAP v1.1 BWV 846 source pair is exact-hash pinned and reference-only', () => {
  const record = ASAP_V1_1_BACH_BWV846_REFERENCE
  assert.equal(record.upstream.commitSha, 'fad8d1e8078d0ae47ad2f280b5d022bd2de24784')
  assert.equal(record.sourceType, MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE)
  assert.equal(record.status, 'REFERENCE_ONLY')
  assert.equal(record.files.scoreMidi.sha256, '3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f')
  assert.equal(record.files.scoreMusicXml.sha256, '1572209d1e24e600cc7758a3407a9ad3cb4cfbc5d55b821d452490d98a68307b')
  assert.equal(record.files.performanceMidi.sha256, '0e98c7ff76e11e3c75df36897e2b5bf32127fb737bbf6625a666970fe103d371')
  assert.equal(record.oracle.status, REAL_MIDI_ORACLE_STATUS.PENDING)
  assert.equal(record.oracle.teacherApproval, null)
  assert.equal(record.automaticCorrectionAuthority, false)
  assert.equal(record.recommendedEvidenceWeight, null)
})

test('ASAP admission is evaluation-eligible but cannot enter benchmark labels before oracle verification', () => {
  const report = evaluateRealMidiReferenceAdmission(ASAP_V1_1_BACH_BWV846_REFERENCE)
  assert.equal(report.referenceEligible, true)
  assert.equal(report.repositoryCopyAllowed, false)
  assert.equal(report.trainingEligible, false)
  assert.equal(report.benchmarkCaseReady, false)
  assert.deepEqual(report.blockers, ['NOTE_LEVEL_ORACLE_NOT_VERIFIED', 'VERIFIED_DIAGNOSTIC_LABELS_REQUIRED'])
  assert.equal(report.authority, 'EVALUATION_ONLY')
  assert.equal(report.automaticCorrectionAuthority, false)
  for (const file of Object.values(ASAP_V1_1_BACH_BWV846_REFERENCE.files)) {
    assert.equal(file.manifest.licenseVerified, true)
    assert.equal(file.manifest.evaluationAllowed, true)
    assert.equal(file.manifest.redistribution, false)
    assert.equal(file.manifest.commercialUse, false)
    assert.equal(file.manifest.trainingAllowed, false)
  }
})

test('reference registry cannot masquerade as required benchmark scenario cases', () => {
  assert.throws(
    () => evaluateMidiCorpusCoverage(REAL_MIDI_REFERENCE_REGISTRY),
    /Corpus case scenarios must be an array/,
  )
  assert.equal(Object.hasOwn(ASAP_V1_1_BACH_BWV846_REFERENCE, 'scenarios'), false)
})

test('ASAP probe observations are preserved without converting MusicXML counts into MIDI truth', () => {
  const record = getRealMidiReferenceAdmission('asap-v1.1-bach-bwv846')
  assert.equal(record.observedStructure.scoreMidi.eventCount, 549)
  assert.deepEqual(record.observedStructure.scoreMidi.noteTracks, [416, 133])
  assert.equal(record.observedStructure.performanceMidi.eventCount, 548)
  assert.equal(record.observedStructure.musicXml.pitchedNoteCount, 619)
  assert.deepEqual(record.observedStructure.musicXml.voices, [1, 2, 5, 6])
  assert.deepEqual(record.observedStructure.musicXml.staves, [1, 2])
  assert.notEqual(record.observedStructure.musicXml.pitchedNoteCount, record.observedStructure.scoreMidi.eventCount)
})
