import test from 'node:test'
import assert from 'node:assert/strict'
import { createScoreEvent, detectTieAnomalies } from '../src/index.js'

test('tie detector accepts paired same-pitch same-voice ties', () => {
  const result = detectTieAnomalies([
    createScoreEvent({ id: 'a', measureKey: '1', onset: 3, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: { tieStart: true } }),
    createScoreEvent({ id: 'b', measureKey: '2', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: { tieStop: true } }),
  ])
  assert.deepEqual(result.findings, [])
  assert.deepEqual(result.proposedPatches, [])
})

test('tie detector flags missing stop and ignores slur metadata', () => {
  const result = detectTieAnomalies([
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: { tieStart: true, slurStart: true } }),
    createScoreEvent({ id: 'b', measureKey: '1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: { slurStop: true } }),
  ])
  assert.equal(result.findings[0].code, 'TIE_STOP_MISSING')
  assert.equal(result.mode, 'RESEARCH_ONLY')
})
