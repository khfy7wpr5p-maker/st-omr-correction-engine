import test from 'node:test'
import assert from 'node:assert/strict'
import { createExternalBenchmarkManifest, evaluateExternalBenchmarkEligibility } from '../src/index.js'

const checksum = 'a'.repeat(64)

test('verified evaluation-only data can be benchmarked without becoming training or redistributable data', () => {
  const manifest = createExternalBenchmarkManifest({
    dataset: 'Example Evaluation Set',
    source: 'https://example.invalid/dataset',
    version: '1.0',
    license: 'evaluation-only',
    licenseVerified: true,
    redistribution: false,
    commercialUse: false,
    trainingAllowed: false,
    evaluationAllowed: true,
    checksum,
  })
  const result = evaluateExternalBenchmarkEligibility(manifest)
  assert.equal(result.eligibleForEvaluation, true)
  assert.equal(result.eligibleForRepositoryCopy, false)
  assert.equal(result.eligibleForTraining, false)
})

test('uncertain license state fails closed', () => {
  const manifest = createExternalBenchmarkManifest({
    dataset: 'Unverified Set', source: 'source', version: '1', license: 'unknown',
    licenseVerified: false, redistribution: false, commercialUse: false,
    trainingAllowed: false, evaluationAllowed: true, checksum,
  })
  const result = evaluateExternalBenchmarkEligibility(manifest)
  assert.equal(result.eligibleForEvaluation, false)
  assert.equal(result.blockers.includes('LICENSE_NOT_VERIFIED'), true)
})

test('evaluation permission is independent from training permission', () => {
  const manifest = createExternalBenchmarkManifest({
    dataset: 'No Eval Set', source: 'source', version: '1', license: 'verified',
    licenseVerified: true, redistribution: true, commercialUse: true,
    trainingAllowed: true, evaluationAllowed: false, checksum,
  })
  const result = evaluateExternalBenchmarkEligibility(manifest)
  assert.equal(result.eligibleForEvaluation, false)
  assert.equal(result.eligibleForTraining, false)
  assert.equal(result.blockers.includes('EVALUATION_NOT_ALLOWED'), true)
})
