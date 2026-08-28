import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateSelectivePrediction, selectMetricAtThreshold } from '../src/index.js'

test('selective prediction reports precision recall risk coverage and false corrections', () => {
  const report = evaluateSelectivePrediction([
    { confidence: 0.99, correct: true },
    { confidence: 0.95, correct: false },
    { confidence: 0.70, correct: true },
    { confidence: 0.20, correct: false },
  ], { thresholds: [0.99, 0.95, 0.70, 0.20] })

  const at95 = selectMetricAtThreshold(report, 0.95)
  assert.equal(at95.selected, 2)
  assert.equal(at95.coverage, 0.5)
  assert.equal(at95.precision, 0.5)
  assert.equal(at95.recall, 0.5)
  assert.equal(at95.risk, 0.5)
  assert.equal(at95.abstentionRate, 0.5)
  assert.equal(at95.falseCorrectionRate, 0.5)
  assert.equal(at95.falseCorrectionsPer1000Candidates, 250)
  assert.equal(report.riskCoverageAUC > 0, true)
})

test('higher threshold can trade coverage for precision', () => {
  const report = evaluateSelectivePrediction([
    { confidence: 0.99, correct: true },
    { confidence: 0.80, correct: true },
    { confidence: 0.60, correct: false },
  ], { thresholds: [0.99, 0.60] })
  const high = selectMetricAtThreshold(report, 0.99)
  const low = selectMetricAtThreshold(report, 0.60)
  assert.equal(high.coverage < low.coverage, true)
  assert.equal(high.precision > low.precision, true)
})

test('empty selective prediction report remains defined', () => {
  const report = evaluateSelectivePrediction([], { thresholds: [0.9] })
  assert.equal(report.candidateCount, 0)
  assert.equal(report.curve[0].coverage, 0)
  assert.equal(report.curve[0].precision, null)
  assert.equal(report.riskCoverageAUC, 0)
})
