import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORPUS_SOURCE_STATUS,
  REFERENCE_CORPUS,
  createTeacherApproval,
  getReferenceCorpusSource,
  promoteCorpusSourceForGold,
} from '../src/index.js'

test('reference corpus is pinned, CC0 and reference-only by default', () => {
  assert.equal(REFERENCE_CORPUS.length, 2)
  for (const source of REFERENCE_CORPUS) {
    assert.match(source.commitSha, /^[0-9a-f]{40}$/)
    assert.match(source.blobSha, /^[0-9a-f]{40}$/)
    assert.equal(source.license, 'CC0-1.0')
    assert.equal(source.rights.benchmarkUse, true)
    assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
    assert.equal(source.teacherApproval, null)
  }
})

test('piano and classical-guitar reference sources stay instrument-specific', () => {
  const piano = getReferenceCorpusSource('piano-openscore-lieder-satie-je-te-veux')
  const guitar = getReferenceCorpusSource('classical-guitar-sor-op35-no13-study-in-c')
  assert.equal(piano.instrumentProfile, 'piano')
  assert.equal(piano.challengeTags.includes('grand-staff'), true)
  assert.equal(piano.challengeTags.includes('multi-voice-upper-staff'), true)
  assert.equal(guitar.instrumentProfile, 'classical-guitar')
  assert.equal(guitar.challengeTags.includes('three-voice-polyphony'), true)
  assert.equal(guitar.challengeTags.includes('middle-arpeggio-voice'), true)
})

test('reference data cannot become gold without explicit teacher approval', () => {
  const source = REFERENCE_CORPUS[0]
  assert.throws(() => promoteCorpusSourceForGold(source, null), /teacher approval/i)

  const approval = createTeacherApproval({ approvalId: 'teacher-review-fixture-001', approved: true })
  const promoted = promoteCorpusSourceForGold(source, approval)
  assert.equal(promoted.status, CORPUS_SOURCE_STATUS.GOLD_ELIGIBLE)
  assert.equal(promoted.teacherApproval.approvalId, 'teacher-review-fixture-001')
  assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
  assert.equal(source.teacherApproval, null)
})
