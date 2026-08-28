import test from 'node:test'
import assert from 'node:assert/strict'
import { CORRECTION_STATUS, createScoreEvent, generateVoiceCandidates, resolveCandidates, DEFAULT_RESOLUTION_POLICY } from '../src/index.js'

test('target voice 4 stays below the existing automatic threshold', () => {
  const beamGroup = 'voice4-line'
  const target = createScoreEvent({ id: 'target', measureKey: '7', onset: 2, duration: 0.5, voice: 1, staff: 1, metadata: { beamGroup } })
  const peer = createScoreEvent({ id: 'peer', measureKey: '7', onset: 1.5, duration: 0.5, voice: 4, staff: 1, metadata: { beamGroup } })
  const generated = generateVoiceCandidates({
    events: [target, peer],
    ambiguousEventIds: ['target'],
    instrumentProfile: 'classical-guitar',
    validatorFindings: [{ code: 'VOICE_ASSIGNMENT_SUSPECT' }],
  })
  const voice4 = generated.candidates.find((candidate) => candidate.patches[0].after === 4)
  assert.equal(voice4.confidence, 0.7)
  assert.equal(DEFAULT_RESOLUTION_POLICY.minConfidence, 0.9)
  const result = resolveCandidates(generated.candidates)
  assert.equal(result.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(result.abstainReason, 'confidence-below-threshold')
})
