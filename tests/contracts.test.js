import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_STATUS,
  EVIDENCE_SOURCE,
  PATCH_OPERATION,
  createCorrectionPatch,
  createCorrectionRequest,
  createCorrectionResult,
  createEvidence,
} from '../src/index.js'

test('request preserves source objects without mutation', () => {
  const structuredScore = { measures: [] }
  const request = createCorrectionRequest({ structuredScore, validatorFindings: [] })
  assert.equal(request.structuredScore, structuredScore)
  assert.equal(request.instrumentProfile, 'generic')
})

test('AMBIGUOUS requires an explicit abstain reason', () => {
  assert.throws(() => createCorrectionResult({ status: CORRECTION_STATUS.AMBIGUOUS }), /abstainReason/)
  const result = createCorrectionResult({ status: CORRECTION_STATUS.AMBIGUOUS, abstainReason: 'insufficient-evidence' })
  assert.equal(result.confidence, 0)
})

test('patch and evidence confidence are bounded', () => {
  const evidence = createEvidence({ source: EVIDENCE_SOURCE.VALIDATOR, code: 'VOICE_OVERLAP', weight: 0.8 })
  const patch = createCorrectionPatch({ eventId: 'N1', measureKey: 'P1:0', operation: PATCH_OPERATION.CHANGE_VOICE, before: 1, after: 2, evidence: [evidence], confidence: 0.9 })
  assert.equal(patch.after, 2)
  assert.throws(() => createCorrectionPatch({ eventId: 'N1', measureKey: 'P1:0', operation: PATCH_OPERATION.CHANGE_VOICE, before: 1, after: 2, confidence: 1.1 }), /confidence/)
})
