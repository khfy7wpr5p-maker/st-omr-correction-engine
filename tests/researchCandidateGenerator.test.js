import test from 'node:test'
import assert from 'node:assert/strict'
import { POLYPHONIC_ERROR_CLASS, RESEARCH_CANDIDATE_OPERATION, generateBoundedResearchCandidates } from '../src/index.js'

test('research candidate generation is bounded and never enables apply', () => {
  const result = generateBoundedResearchCandidates([
    { eventId: 'e1', errorClass: POLYPHONIC_ERROR_CLASS.DURATION, originalValue: 1, candidateValues: [0.5, 1, 1.5, 2, 3] },
  ], { maxPerEvent: 2, maxTotal: 2 })
  assert.equal(result.candidates.length, 2)
  assert.equal(result.exhausted, true)
  assert.equal(result.applyEnabled, false)
  assert.equal(result.candidates.every((candidate) => candidate.applyEnabled === false), true)
  assert.equal(result.candidates[0].operation, RESEARCH_CANDIDATE_OPERATION.CHANGE_DURATION)
})

test('unsupported classes are ignored instead of guessed', () => {
  const result = generateBoundedResearchCandidates([
    { eventId: 'p1', errorClass: POLYPHONIC_ERROR_CLASS.PITCH, originalValue: 'C4', candidateValues: ['C#4'] },
  ])
  assert.deepEqual(result.candidates, [])
})

test('tie candidates require an explicit add or remove action', () => {
  const none = generateBoundedResearchCandidates([
    { eventId: 't1', errorClass: POLYPHONIC_ERROR_CLASS.TIE, originalValue: false, candidateValues: [true] },
  ])
  assert.deepEqual(none.candidates, [])

  const add = generateBoundedResearchCandidates([
    { eventId: 't1', errorClass: POLYPHONIC_ERROR_CLASS.TIE, tieAction: 'ADD', originalValue: false, candidateValues: [true] },
  ])
  assert.equal(add.candidates[0].operation, RESEARCH_CANDIDATE_OPERATION.ADD_TIE)
})
