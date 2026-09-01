import test from 'node:test'
import assert from 'node:assert/strict'
import { MIDI_CORPUS_REQUIRED_SCENARIOS, evaluateMidiCorpusCoverage } from '../src/index.js'

test('coverage gate fails closed when required MIDI scenarios are missing', () => {
  const report = evaluateMidiCorpusCoverage([{ id: 'basic', scenarios: ['POLYPHONY', 'MISSING_NOTE'] }])
  assert.equal(report.gatePassed, false)
  assert.equal(report.coveredScenarioCount, 2)
  assert.equal(report.missing.includes('WRONG_PIECE_NEGATIVE_CONTROL'), true)
})

test('coverage gate passes when every required scenario is represented', () => {
  const report = evaluateMidiCorpusCoverage(MIDI_CORPUS_REQUIRED_SCENARIOS.map((scenario, index) => ({ id: `case-${index}`, scenarios: [scenario] })))
  assert.equal(report.gatePassed, true)
  assert.equal(report.coverage, 1)
  assert.deepEqual(report.missing, [])
})
