import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_STATUS,
  EVIDENCE_SOURCE,
  buildCandidateGraph,
  createCandidate,
  createEvidence,
  createMeasure,
  createScoreEvent,
  createScoreGraph,
  evaluateMeterConstraint,
  evaluateOnsetConstraint,
  resolveCandidates,
} from '../src/index.js'

test('score graph requires stable unique identities', () => {
  const measure = createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })
  const event = createScoreEvent({ id: 'N1', measureKey: 'P1:0', onset: 0, duration: 1 })
  const graph = createScoreGraph({ measures: [measure], events: [event] })
  assert.equal(graph.events[0].end, 1)
  assert.throws(() => createScoreGraph({ measures: [measure], events: [event, event] }), /unique/)
})

test('candidate graph stops at explicit bounds', () => {
  const graph = buildCandidateGraph(0, (value) => [value + 1, value + 2], { maxCandidates: 5, maxDepth: 10, maxOperations: 10 })
  assert.equal(graph.nodes.length <= 5, true)
  assert.equal(graph.exhausted, true)
})

test('meter and onset constraints detect overrun without proposing a repair', () => {
  const measure = createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })
  const events = [
    createScoreEvent({ id: 'N1', measureKey: 'P1:0', onset: 0, duration: 4, voice: 1 }),
    createScoreEvent({ id: 'N2', measureKey: 'P1:0', onset: 4, duration: 1, voice: 1 }),
  ]
  assert.equal(evaluateMeterConstraint(measure, events).hardFailure, true)
  assert.equal(evaluateOnsetConstraint(measure, events).hardFailure, true)
})

test('resolver refuses meter-only evidence', () => {
  const validator = createEvidence({ source: EVIDENCE_SOURCE.VALIDATOR, code: 'METER_DURATION', weight: 1 })
  const candidate = createCandidate({ id: 'A', confidence: 0.99, evidence: [validator] })
  const result = resolveCandidates([candidate])
  assert.equal(result.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(result.abstainReason, 'insufficient-independent-evidence')
})

test('resolver accepts only a clear candidate with independent evidence', () => {
  const validator = createEvidence({ source: EVIDENCE_SOURCE.VALIDATOR, code: 'VOICE_OVERLAP', weight: 1 })
  const symbolic = createEvidence({ source: EVIDENCE_SOURCE.SYMBOLIC, code: 'STEM_DIRECTION', weight: 0.9 })
  const winner = createCandidate({ id: 'A', confidence: 0.97, evidence: [validator, symbolic] })
  const runner = createCandidate({ id: 'B', confidence: 0.75, evidence: [validator, symbolic] })
  const result = resolveCandidates([runner, winner])
  assert.equal(result.status, CORRECTION_STATUS.RESOLVED)
  assert.equal(result.confidence, 0.97)
})
