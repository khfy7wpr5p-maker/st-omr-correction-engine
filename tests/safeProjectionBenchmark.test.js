import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_STATUS,
  PATCH_OPERATION,
  createCorrectionPatch,
  createCorrectionResult,
  createGoldCase,
  createMeasure,
  createScoreEvent,
  createScoreGraph,
  createTeacherApproval,
  projectCorrectionPatches,
  revertCorrectionPatches,
  runCorrectionBenchmark,
} from '../src/index.js'
import { analyzeSesliTabShadow } from '../adapters/seslitab/shadowAdapter.js'

function fixtureGraph() {
  const measure = createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })
  const event = createScoreEvent({ id: 'N1', measureKey: 'P1:0', onset: 0, duration: 1, voice: 1, metadata: { stemDirection: 'down' } })
  return createScoreGraph({ sourceId: 'raw-source-1', measures: [measure], events: [event] })
}

function voicePatch() {
  return createCorrectionPatch({ eventId: 'N1', measureKey: 'P1:0', operation: PATCH_OPERATION.CHANGE_VOICE, before: 1, after: 2, confidence: 0.99, solverVersion: 'test' })
}

test('patch projection creates a new graph and leaves source unchanged', () => {
  const source = fixtureGraph()
  const projected = projectCorrectionPatches(source, [voicePatch()])
  assert.equal(projected.ok, true)
  assert.notEqual(projected.graph, source)
  assert.equal(source.events[0].voice, 1)
  assert.equal(projected.graph.events[0].voice, 2)
  assert.equal(projected.graph.sourceId, source.sourceId)
})

test('stale patch before-value fails closed', () => {
  const source = fixtureGraph()
  const stale = createCorrectionPatch({ eventId: 'N1', measureKey: 'P1:0', operation: PATCH_OPERATION.CHANGE_VOICE, before: 3, after: 2 })
  const result = projectCorrectionPatches(source, [stale])
  assert.equal(result.ok, false)
  assert.equal(result.code, 'STALE_PATCH_BEFORE_MISMATCH')
  assert.equal(result.graph, source)
})

test('projection can be reverted without mutating either graph', () => {
  const source = fixtureGraph()
  const patch = voicePatch()
  const projected = projectCorrectionPatches(source, [patch])
  const reverted = revertCorrectionPatches(projected.graph, [patch])
  assert.equal(reverted.ok, true)
  assert.equal(reverted.graph.events[0].voice, 1)
  assert.equal(projected.graph.events[0].voice, 2)
  assert.equal(source.events[0].voice, 1)
})

test('relation patch remains unsupported instead of inventing relation semantics', () => {
  const source = fixtureGraph()
  const relation = createCorrectionPatch({ eventId: 'N1', measureKey: 'P1:0', operation: PATCH_OPERATION.CHANGE_RELATION, before: null, after: { beam: 'x' } })
  const result = projectCorrectionPatches(source, [relation])
  assert.equal(result.ok, false)
  assert.equal(result.code, 'UNSUPPORTED_PATCH_OPERATION')
})

test('SesliTab adapter is shadow-only and returns the exact source graph identity', () => {
  const source = fixtureGraph()
  const result = analyzeSesliTabShadow({ scoreGraph: source, validatorFindings: [{ code: 'VOICE_OVERLAP' }], ambiguousEventIds: ['N1'], instrumentProfile: 'classical-guitar' })
  assert.equal(result.mode, 'shadow')
  assert.equal(result.sourceGraph, source)
  assert.equal('apply' in result, false)
  assert.equal(source.events[0].voice, 1)
})

test('teacher gold requires explicit approval', () => {
  assert.throws(() => createTeacherApproval({ approvalId: 'A1', approved: false }), /explicit/)
  const approval = createTeacherApproval({ approvalId: 'A1', approved: true })
  const gold = createGoldCase({ id: 'G1', input: { case: 1 }, expectedPatches: [voicePatch()], teacherApproval: approval })
  assert.equal(gold.teacherApproval.approved, true)
})

test('benchmark reports precision and coverage without claiming universal accuracy', async () => {
  const approval = createTeacherApproval({ approvalId: 'A1', approved: true })
  const expected = voicePatch()
  const gold = createGoldCase({ id: 'G1', input: { case: 1 }, expectedPatches: [expected], teacherApproval: approval })
  const report = await runCorrectionBenchmark([gold], async () => createCorrectionResult({ status: CORRECTION_STATUS.RESOLVED, proposedPatches: [expected], confidence: 0.99 }))
  assert.equal(report.total, 1)
  assert.equal(report.coverage, 1)
  assert.equal(report.precision, 1)
})
