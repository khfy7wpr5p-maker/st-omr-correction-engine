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
  assert.equal(REFERENCE_CORPUS.length, 6)
  for (const source of REFERENCE_CORPUS) {
    assert.match(source.commitSha, /^[0-9a-f]{40}$/)
    assert.match(source.blobSha, /^[0-9a-f]{40}$/)
    assert.equal(source.license, 'CC0-1.0')
    assert.equal(source.rights.benchmarkUse, true)
    assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
    assert.equal(source.teacherApproval, null)
  }
})

test('reference corpus is balanced across piano and classical guitar', () => {
  assert.equal(REFERENCE_CORPUS.filter((source) => source.instrumentProfile === 'piano').length, 3)
  assert.equal(REFERENCE_CORPUS.filter((source) => source.instrumentProfile === 'classical-guitar').length, 3)
})

test('reference sources preserve source-verified challenge diversity', () => {
  const satie = getReferenceCorpusSource('piano-openscore-lieder-satie-je-te-veux')
  const paradís = getReferenceCorpusSource('piano-openscore-paradis-an-das-klavier')
  const webern = getReferenceCorpusSource('piano-openscore-webern-op4-no4')
  const sor = getReferenceCorpusSource('classical-guitar-sor-op35-no13-study-in-c')
  const lagrima = getReferenceCorpusSource('classical-guitar-tarrega-lagrima')
  const dowland = getReferenceCorpusSource('classical-guitar-dowland-fantasia-7')

  assert.equal(satie.challengeTags.includes('multi-voice-upper-staff'), true)
  assert.equal(paradís.challengeTags.includes('2-4-meter'), true)
  assert.equal(webern.challengeTags.includes('irregular-opening-measure'), true)
  assert.equal(sor.challengeTags.includes('three-voice-polyphony'), true)
  assert.equal(lagrima.challengeTags.includes('three-voice-polyphony'), true)
  assert.equal(dowland.challengeTags.includes('four-voice-polyphony'), true)
  assert.equal(dowland.challengeTags.includes('tuplets'), true)
})

test('reference data cannot become gold without explicit teacher approval', () => {
  const source = REFERENCE_CORPUS[2]
  assert.throws(() => promoteCorpusSourceForGold(source, null), /teacher approval/i)

  const approval = createTeacherApproval({ approvalId: 'teacher-review-fixture-001', approved: true })
  const promoted = promoteCorpusSourceForGold(source, approval)
  assert.equal(promoted.status, CORPUS_SOURCE_STATUS.GOLD_ELIGIBLE)
  assert.equal(promoted.teacherApproval.approvalId, 'teacher-review-fixture-001')
  assert.equal(source.status, CORPUS_SOURCE_STATUS.REFERENCE_ONLY)
  assert.equal(source.teacherApproval, null)
})
