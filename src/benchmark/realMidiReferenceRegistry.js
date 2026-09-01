import { MIDI_REFERENCE_SOURCE_TYPE } from '../contracts/midiReferenceEvidence.js'
import { createExternalBenchmarkManifest, evaluateExternalBenchmarkEligibility } from './externalBenchmarkManifest.js'

export const REAL_MIDI_ORACLE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  TEACHER_VERIFIED: 'TEACHER_VERIFIED',
  INDEPENDENT_REFERENCE_VERIFIED: 'INDEPENDENT_REFERENCE_VERIFIED',
})

const ASAP_REPOSITORY = 'fosfrancesco/asap-dataset'
const ASAP_COMMIT = 'fad8d1e8078d0ae47ad2f280b5d022bd2de24784'
const ASAP_VERSION = 'v1.1'
const ASAP_LICENSE = 'CC BY-NC-SA 4.0'

function asapFile({ path, blobSha, sha256, bytes }) {
  const manifest = createExternalBenchmarkManifest({
    dataset: 'ASAP',
    source: `https://github.com/${ASAP_REPOSITORY}/blob/${ASAP_COMMIT}/${path}`,
    version: ASAP_VERSION,
    license: ASAP_LICENSE,
    licenseVerified: true,
    redistribution: false,
    commercialUse: false,
    trainingAllowed: false,
    evaluationAllowed: true,
    checksum: sha256,
  })
  return Object.freeze({ path, blobSha, sha256, bytes, manifest })
}

export const ASAP_V1_1_BACH_BWV846_REFERENCE = Object.freeze({
  id: 'asap-v1.1-bach-bwv846',
  status: 'REFERENCE_ONLY',
  sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
  instrumentProfile: 'piano',
  work: Object.freeze({
    composer: 'J.S. Bach',
    title: 'Praeludium in C-Dur',
    catalog: 'BWV 846',
  }),
  upstream: Object.freeze({
    repository: ASAP_REPOSITORY,
    version: ASAP_VERSION,
    commitSha: ASAP_COMMIT,
    license: ASAP_LICENSE,
  }),
  files: Object.freeze({
    scoreMidi: asapFile({
      path: 'Bach/Prelude/bwv_846/midi_score.mid',
      blobSha: '142549168ef17c6721aa274b988c3086c8c2e2bb',
      sha256: '3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f',
      bytes: 3525,
    }),
    scoreMusicXml: asapFile({
      path: 'Bach/Prelude/bwv_846/xml_score.musicxml',
      blobSha: 'dcd52112aa795c8be5dbd0c6fbedcd2135c79ed6',
      sha256: '1572209d1e24e600cc7758a3407a9ad3cb4cfbc5d55b821d452490d98a68307b',
      bytes: 267546,
    }),
    scoreAnnotations: asapFile({
      path: 'Bach/Prelude/bwv_846/midi_score_annotations.txt',
      blobSha: '436ed17eb45f9bb504fd99f6b53c01aa466d2c39',
      sha256: 'a3faa7727013d73caea9d08480402d79d985fea44e7c9e9bd89917931b741306',
      bytes: 1645,
    }),
    performanceMidi: asapFile({
      path: 'Bach/Prelude/bwv_846/Shi05M.mid',
      blobSha: 'b44574a62d503c7bf3af20f0f1a103273f8a844e',
      sha256: '0e98c7ff76e11e3c75df36897e2b5bf32127fb737bbf6625a666970fe103d371',
      bytes: 11595,
    }),
    performanceAnnotations: asapFile({
      path: 'Bach/Prelude/bwv_846/Shi05M_annotations.txt',
      blobSha: '7b3c6b52abe78a76950e9bd7b8293893e820d171',
      sha256: '43e179e671f049442dd45654a9be2aa3a5eb28fd1a2a10cf27038cc27150df81',
      bytes: 3519,
    }),
  }),
  upstreamRelationship: Object.freeze({
    sameWorkScoreMidiAndMusicXml: true,
    performanceListedInSamePieceDirectory: true,
    upstreamDatasetDeclaresScorePerformanceAlignment: true,
  }),
  observedStructure: Object.freeze({
    scoreMidi: Object.freeze({ format: 1, trackCount: 2, ppq: 480, eventCount: 549, noteTracks: Object.freeze([416, 133]) }),
    performanceMidi: Object.freeze({ format: 1, trackCount: 2, ppq: 384, eventCount: 548, noteTracks: Object.freeze([548]) }),
    musicXml: Object.freeze({ partCount: 1, measureCount: 35, pitchedNoteCount: 619, restCount: 132, voices: Object.freeze([1, 2, 5, 6]), staves: Object.freeze([1, 2]) }),
  }),
  observedChallenges: Object.freeze(['POLYPHONY', 'REPEATED_PITCH', 'SCORE_PERFORMANCE_ALIGNMENT']),
  oracle: Object.freeze({
    status: REAL_MIDI_ORACLE_STATUS.PENDING,
    verifiedDiagnosticLabels: 0,
    reason: 'NOTE_LEVEL_ORACLE_NOT_VERIFIED',
    teacherApproval: null,
  }),
  automaticCorrectionAuthority: false,
  recommendedEvidenceWeight: null,
})

export const REAL_MIDI_REFERENCE_REGISTRY = Object.freeze([
  ASAP_V1_1_BACH_BWV846_REFERENCE,
])

export function evaluateRealMidiReferenceAdmission(record) {
  if (!record || typeof record !== 'object') throw new TypeError('record is required.')
  if (!record.files || typeof record.files !== 'object') throw new TypeError('record.files is required.')
  const fileReports = Object.freeze(Object.fromEntries(Object.entries(record.files).map(([key, file]) => [key, evaluateExternalBenchmarkEligibility(file.manifest)])))
  const blockers = []
  if (Object.values(fileReports).some((report) => !report.eligibleForEvaluation)) blockers.push('SOURCE_FILE_NOT_EVALUATION_ELIGIBLE')
  if (record.upstreamRelationship?.sameWorkScoreMidiAndMusicXml !== true) blockers.push('SAME_WORK_RELATIONSHIP_NOT_VERIFIED')
  if (![REAL_MIDI_ORACLE_STATUS.TEACHER_VERIFIED, REAL_MIDI_ORACLE_STATUS.INDEPENDENT_REFERENCE_VERIFIED].includes(record.oracle?.status)) {
    blockers.push('NOTE_LEVEL_ORACLE_NOT_VERIFIED')
  }
  if (!Number.isInteger(record.oracle?.verifiedDiagnosticLabels) || record.oracle.verifiedDiagnosticLabels <= 0) blockers.push('VERIFIED_DIAGNOSTIC_LABELS_REQUIRED')
  if (record.automaticCorrectionAuthority !== false) blockers.push('CORRECTION_AUTHORITY_FORBIDDEN')
  return Object.freeze({
    id: record.id,
    referenceEligible: Object.values(fileReports).every((report) => report.eligibleForEvaluation),
    repositoryCopyAllowed: Object.values(fileReports).every((report) => report.eligibleForRepositoryCopy),
    trainingEligible: Object.values(fileReports).every((report) => report.eligibleForTraining),
    benchmarkCaseReady: blockers.length === 0,
    fileReports,
    blockers: Object.freeze(blockers),
    authority: 'EVALUATION_ONLY',
    automaticCorrectionAuthority: false,
  })
}

export function getRealMidiReferenceAdmission(id) {
  return REAL_MIDI_REFERENCE_REGISTRY.find((record) => record.id === id) ?? null
}
