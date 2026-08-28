import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_STATUS,
  createScoreEvent,
  generateVoiceCandidates,
  getInstrumentProfile,
  resolveCandidates,
  scoreVoiceAssignment,
} from '../src/index.js'

function makeEvent(id, overrides = {}) {
  return createScoreEvent({
    id,
    measureKey: '1',
    onset: 0,
    duration: 1,
    voice: 1,
    staff: 1,
    pitch: 60,
    metadata: {},
    ...overrides,
  })
}

test('same-staff temporal adjacency contributes explicit bounded voice evidence', () => {
  const event = makeEvent('event', { metadata: { stemDirection: 'down', beamGroup: 'line' } })
  const peer = makeEvent('peer', { onset: 1, voice: 2, pitch: 64, metadata: { stemDirection: 'down', beamGroup: 'line' } })
  const scored = scoreVoiceAssignment(event, 2, [event, peer], getInstrumentProfile('piano'))
  const codes = new Set(scored.evidence.map((item) => item.code))

  assert.equal(scored.score, 0.9)
  assert.equal(codes.has('STEM_DIRECTION_PRIOR'), true)
  assert.equal(codes.has('BEAM_VOICE_CONTINUITY'), true)
  assert.equal(codes.has('SAME_STAFF_TEMPORAL_VOICE_CONTINUITY'), true)
  assert.deepEqual(scored.hardViolations, [])
})

test('strong symbolic evidence still cannot resolve without an independent evidence class', () => {
  const event = makeEvent('event', { metadata: { stemDirection: 'down', beamGroup: 'line' } })
  const peer = makeEvent('peer', { onset: 1, voice: 2, pitch: 64, metadata: { stemDirection: 'down', beamGroup: 'line' } })
  const generated = generateVoiceCandidates({ events: [event, peer], ambiguousEventIds: ['event'], instrumentProfile: 'piano', validatorFindings: [] })
  const result = resolveCandidates(generated.candidates)

  assert.equal(result.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(result.abstainReason, 'insufficient-independent-evidence')
})

test('temporal continuity never overrides a real same-voice overlap violation', () => {
  const event = makeEvent('event')
  const overlapPeer = makeEvent('overlap-peer', { onset: 0.5, duration: 1, voice: 2, pitch: 64 })
  const scored = scoreVoiceAssignment(event, 2, [event, overlapPeer], getInstrumentProfile('piano'))

  assert.equal(scored.hardViolations.includes('VOICE_OVERLAP'), true)
  assert.equal(scored.evidence.some((item) => item.code === 'SAME_STAFF_TEMPORAL_VOICE_CONTINUITY'), false)
})
