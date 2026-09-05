import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PATCH_OPERATION,
  analyzeOmrCorrections,
  createMeasure,
  createScoreEvent,
  createScoreGraph,
  detectTieAnomalies,
  projectCorrectionPatches,
  revalidateProjectedRevisionV2,
  revertCorrectionPatches,
} from '../src/index.js'

function measure() {
  return createMeasure({ key: 'm1', beats: 4, beatType: 4 })
}

function graphWith(events) {
  return createScoreGraph({ sourceId: 'omr-e2e-test', measures: [measure()], events })
}

test('end-to-end analyzer emits bounded shadow proposals for pitch, duration, onset and staff mismatches', () => {
  const event = createScoreEvent({
    id: 'n1', measureKey: 'm1', onset: 0.5, duration: 2, voice: 1, staff: 2, pitch: 61,
    metadata: Object.freeze({ expectedPitch: 60, expectedDurationQuarterBeats: 1, expectedOnsetQuarterBeats: 0, expectedStaff: 1 }),
  })
  const source = graphWith([event])
  const result = analyzeOmrCorrections({ scoreGraph: source })
  const operations = new Set(result.suggestions.map((suggestion) => suggestion.operation))

  assert.equal(result.mode, 'SHADOW_ONLY')
  assert.equal(result.applyEnabled, false)
  assert.equal(result.sourceGraph, source)
  assert.equal(result.sourceGraphMutated, false)
  assert.equal(operations.has(PATCH_OPERATION.CHANGE_PITCH), true)
  assert.equal(operations.has(PATCH_OPERATION.CHANGE_DURATION), true)
  assert.equal(operations.has(PATCH_OPERATION.CHANGE_ONSET), true)
  assert.equal(operations.has(PATCH_OPERATION.CHANGE_STAFF), true)
  assert.equal(result.suggestions.every((suggestion) => suggestion.applyEnabled === false), true)
  assert.equal(result.suggestions.every((suggestion) => suggestion.automationEligible === false), true)
})

test('all deterministic structural proposals can be projected, independently revalidated and reverted without source mutation', () => {
  const source = graphWith([createScoreEvent({
    id: 'n1', measureKey: 'm1', onset: 0.5, duration: 2, voice: 1, staff: 2, pitch: 61,
    metadata: Object.freeze({ expectedPitch: 60, expectedDurationQuarterBeats: 1, expectedOnsetQuarterBeats: 0, expectedStaff: 1 }),
  })])
  const analyzed = analyzeOmrCorrections({ scoreGraph: source })
  const patches = analyzed.suggestions.filter((suggestion) => suggestion.errorClass !== 'VOICE').flatMap((suggestion) => suggestion.proposedPatches)
  const projected = projectCorrectionPatches(source, patches)

  assert.equal(projected.ok, true)
  assert.notEqual(projected.graph, source)
  assert.equal(source.events[0].pitch, 61)
  assert.equal(source.events[0].onset, 0.5)
  assert.equal(source.events[0].duration, 2)
  assert.equal(source.events[0].staff, 2)
  assert.equal(projected.graph.events[0].pitch, 60)
  assert.equal(projected.graph.events[0].onset, 0)
  assert.equal(projected.graph.events[0].duration, 1)
  assert.equal(projected.graph.events[0].staff, 1)

  const revalidated = revalidateProjectedRevisionV2({ sourceGraph: source, projectedGraph: projected.graph, patches })
  assert.equal(revalidated.decision, 'PASS')
  const reverted = revertCorrectionPatches(projected.graph, patches)
  assert.equal(reverted.ok, true)
  assert.deepEqual(reverted.graph, source)
})

test('tie detector reads Audiveris importer tieTypes and proposes the uniquely missing counterpart', () => {
  const start = createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: Object.freeze({ sourceOrder: 1, tieTypes: Object.freeze(['start']) }) })
  const target = createScoreEvent({ id: 'n2', measureKey: 'm1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: Object.freeze({ sourceOrder: 2 }) })
  const source = graphWith([start, target])

  const tie = detectTieAnomalies(source.events)
  assert.deepEqual(tie.findings, [{ code: 'TIE_STOP_MISSING', eventId: 'n1', targetEventId: 'n2' }])

  const analyzed = analyzeOmrCorrections({ scoreGraph: source })
  const suggestion = analyzed.suggestions.find((item) => item.errorClass === 'TIE')
  assert.ok(suggestion)
  assert.equal(suggestion.operation, PATCH_OPERATION.CHANGE_TIE)
  assert.equal(suggestion.eventId, 'n2')
  assert.equal(suggestion.before, null)
  assert.deepEqual(suggestion.after, ['stop'])

  const projected = projectCorrectionPatches(source, suggestion.proposedPatches)
  assert.equal(projected.ok, true)
  assert.deepEqual(detectTieAnomalies(projected.graph.events).findings, [])

  const revalidated = revalidateProjectedRevisionV2({ sourceGraph: source, projectedGraph: projected.graph, patches: suggestion.proposedPatches })
  assert.equal(revalidated.decision, 'PASS')
  const reverted = revertCorrectionPatches(projected.graph, suggestion.proposedPatches)
  assert.equal(reverted.ok, true)
  assert.deepEqual(reverted.graph, source)
})

test('tie anomalies abstain instead of guessing when no unique counterpart exists', () => {
  const source = graphWith([createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: Object.freeze({ tieTypes: Object.freeze(['start']) }) })])
  const analyzed = analyzeOmrCorrections({ scoreGraph: source })
  assert.equal(analyzed.suggestions.some((item) => item.errorClass === 'TIE'), false)
  assert.equal(analyzed.abstentions.some((item) => item.errorClass === 'TIE'), true)
})
