import { MIDI_REFERENCE_SOURCE_TYPE, isMidiReferenceSourceType } from '../contracts/midiReferenceEvidence.js'

const SHA256 = /^[0-9a-f]{64}$/i

export const REAL_MIDI_SCOREGRAPH_ORIGIN = Object.freeze({
  OMR_CANONICAL: 'OMR_CANONICAL',
  HOST_CANONICAL: 'HOST_CANONICAL',
  MUSICXML_ONLY: 'MUSICXML_ONLY',
  SOURCE_LILYPOND_ONLY: 'SOURCE_LILYPOND_ONLY',
  CONTROLLED_MUTATION: 'CONTROLLED_MUTATION',
  SOURCE_RECONSTRUCTION: 'SOURCE_RECONSTRUCTION',
})

export const REAL_MIDI_PAIR_STATUS = Object.freeze({
  NEEDS_EXACT_MIDI: 'NEEDS_EXACT_MIDI',
  NEEDS_CANONICAL_SCOREGRAPH: 'NEEDS_CANONICAL_SCOREGRAPH',
  NEEDS_SAME_WORK_VERIFICATION: 'NEEDS_SAME_WORK_VERIFICATION',
  READY_FOR_ORACLE_REVIEW: 'READY_FOR_ORACLE_REVIEW',
  UNSUPPORTED: 'UNSUPPORTED',
})

const CANONICAL_ORIGINS = new Set([
  REAL_MIDI_SCOREGRAPH_ORIGIN.OMR_CANONICAL,
  REAL_MIDI_SCOREGRAPH_ORIGIN.HOST_CANONICAL,
])

function hasGraphShape(scoreGraph) {
  return Boolean(scoreGraph && Array.isArray(scoreGraph.measures) && Array.isArray(scoreGraph.events))
}

function validIdentity(identity) {
  return Boolean(
    identity
    && CANONICAL_ORIGINS.has(identity.origin)
    && typeof identity.sourceId === 'string' && identity.sourceId.trim()
    && typeof identity.revisionId === 'string' && identity.revisionId.trim()
    && typeof identity.sha256 === 'string' && SHA256.test(identity.sha256)
    && identity.provenanceVerified === true
  )
}

export const USER_PROVIDED_REAL_OMR_MANIFESTS = Object.freeze([
  Object.freeze({
    id: 'user-omr-sor-op35-no13-2026-09-01',
    work: 'Fernando Sor — Op.35 No.13',
    sourceType: 'AUDIVERIS_MUSICXML',
    sourceSha256: '8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b',
    sourceBytes: 70470,
    software: Object.freeze(['Audiveris 5.11.0', 'ProxyMusic 4.0.3']),
    observedStructure: Object.freeze({ measureCount: 32, pitchedNoteCount: 175, restCount: 0, voices: Object.freeze([1, 2]), staves: Object.freeze([1]) }),
    midiReferenceId: 'mutopia-sor-op35-no13-midi',
    midiSha256: '35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527',
    manualEditStatus: 'UNKNOWN',
    canonicalScoreGraphPersisted: false,
    automaticCorrectionAuthority: false,
  }),
  Object.freeze({
    id: 'user-omr-bach-bwv846-2026-09-01',
    work: 'J.S. Bach — BWV 846 Prelude No.1',
    sourceType: 'AUDIVERIS_MUSICXML',
    sourceSha256: '684250fb632299a0df3664623a851ec149cf3952c76956f1d1ad9d4572779fdd',
    sourceBytes: 265350,
    software: Object.freeze(['Audiveris 5.11.0', 'ProxyMusic 4.0.3']),
    observedStructure: Object.freeze({ measureCount: 35, pitchedNoteCount: 577, restCount: 132, voices: Object.freeze([1, 2, 3, 4, 5, 6, 7]), staves: Object.freeze([1, 2]) }),
    midiReferenceId: 'asap-v1.1-bach-bwv846',
    midiSha256: '3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f',
    manualEditStatus: 'UNKNOWN',
    canonicalScoreGraphPersisted: false,
    automaticCorrectionAuthority: false,
  }),
])

export const REAL_MIDI_PAIR_CANDIDATES = Object.freeze([
  Object.freeze({
    id: 'asap-v1.1-bach-bwv846-real-pair',
    sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
    midiReferenceId: 'asap-v1.1-bach-bwv846',
    midiSha256: '3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f',
    sameWorkVerified: true,
    scoreGraph: null,
    scoreGraphIdentity: Object.freeze({
      origin: REAL_MIDI_SCOREGRAPH_ORIGIN.MUSICXML_ONLY,
      sourceId: 'user-omr-bach-bwv846-2026-09-01',
      revisionId: null,
      sha256: null,
      provenanceVerified: true,
    }),
    benchmarkInput: null,
    automaticCorrectionAuthority: false,
  }),
  Object.freeze({
    id: 'mutopia-sor-op35-no13-real-pair',
    sourceType: MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE,
    midiReferenceId: 'mutopia-sor-op35-no13-midi',
    midiSha256: '35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527',
    sameWorkVerified: true,
    scoreGraph: null,
    scoreGraphIdentity: Object.freeze({
      origin: REAL_MIDI_SCOREGRAPH_ORIGIN.MUSICXML_ONLY,
      sourceId: 'user-omr-sor-op35-no13-2026-09-01',
      revisionId: null,
      sha256: null,
      provenanceVerified: true,
    }),
    benchmarkInput: null,
    automaticCorrectionAuthority: false,
  }),
])

export function evaluateRealMidiPairReadiness(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new TypeError('candidate is required.')
  const blockers = []
  if (!isMidiReferenceSourceType(candidate.sourceType) || candidate.sourceType === MIDI_REFERENCE_SOURCE_TYPE.UNKNOWN) blockers.push('SUPPORTED_MIDI_SOURCE_TYPE_REQUIRED')
  if (typeof candidate.midiSha256 !== 'string' || !SHA256.test(candidate.midiSha256)) blockers.push('EXACT_MIDI_IDENTITY_REQUIRED')
  if (candidate.sameWorkVerified !== true) blockers.push('SAME_WORK_VERIFICATION_REQUIRED')

  const identity = candidate.scoreGraphIdentity
  if (identity?.origin === REAL_MIDI_SCOREGRAPH_ORIGIN.CONTROLLED_MUTATION || identity?.origin === REAL_MIDI_SCOREGRAPH_ORIGIN.SOURCE_RECONSTRUCTION) {
    blockers.push('CONTROLLED_OR_RECONSTRUCTED_SCOREGRAPH_NOT_REAL_PAIR')
  }
  if (!hasGraphShape(candidate.scoreGraph) || !validIdentity(identity)) blockers.push('CANONICAL_SCOREGRAPH_REQUIRED')
  if (hasGraphShape(candidate.scoreGraph) && validIdentity(identity) && candidate.scoreGraph.sourceId !== identity.sourceId) blockers.push('SCOREGRAPH_SOURCE_IDENTITY_MISMATCH')
  if (hasGraphShape(candidate.scoreGraph) && validIdentity(identity) && (!candidate.benchmarkInput || typeof candidate.benchmarkInput !== 'object')) blockers.push('BENCHMARK_INPUT_REQUIRED')

  let status = REAL_MIDI_PAIR_STATUS.READY_FOR_ORACLE_REVIEW
  if (blockers.includes('SUPPORTED_MIDI_SOURCE_TYPE_REQUIRED')) status = REAL_MIDI_PAIR_STATUS.UNSUPPORTED
  else if (blockers.includes('EXACT_MIDI_IDENTITY_REQUIRED')) status = REAL_MIDI_PAIR_STATUS.NEEDS_EXACT_MIDI
  else if (blockers.includes('CANONICAL_SCOREGRAPH_REQUIRED') || blockers.includes('CONTROLLED_OR_RECONSTRUCTED_SCOREGRAPH_NOT_REAL_PAIR') || blockers.includes('SCOREGRAPH_SOURCE_IDENTITY_MISMATCH') || blockers.includes('BENCHMARK_INPUT_REQUIRED')) status = REAL_MIDI_PAIR_STATUS.NEEDS_CANONICAL_SCOREGRAPH
  else if (blockers.includes('SAME_WORK_VERIFICATION_REQUIRED')) status = REAL_MIDI_PAIR_STATUS.NEEDS_SAME_WORK_VERIFICATION

  return Object.freeze({
    id: candidate.id ?? null,
    status,
    readyForOracleReview: status === REAL_MIDI_PAIR_STATUS.READY_FOR_ORACLE_REVIEW,
    blockers: Object.freeze(blockers),
    automaticCorrectionAuthority: false,
  })
}

export function getRealMidiPairCandidate(id) {
  const candidate = REAL_MIDI_PAIR_CANDIDATES.find((item) => item.id === id)
  if (!candidate) throw new TypeError(`Unknown real MIDI pair candidate: ${id}`)
  return candidate
}
