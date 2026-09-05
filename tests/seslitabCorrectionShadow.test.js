import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PATCH_OPERATION,
  analyzeSesliTabCorrectionShadow,
  createMeasure,
  createScoreEvent,
  createScoreGraph,
} from '../src/index.js'

test('expanded SesliTab shadow entrypoint exposes structural proposals without write-back authority', () => {
  const scoreGraph = createScoreGraph({
    sourceId: 'seslitab-expanded-shadow',
    measures: [createMeasure({ key: 'm1', beats: 4, beatType: 4 })],
    events: [createScoreEvent({
      id: 'n1',
      measureKey: 'm1',
      onset: 0,
      duration: 1,
      voice: 1,
      staff: 1,
      pitch: 61,
      metadata: Object.freeze({ expectedPitch: 60 }),
    })],
  })

  const result = analyzeSesliTabCorrectionShadow({ scoreGraph })
  const pitch = result.suggestions.find((suggestion) => suggestion.operation === PATCH_OPERATION.CHANGE_PITCH)

  assert.equal(result.mode, 'SHADOW_ONLY')
  assert.equal(result.sourceGraph, scoreGraph)
  assert.equal(result.sourceGraphMutated, false)
  assert.equal(result.applyEnabled, false)
  assert.ok(pitch)
  assert.equal(pitch.before, 61)
  assert.equal(pitch.after, 60)
  assert.equal(pitch.applyEnabled, false)
})
