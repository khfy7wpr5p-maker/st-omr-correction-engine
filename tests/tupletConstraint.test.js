import test from 'node:test'
import assert from 'node:assert/strict'
import { createScoreEvent, detectTupletAnomalies } from '../src/index.js'

test('balanced tuplet group with valid ratio has no anomaly', () => {
  const result = detectTupletAnomalies([
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 1 / 3, metadata: { tuplet: { actual: 3, normal: 2, groupId: 't1', start: true } } }),
    createScoreEvent({ id: 'b', measureKey: '1', onset: 1 / 3, duration: 1 / 3, metadata: { tuplet: { actual: 3, normal: 2, groupId: 't1' } } }),
    createScoreEvent({ id: 'c', measureKey: '1', onset: 2 / 3, duration: 1 / 3, metadata: { tuplet: { actual: 3, normal: 2, groupId: 't1', stop: true } } }),
  ])
  assert.deepEqual(result.findings, [])
  assert.deepEqual(result.proposedPatches, [])
})

test('invalid and nested tuplets fail closed as research findings', () => {
  const result = detectTupletAnomalies([
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 0.5, metadata: { tuplet: { actual: 0, normal: 2, groupId: 'bad', start: true, depth: 2 } } }),
  ])
  assert.equal(result.findings.some((item) => item.code === 'TUPLET_RATIO_INVALID'), true)
  assert.equal(result.findings.some((item) => item.code === 'NESTED_TUPLET_UNSUPPORTED'), true)
  assert.equal(result.findings.some((item) => item.code === 'TUPLET_GROUP_UNBALANCED'), true)
  assert.equal(result.mode, 'RESEARCH_ONLY')
})
