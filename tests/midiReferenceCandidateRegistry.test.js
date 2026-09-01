import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIDI_REFERENCE_CANDIDATE_STATUS,
  getMidiReferenceCandidate,
  evaluateMidiReferenceCandidateAdmission,
} from '../src/index.js'

test('real Mutopia Sor MIDI candidate is exact-byte and same-work verified as reference-only', () => {
  const candidate = getMidiReferenceCandidate('mutopia-sor-op35-no13-midi')
  const admission = evaluateMidiReferenceCandidateAdmission(candidate)
  assert.equal(candidate.license, 'CC-BY-SA-4.0')
  assert.equal(candidate.sourceCommitSha, '2144afd6f52d56c5b6995b8b589ef1268b3139f0')
  assert.equal(candidate.sourceBlobSha, 'bb5d652f6ea5f284c901607d4c323c8710a0f7d2')
  assert.equal(candidate.midiSha256, '35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527')
  assert.equal(candidate.midiByteSize, 2862)
  assert.equal(candidate.exactBytesVerified, true)
  assert.equal(candidate.sameWorkVerified, true)
  assert.equal(candidate.sameWorkVerification.editionIdentityVerified, false)
  assert.equal(admission.admissible, true)
  assert.equal(admission.status, MIDI_REFERENCE_CANDIDATE_STATUS.ADMISSIBLE_REFERENCE_ONLY)
  assert.deepEqual(admission.blockers, [])
})

test('real musiclab Tarrega Lagrima MIDI is admitted reference-only from pinned bytes and musical signature', () => {
  const candidate = getMidiReferenceCandidate('musiclab-tarrega-lagrima-midi')
  const admission = evaluateMidiReferenceCandidateAdmission(candidate)
  assert.equal(candidate.sourceCommitSha, '553fd1e72fb6a2cfdfb00d57052e0ee868abcf0b')
  assert.equal(candidate.sourceBlobSha, 'a39724fdd6d07a27d1d097329b0f66995e0373c3')
  assert.equal(candidate.midiSha256, '0c7dcf81b1a291bf0b445dc15b000bafc2660fa14fe93ba9a38f397b6e29d054')
  assert.equal(candidate.midiByteSize, 4535)
  assert.equal(candidate.exactByteVerification.parserSummary.eventCount, 385)
  assert.equal(candidate.exactByteVerification.parserSummary.timeSignature, '3/4')
  assert.equal(candidate.sameWorkVerification.scope, 'WORK_IDENTITY_AND_PINNED_MUSICAL_SIGNATURE')
  assert.equal(candidate.independenceVerified, false)
  assert.equal(candidate.teacherVerification, null)
  assert.equal(admission.admissible, true)
  assert.equal(admission.goldEligible, false)
  assert.equal(admission.measuredReliabilityEligible, false)
  assert.equal(admission.automaticCorrectionAuthority, false)
})

test('same-work boolean cannot bypass required source-provenance verification metadata', () => {
  const candidate = getMidiReferenceCandidate('mutopia-sor-op35-no13-midi')
  const admission = evaluateMidiReferenceCandidateAdmission({ ...candidate, sameWorkVerified: true, sameWorkVerification: null })
  assert.equal(admission.admissible, false)
  assert.equal(admission.status, MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_SAME_WORK_VERIFICATION)
  assert.deepEqual(admission.blockers, ['SAME_WORK_VERIFICATION_REQUIRED'])
})

test('pinned-musical-signature scope cannot assert independence implicitly', () => {
  const candidate = getMidiReferenceCandidate('musiclab-tarrega-lagrima-midi')
  const admission = evaluateMidiReferenceCandidateAdmission({
    ...candidate,
    sameWorkVerification: { ...candidate.sameWorkVerification, independentSourceLineageClaimed: true },
  })
  assert.equal(admission.admissible, false)
  assert.deepEqual(admission.blockers, ['SAME_WORK_VERIFICATION_REQUIRED'])
})

test('exact-byte verification fails closed if the pinned SHA or byte size is removed', () => {
  const candidate = getMidiReferenceCandidate('mutopia-sor-op35-no13-midi')
  for (const patch of [{ midiSha256: null }, { midiByteSize: 0 }, { exactBytesVerified: false }]) {
    const admission = evaluateMidiReferenceCandidateAdmission({ ...candidate, ...patch })
    assert.equal(admission.admissible, false)
    assert.equal(admission.status, MIDI_REFERENCE_CANDIDATE_STATUS.NEEDS_EXACT_BYTES)
    assert.equal(admission.blockers.includes('EXACT_MIDI_BYTES_REQUIRED'), true)
  }
})

test('reference-only admission never implies independent, teacher-gold, reliability or correction authority', () => {
  const candidate = getMidiReferenceCandidate('mutopia-sor-op35-no13-midi')
  const admission = evaluateMidiReferenceCandidateAdmission(candidate)
  assert.equal(candidate.independenceVerified, false)
  assert.equal(candidate.teacherVerification, null)
  assert.equal(admission.goldEligible, false)
  assert.equal(admission.measuredReliabilityEligible, false)
  assert.equal(admission.automaticCorrectionAuthority, false)
})
