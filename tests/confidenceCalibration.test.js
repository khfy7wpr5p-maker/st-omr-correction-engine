import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CALIBRATION_METHOD,
  compareCalibrationTransform,
  evaluateConfidenceCalibration,
} from '../src/index.js'

test('calibration diagnostics report Brier ECE and reliability bins', () => {
  const report = evaluateConfidenceCalibration([
    { confidence: 0.9, correct: true },
    { confidence: 0.8, correct: true },
    { confidence: 0.8, correct: false },
    { confidence: 0.1, correct: false },
  ], { binCount: 5 })
  assert.equal(report.sampleCount, 4)
  assert.equal(report.brierScore > 0, true)
  assert.equal(report.expectedCalibrationError >= 0, true)
  assert.equal(report.reliabilityBins.length, 5)
})

test('experimental calibration transforms remain research-only', () => {
  const records = [
    { confidence: 0.9, correct: true },
    { confidence: 0.7, correct: false },
  ]
  const comparison = compareCalibrationTransform(records, {
    method: CALIBRATION_METHOD.ISOTONIC,
    transform: (confidence) => confidence >= 0.8 ? 1 : 0,
    binCount: 5,
  })
  assert.equal(comparison.mode, 'RESEARCH_ONLY')
  assert.equal(comparison.method, 'ISOTONIC')
  assert.equal(comparison.after.brierScore <= comparison.before.brierScore, true)
})

test('calibration transform cannot emit invalid confidence', () => {
  assert.throws(() => compareCalibrationTransform([
    { confidence: 0.5, correct: true },
  ], { method: CALIBRATION_METHOD.PLATT, transform: () => 1.2 }), /between 0 and 1/)
})
