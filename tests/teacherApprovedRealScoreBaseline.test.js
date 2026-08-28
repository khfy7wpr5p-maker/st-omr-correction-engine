import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APPROVED_REVIEW_PACKETS,
  CORPUS_SOURCE_STATUS,
  GOLD_ELIGIBLE_REFERENCE_CORPUS,
  REVIEW_PACKET_STATUS,
  TEACHER_APPROVED_GUARD_CASES,
  TEACHER_APPROVED_HIGH_EVIDENCE_CASES,
  TEACHER_APPROVED_MUTATION_CASES,
  generateVoiceCandidates,
  resolveCandidates,
  runCorrectionBenchmark,
} from '../src/index.js'

function solveVoiceMutation(input) {
  const generated = generateVoiceCandidates({
    events: input.events,
    ambiguousEventIds: input.ambiguousEventIds,
    instrumentProfile: input.instrumentProfile,
    validatorFindings: input.validatorFindings,
  })
  return resolveCandidates(generated.candidates)
}

test('explicit teacher approval promotes only the bounded reviewed sources', () => {
  assert.equal(APPROVED_REVIEW_PACKETS.length, 2)
  assert.equal(APPROVED_REVIEW_PACKETS.every((packet) => packet.status === REVIEW_PACKET_STATUS.APPROVED), true)
  assert.equal(GOLD_ELIGIBLE_REFERENCE_CORPUS.length, 2)
  assert.equal(GOLD_ELIGIBLE_REFERENCE_CORPUS.every((source) => source.status === CORPUS_SOURCE_STATUS.GOLD_ELIGIBLE), true)
})

test('approved mutation benchmark expands to balanced high-evidence and guard cases', () => {
  assert.equal(TEACHER_APPROVED_HIGH_EVIDENCE_CASES.length, 4)
  assert.equal(TEACHER_APPROVED_GUARD_CASES.length, 4)
  assert.equal(TEACHER_APPROVED_MUTATION_CASES.length, 8)
  assert.equal(TEACHER_APPROVED_MUTATION_CASES.every((entry) => entry.teacherApproval?.approved === true), true)
})

test('voice solver ranks the teacher-approved correction direction first in every controlled mutation', () => {
  for (const gold of TEACHER_APPROVED_MUTATION_CASES) {
    const generated = generateVoiceCandidates({
      events: gold.input.events,
      ambiguousEventIds: gold.input.ambiguousEventIds,
      instrumentProfile: gold.input.instrumentProfile,
      validatorFindings: gold.input.validatorFindings,
    })
    const ranked = [...generated.candidates].sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    assert.ok(ranked.length > 0)
    assert.equal(ranked[0].patches[0].operation, gold.expectedPatches[0].operation)
    assert.equal(ranked[0].patches[0].eventId, gold.expectedPatches[0].eventId)
    assert.equal(ranked[0].patches[0].before, gold.expectedPatches[0].before)
    assert.equal(ranked[0].patches[0].after, gold.expectedPatches[0].after)
  }
})

test('high-evidence controlled mutations cross the unchanged resolver threshold safely', async () => {
  const report = await runCorrectionBenchmark(TEACHER_APPROVED_HIGH_EVIDENCE_CASES, solveVoiceMutation)
  assert.equal(report.total, 4)
  assert.equal(report.resolved, 4)
  assert.equal(report.correctResolved, 4)
  assert.equal(report.incorrectResolved, 0)
  assert.equal(report.ambiguous, 0)
  assert.equal(report.coverage, 1)
  assert.equal(report.precision, 1)
})

test('expanded benchmark keeps partial-evidence guard cases fail-closed', async () => {
  const report = await runCorrectionBenchmark(TEACHER_APPROVED_MUTATION_CASES, solveVoiceMutation)
  assert.equal(report.total, 8)
  assert.equal(report.resolved, 4)
  assert.equal(report.correctResolved, 4)
  assert.equal(report.incorrectResolved, 0)
  assert.equal(report.ambiguous, 4)
  assert.equal(report.blockedOrUnsupported, 0)
  assert.equal(report.coverage, 0.5)
  assert.equal(report.precision, 1)
})
