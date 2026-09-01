import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIDI_REFERENCE_CANDIDATE_STATUS,
  getMidiReferenceCandidate,
  evaluateMidiReferenceCandidateAdmission,
} from '../src/index.js'

test('real Mutopia Sor MIDI candidate remains fail-closed until exact bytes and same-work equivalence are verified', () => {
  const candidate = getMidiReferenceCandidate('mutopia-sor-op35-no13-midi')
  const admission = evaluateMidiReferenceCandidateAdmission(candidate)
  assert.equal(candidate.license, 'CC-BY-SA-4.0')
  assert.equal(candidate.sourceCommitSha, '2144afd6f52d56c5b6995b8b589ef1268b3139f0')
  assert.equal(candidate.sourceBlobSha, 'bb5d652f6ea5f284c901607d4c323c8710a0f7d2')
  assert.equal(admission.admissible, false)
  assert.equal(admission.status, MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_EXACT_BYTES)
  assert.equal(admission.blockers.includes('EXACT_MIDI_BYTES_REQUIRED'), true)
  assert.equal(admission.blockers.includes('SAME_WORK_VERIFICATION_REQUIRED'), true)
})

test('candidate can become reference-only only after exact-byte and same-work gates pass', () => {
  const candidate = getMidiReferenceCandidate('mutopia-sor-op35-no13-midi')
  const admission = evaluateMidiReferenceCandidateAdmission({
    ...candidate,
    exactBytesVerified: true,
    midiSha256: 'a'.repeat(64),
    sameWorkVerified: true,
  })
  assert.equal(admission.admissible, true)
  assert.equal(admission.status, MIDI_REFERENCE_CANDIDATE_STATUS.ADMISSIBLE_REFERENCE_ONLY)
  assert.deepEqual(admission.blockers, [])
})

test('admission never implies independent or teacher-gold authority', () => {
  const candidate = getMidiReferenceCandidate('mutopia-sor-op35-no13-midi')
  assert.equal(candidate.independenceVerified, false)
  assert.equal(candidate.teacherVerification, null)
})
