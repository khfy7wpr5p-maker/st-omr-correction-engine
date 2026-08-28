import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classicalGuitarProfile,
  createScoreEvent,
  generateVoiceCandidates,
  pianoProfile,
} from '../src/index.js'

test('instrument profiles never equate voice or hand with staff', () => {
  assert.equal(classicalGuitarProfile.voiceEqualsStaff, false)
  assert.equal(pianoProfile.voiceEqualsStaff, false)
  assert.equal(pianoProfile.handEqualsStaff, false)
  assert.equal(pianoProfile.allowCrossStaffVoice, true)
})

test('voice solver only varies explicitly ambiguous events and does not mutate input', () => {
  const event = createScoreEvent({ id: 'N1', measureKey: 'P1:0', onset: 0, duration: 1, voice: 1, metadata: { stemDirection: 'down' } })
  const fixed = createScoreEvent({ id: 'N2', measureKey: 'P1:0', onset: 1, duration: 1, voice: 1, metadata: { stemDirection: 'up' } })
  const before = JSON.stringify([event, fixed])
  const result = generateVoiceCandidates({ events: [event, fixed], ambiguousEventIds: ['N1'], instrumentProfile: 'classical-guitar', validatorFindings: [{ code: 'VOICE_OVERLAP' }] })
  assert.equal(result.candidates.some((candidate) => candidate.patches[0].after === 2), true)
  assert.equal(JSON.stringify([event, fixed]), before)
  assert.equal(result.candidates.every((candidate) => candidate.patches[0].eventId === 'N1'), true)
})

test('voice solver fails closed on ambiguous-event limit', () => {
  const events = Array.from({ length: 7 }, (_, index) => createScoreEvent({ id: `N${index}`, measureKey: 'P1:0', onset: index, duration: 0.5, voice: 1 }))
  const result = generateVoiceCandidates({ events, ambiguousEventIds: events.map((event) => event.id) })
  assert.equal(result.exhausted, true)
  assert.equal(result.candidates.length, 0)
})
