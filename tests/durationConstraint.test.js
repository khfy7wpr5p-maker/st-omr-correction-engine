import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, detectDurationAnomalies } from '../src/index.js'

test('duration detector reports measure overrun without proposing a repair', () => {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  const result = detectDurationAnomalies([measure], [
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 5, voice: 1, staff: 1 }),
  ])
  assert.equal(result.findings.some((item) => item.code === 'VOICE_DURATION_EXCEEDS_MEASURE'), true)
  assert.deepEqual(result.proposedPatches, [])
})

test('zero duration is only tolerated for explicit grace metadata', () => {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  const result = detectDurationAnomalies([measure], [
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 0, voice: 1, staff: 1 }),
    createScoreEvent({ id: 'g', measureKey: '1', onset: 1, duration: 0, voice: 1, staff: 1, metadata: { grace: true } }),
  ])
  assert.equal(result.findings.filter((item) => item.code === 'ZERO_DURATION_NON_GRACE').length, 1)
  assert.equal(result.findings[0].eventId, 'a')
})
