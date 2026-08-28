import test from 'node:test'
import assert from 'node:assert/strict'
import { CORRECTION_STATUS, createScoreEvent, generateVoiceCandidates, resolveCandidates, DEFAULT_RESOLUTION_POLICY } from '../src/index.js'

test('target voice 3 stays below the existing automatic threshold', () => {
  const beamGroup = 'voice3-line'
  const target = createScoreEvent({ id: 'target', measureKey: '1', onset: 1, duration: 0.5, voice: 1, staff: 1, metadata: { beamGroup } })
  const peer = createScoreEvent({ id: 'peer', measureKey: '1', onset: 0.5, duration: 0.5, voice: 3, staff: 1, metadata: { beamGroup } })
  const generated = generateVoiceCandidates({
    events: [target, peer],
    ambiguousEventIds: ['target'],
    instrumentProfile: 'classical-guitar',
    validatorFindings: [{ code: 'VOICE_ASSIGNMENT_SUSPECT' }],
  })
  const voice3 = generated.candidates.find((candidate) => candidate.patches[0].after === 3)
  assert.equal(voice3.confidence, 0.7)
  assert.equal(DEFAULT_RESOLUTION_POLICY.minConfidence, 0.9)
  const result = resolveCandidates(generated.candidates)
  assert.equal(result.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(result.abstainReason, 'confidence-below-threshold')
})
