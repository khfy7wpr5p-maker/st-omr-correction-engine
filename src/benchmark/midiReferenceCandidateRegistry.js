export const MIDI_REFERENCE_CANDIDATE_STATUS = Object.freeze({
  NEEDS_EXACT_BYTES: 'NEEDS_EXACT_BYTES',
  NEEDS_SAME_WORK_VERIFICATION: 'NEEDS_SAME_WORK_VERIFICATION',
  ADMISSIBLE_REFERENCE_ONLY: 'ADMISSIBLE_REFERENCE_ONLY',
})

const SHA40 = /^[0-9a-f]{40}$/i
const SHA256 = /^[0-9a-f]{64}$/i

function hasPinnedComparisonSource(verification) {
  return SHA40.test(verification?.comparisonSource?.commitSha ?? '')
    && SHA40.test(verification?.comparisonSource?.blobSha ?? '')
}

function hasSameWorkVerification(candidate) {
  const verification = candidate?.sameWorkVerification
  if (candidate?.sameWorkVerified !== true || !verification || !hasPinnedComparisonSource(verification)) return false
  if (verification.workIdentityMatched !== true
    || verification.musicalSignatureMatched !== true
    || verification.openingStructureMatched !== true
    || verification.editionIdentityVerified !== false) return false

  if (verification.scope === 'WORK_IDENTITY_AND_SHARED_SOURCE_LINEAGE') {
    return verification.sharedSourceLineageMatched === true
  }

  if (verification.scope === 'WORK_IDENTITY_AND_PINNED_MUSICAL_SIGNATURE') {
    return verification.independentSourceLineageClaimed !== true
      && verification.pinnedSourceIdentityMatched === true
  }

  return false
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
  Object.freeze({
    id: 'musiclab-tarrega-lagrima-midi',
    workIdentity: Object.freeze({ composer: 'Francisco Tárrega', title: 'Lágrima' }),
    scoreSourceId: 'classical-guitar-tarrega-lagrima',
    sourcePage: 'https://github.com/drgolem/musiclab/tree/553fd1e72fb6a2cfdfb00d57052e0ee868abcf0b/scores_midi',
    midiUrl: 'https://raw.githubusercontent.com/drgolem/musiclab/553fd1e72fb6a2cfdfb00d57052e0ee868abcf0b/scores_midi/lagrima-tarrega.mid',
    sourceRepository: 'drgolem/musiclab',
    sourceCommitSha: '553fd1e72fb6a2cfdfb00d57052e0ee868abcf0b',
    sourceFilePath: 'scores_midi/lagrima-tarrega.mid',
    sourceBlobSha: 'a39724fdd6d07a27d1d097329b0f66995e0373c3',
    license: 'MIT',
    rights: Object.freeze({ benchmarkUse: true, redistribution: true }),
    midiSha256: '0c7dcf81b1a291bf0b445dc15b000bafc2660fa14fe93ba9a38f397b6e29d054',
    midiByteSize: 4535,
    exactBytesVerified: true,
    exactByteVerification: Object.freeze({
      method: 'PINNED_GITHUB_BLOB_SHA256_AND_PARSER_GATE',
      acquiredUrl: 'https://raw.githubusercontent.com/drgolem/musiclab/553fd1e72fb6a2cfdfb00d57052e0ee868abcf0b/scores_midi/lagrima-tarrega.mid',
      contentLength: 4535,
      parserSummary: Object.freeze({ format: 1, trackCount: 3, ppq: 1024, eventCount: 385, noteTrackIndex: 1, noteCount: 385, program: 24, timeSignature: '3/4' }),
    }),
    sameWorkVerified: true,
    sameWorkVerification: Object.freeze({
      scope: 'WORK_IDENTITY_AND_PINNED_MUSICAL_SIGNATURE',
      workIdentityMatched: true,
      pinnedSourceIdentityMatched: true,
      independentSourceLineageClaimed: false,
      musicalSignatureMatched: true,
      openingStructureMatched: true,
      editionIdentityVerified: false,
      comparisonSource: Object.freeze({
        repository: 'yawnoc/guitar',
        commitSha: 'fe48dbba46be760fab453b3a72ef35746f20ea48',
        filePath: 'lagrima/lagrima.ly',
        blobSha: '74fa494398f652a8e2f8e275d401a28f2fff66c7',
      }),
      evidence: Object.freeze([
        'Both pinned sources identify Francisco Tárrega — Lágrima.',
        'The yawnoc score encodes treble-8 guitar in E major and 3/4; the parsed MIDI reports 3/4 and nylon-guitar program 24.',
        'Pinned source inspection matches the opening G#–A–B upper line over E–F#–G# bass motion with the open-B/middle-voice pattern.',
        'No common edition or independent-source lineage is asserted; this verification proves same-work reference identity only.',
      ]),
    }),
    independenceVerified: false,
    teacherVerification: null,
    status: MIDI_REFERENCE_CANDIDATE_STATUS.ADMISSIBLE_REFERENCE_ONLY,
    notes: 'Pinned GitHub bytes and same-work musical signature are verified. This is reference-only: no edition identity, independence, teacher approval, measured reliability, or automatic correction authority is asserted.',
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
