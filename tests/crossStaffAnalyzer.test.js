import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCrossStaffContext, createScoreEvent } from '../src/index.js'

test('cross-staff analyzer keeps voice identity separate from staff identity', () => {
  const events = [
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 0.5, voice: 1, staff: 1, metadata: { beamGroup: 'g' } }),
    createScoreEvent({ id: 'b', measureKey: '1', onset: 0.5, duration: 0.5, voice: 1, staff: 2, metadata: { beamGroup: 'g' } }),
    createScoreEvent({ id: 'c', measureKey: '1', onset: 0, duration: 1, voice: 2, staff: 2 }),
  ]
  const result = analyzeCrossStaffContext(events)
  assert.equal(result.mode, 'RESEARCH_ONLY')
  assert.equal(result.crossStaffPresent, true)
  assert.deepEqual(result.voiceTransitions[0], { voice: 1, staffs: [1, 2] })
  assert.deepEqual(result.crossStaffBeamGroups[0], { beamGroup: 'g', staffs: [1, 2] })
  assert.deepEqual(result.proposedPatches, [])
})

test('same voice on one staff is not labeled cross-staff', () => {
  const result = analyzeCrossStaffContext([
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 1, voice: 1, staff: 1 }),
    createScoreEvent({ id: 'b', measureKey: '1', onset: 1, duration: 1, voice: 1, staff: 1 }),
  ])
  assert.equal(result.crossStaffPresent, false)
})
