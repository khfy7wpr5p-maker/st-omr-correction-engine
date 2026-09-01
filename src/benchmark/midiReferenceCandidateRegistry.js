export const MIDI_REFERENCE_CANDIDATE_STATUS = Object.freeze({
  NEEDS_EXACT_BYTES: 'NEEDS_EXACT_BYTES',
  NEEDS_SAME_WORK_VERIFICATION: 'NEEDS_SAME_WORK_VERIFICATION',
  ADMISSIBLE_REFERENCE_ONLY: 'ADMISSIBLE_REFERENCE_ONLY',
})

const SHA40 = /^[0-9a-f]{40}$/i
const SHA256 = /^[0-9a-f]{64}$/i

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
    midiSha256: null,
    exactBytesVerified: false,
    sameWorkVerified: false,
    independenceVerified: false,
    teacherVerification: null,
    status: MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_EXACT_BYTES,
    notes: 'Real-source candidate only. Mutopia publishes the score source and a MIDI download for the same catalogued work. Exact MIDI bytes and edition-level equivalence against the existing gold ScoreGraph source are not yet verified, so this candidate is not gold and cannot contribute measured reliability.',
  }),
])

export function evaluateMidiReferenceCandidateAdmission(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new TypeError('candidate is required.')
  if (!SHA40.test(candidate.sourceCommitSha ?? '') || !SHA40.test(candidate.sourceBlobSha ?? '')) {
    return Object.freeze({ admissible: false, status: MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_EXACT_BYTES, blockers: Object.freeze(['PINNED_SOURCE_IDENTITY_REQUIRED']) })
  }
  const blockers = []
  if (candidate.rights?.benchmarkUse !== true) blockers.push('BENCHMARK_RIGHTS_REQUIRED')
  if (candidate.exactBytesVerified !== true || !SHA256.test(candidate.midiSha256 ?? '')) blockers.push('EXACT_MIDI_BYTES_REQUIRED')
  if (candidate.sameWorkVerified !== true) blockers.push('SAME_WORK_VERIFICATION_REQUIRED')
  if (blockers.length) {
    const status = blockers.includes('EXACT_MIDI_BYTES_REQUIRED')
      ? MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_EXACT_BYTES
      : MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_SAME_WORK_VERIFICATION
    return Object.freeze({ admissible: false, status, blockers: Object.freeze(blockers) })
  }
  return Object.freeze({ admissible: true, status: MIDI_REFERENCE_CANDIDATE_STATUS.ADMISSIBLE_REFERENCE_ONLY, blockers: Object.freeze([]) })
}

export function getMidiReferenceCandidate(id) {
  const candidate = MIDI_REFERENCE_CANDIDATES.find((item) => item.id === id)
  if (!candidate) throw new TypeError(`Unknown MIDI reference candidate: ${id}`)
  return candidate
}
