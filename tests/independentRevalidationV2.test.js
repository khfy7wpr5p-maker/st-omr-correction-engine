import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PATCH_OPERATION,
  createCorrectionPatch,
  createMeasure,
  createScoreEvent,
  createScoreGraph,
  projectCorrectionPatches,
  revalidateProjectedRevisionV2,
} from '../src/index.js'

function sourceGraph() {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  return createScoreGraph({
    sourceId: 'source-1',
    measures: [measure],
    events: [
      createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 'C4' }),
      createScoreEvent({ id: 'b', measureKey: '1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: 'D4' }),
    ],
  })
}

function voicePatch(after = 2) {
  return createCorrectionPatch({
    eventId: 'a',
    measureKey: '1',
    operation: PATCH_OPERATION.CHANGE_VOICE,
    before: 1,
    after,
    confidence: 0.99,
    solverVersion: 'test',
  })
}

test('independent validator accepts a bounded reversible projection without reusing the solver', () => {
  const source = sourceGraph()
  const patch = voicePatch()
  const projected = projectCorrectionPatches(source, [patch])
  assert.equal(projected.ok, true)

  const result = revalidateProjectedRevisionV2({ sourceGraph: source, projectedGraph: projected.graph, patches: [patch] })
  assert.equal(result.decision, 'PASS')
  assert.equal(result.solverReused, false)
  assert.deepEqual(result.findings, [])
  assert.equal(source.events[0].voice, 1)
})

test('independent validator detects an unintended event-field change', () => {
  const source = sourceGraph()
  const patch = voicePatch()
  const altered = createScoreGraph({
    sourceId: source.sourceId,
    measures: source.measures,
    events: [
      createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 1, voice: 2, staff: 1, pitch: 'C#4' }),
      source.events[1],
    ],
  })

  const result = revalidateProjectedRevisionV2({ sourceGraph: source, projectedGraph: altered, patches: [patch] })
  assert.equal(result.decision, 'FAIL')
  assert.equal(result.findings.some((item) => item.code === 'UNINTENDED_EVENT_CHANGE' && item.field === 'pitch'), true)
})

test('independent validator detects a new same-voice overlap after projection', () => {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  const source = createScoreGraph({
    sourceId: 'source-overlap',
    measures: [measure],
    events: [
      createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 2, voice: 1, staff: 1 }),
      createScoreEvent({ id: 'b', measureKey: '1', onset: 1, duration: 1, voice: 2, staff: 1 }),
    ],
  })
  const patch = createCorrectionPatch({
    eventId: 'b', measureKey: '1', operation: PATCH_OPERATION.CHANGE_VOICE,
    before: 2, after: 1, confidence: 0.99, solverVersion: 'test',
  })
  const projected = projectCorrectionPatches(source, [patch])
  assert.equal(projected.ok, true)

  const result = revalidateProjectedRevisionV2({ sourceGraph: source, projectedGraph: projected.graph, patches: [patch] })
  assert.equal(result.decision, 'FAIL')
  assert.equal(result.findings.some((item) => item.code === 'INDEPENDENT_VOICE_OVERLAP'), true)
})
