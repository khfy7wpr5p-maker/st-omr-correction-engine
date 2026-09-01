export const MIDI_REFERENCE_CANDIDATE_STATUS = Object.freeze({
  NEEDS_EXACT_BYTES: 'NEEDS_EXACT_BYTES',
  NEEDS_SAME_WORK_VERIFICATION: 'NEEDS_SAME_WORK_VERIFICATION',
  ADMISSIBLE_REFERENCE_ONLY: 'ADMISSIBLE_REFERENCE_ONLY',
})

const SHA40 = /^[0-9a-f]{40}$/i
const SHA256 = /^[0-9a-f]{64}$/i

function hasSameWorkVerification(candidate) {
  const verification = candidate?.sameWorkVerification
  return candidate?.sameWorkVerified === true
    && verification
    && verification.scope === 'WORK_IDENTITY_AND_SHARED_SOURCE_LINEAGE'
    && verification.workIdentityMatched === true
    && verification.sharedSourceLineageMatched === true
    && verification.musicalSignatureMatched === true
    && verification.openingStructureMatched === true
    && verification.editionIdentityVerified === false
    && SHA40.test(verification.comparisonSource?.commitSha ?? '')
    && SHA40.test(verification.comparisonSource?.blobSha ?? '')
}

export const MIDI_REFERENCE_CANDIDATES = Object.freeze([
  Object.freeze({
    id: 'mutopia-sor-op35-no13-midi',
    workIdentity: Object.freeze({ composer: 'Fernando Sor', opus: 'Op. 35 No. 13', title: 'Study No. 13' }),
    scoreSourceId: 'classical-guitar-sor-op35-no13-study-in-c',
    sourcePage: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1945',
    midiUrl: 'https://www.mutopiaproject.org/ftp/SorF/O35/sorf_op35_no13/sorf_op35_no13.mid',
    sourceRepository: 'MutopiaProject/MutopiaProject',
    sourceCommitSha: '2144afd6f52d56c5b6995b8b589ef1268b3139f0',
    sourceFilePath: 'ftp/SorF/O35/sorf_op35_no13/sorf_op35_no13.ly',
    sourceBlobSha: 'bb5d652f6ea5f284c901607d4c323c8710a0f7d2',
    license: 'CC-BY-SA-4.0',
    rights: Object.freeze({ benchmarkUse: true, redistribution: true }),
    midiSha256: '35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527',
    midiByteSize: 2862,
    exactBytesVerified: true,
    exactByteVerification: Object.freeze({
      method: 'PINNED_URL_SHA256_AND_PARSER_GATE',
      acquiredUrl: 'https://www.mutopiaproject.org/ftp/SorF/O35/sorf_op35_no13/sorf_op35_no13.mid',
      contentType: 'audio/sp-midi',
      contentLength: 2862,
      lastModified: 'Sun, 23 Mar 2014 11:50:17 GMT',
      etag: '"b2e-4f544b8fcd040"',
      parserSummary: Object.freeze({ format: 1, trackCount: 2, ppq: 384, eventCount: 334, noteTrackIndex: 1, noteCount: 334, program: 24, timeSignature: '2/4' }),
    }),
    sameWorkVerified: true,
    sameWorkVerification: Object.freeze({
      scope: 'WORK_IDENTITY_AND_SHARED_SOURCE_LINEAGE',
      workIdentityMatched: true,
      sharedSourceLineageMatched: true,
      musicalSignatureMatched: true,
      openingStructureMatched: true,
      editionIdentityVerified: false,
      comparisonSource: Object.freeze({
        repository: 'yawnoc/guitar',
        commitSha: 'fe48dbba46be760fab453b3a72ef35746f20ea48',
        filePath: 'sor-c-major-35-13/sor-c-major-35-13.ly',
        blobSha: 'c96155e3693c4963c1ebf669ed8e54d17c075e77',
      }),
      evidence: Object.freeze([
        'Both pinned sources identify Fernando Sor, Op. 35 No. 13 / Study No. 13.',
        'Both source records trace the edition/source to the 1924 Boije 482 / N. Simrock material.',
        'Both encode C major, 2/4, treble-8 guitar notation.',
        'Pinned source inspection confirms matching opening upper, lower and middle-voice material.',
      ]),
    }),
    independenceVerified: false,
    teacherVerification: null,
    status: MIDI_REFERENCE_CANDIDATE_STATUS.ADMISSIBLE_REFERENCE_ONLY,
    notes: 'Exact web MIDI bytes and same-work identity are now source-verified. This remains reference-only: edition identity is not asserted, independence is false, teacher verification is absent, and the MIDI cannot become gold or measured reliability evidence.',
  }),
])

export function evaluateMidiReferenceCandidateAdmission(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new TypeError('candidate is required.')
  if (!SHA40.test(candidate.sourceCommitSha ?? '') || !SHA40.test(candidate.sourceBlobSha ?? '')) {
    return Object.freeze({ admissible: false, status: MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_EXACT_BYTES, blockers: Object.freeze(['PINNED_SOURCE_IDENTITY_REQUIRED']) })
  }
  const blockers = []
  if (candidate.rights?.benchmarkUse !== true) blockers.push('BENCHMARK_RIGHTS_REQUIRED')
  if (candidate.exactBytesVerified !== true || !SHA256.test(candidate.midiSha256 ?? '') || !Number.isInteger(candidate.midiByteSize) || candidate.midiByteSize <= 0) blockers.push('EXACT_MIDI_BYTES_REQUIRED')
  if (!hasSameWorkVerification(candidate)) blockers.push('SAME_WORK_VERIFICATION_REQUIRED')
  if (blockers.length) {
    const status = blockers.includes('EXACT_MIDI_BYTES_REQUIRED')
      ? MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_EXACT_BYTES
      : MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_SAME_WORK_VERIFICATION
    return Object.freeze({ admissible: false, status, blockers: Object.freeze(blockers) })
  }
  return Object.freeze({
    admissible: true,
    status: MIDI_REFERENCE_CANDIDATE_STATUS.ADMISSIBLE_REFERENCE_ONLY,
    blockers: Object.freeze([]),
    goldEligible: false,
    measuredReliabilityEligible: false,
    automaticCorrectionAuthority: false,
  })
}

export function getMidiReferenceCandidate(id) {
  const candidate = MIDI_REFERENCE_CANDIDATES.find((item) => item.id === id)
  if (!candidate) throw new TypeError(`Unknown MIDI reference candidate: ${id}`)
  return candidate
}
