import test from 'node:test'
import assert from 'node:assert/strict'
import { createScoreEvent, describePolyphonyComplexity, polyphonyLevelLabel } from '../src/index.js'

test('complexity profile distinguishes four voices and cross-staff continuation', () => {
  const events = [
    createScoreEvent({ id: 'a', measureKey: '1', onset: 0, duration: 2, voice: 1, staff: 1, metadata: { tieStart: true } }),
    createScoreEvent({ id: 'b', measureKey: '1', onset: 0, duration: 1, voice: 2, staff: 1 }),
    createScoreEvent({ id: 'c', measureKey: '1', onset: 1, duration: 1, voice: 3, staff: 2, metadata: { tuplet: { actual: 3, normal: 2 } } }),
    createScoreEvent({ id: 'd', measureKey: '1', onset: 1, duration: 1, voice: 4, staff: 2, metadata: { grace: true } }),
    createScoreEvent({ id: 'e', measureKey: '2', onset: 0, duration: 1, voice: 1, staff: 2 }),
  ]
  const profile = describePolyphonyComplexity(events)
  assert.equal(profile.voiceCount, 4)
  assert.equal(profile.staffCount, 2)
  assert.equal(profile.crossStaffPresent, true)
  assert.equal(profile.tupletPresent, true)
  assert.equal(profile.gracePresent, true)
  assert.equal(profile.tieDensity > 0, true)
  assert.equal(profile.overlapDensity > 0, true)
  assert.equal(polyphonyLevelLabel(profile), 'voice-4-plus')
})

test('empty complexity profile remains deterministic', () => {
  const profile = describePolyphonyComplexity([])
  assert.equal(profile.voiceCount, 0)
  assert.equal(profile.simultaneousNoteDensity, 0)
  assert.equal(polyphonyLevelLabel(profile), 'voice-0')
})
