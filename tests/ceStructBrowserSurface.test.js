import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

const entryUrl = new URL('../browser/ceStructBrowserEntry.js', import.meta.url)

test('CE-STRUCT browser entry exists', () => {
  assert.equal(existsSync(entryUrl), true)
})

test('CE-STRUCT browser entry exposes only the approved bounded surface', async () => {
  assert.equal(existsSync(entryUrl), true)
  const runtime = await import(entryUrl)

  assert.deepEqual(
    Object.keys(runtime).sort(),
    [
      'contract',
      'contractVersion',
      'createMeasure',
      'createScoreEvent',
      'createScoreGraph',
      'createTeacherEditAuthorization',
      'createTeacherStructuralPatch',
      'createTeacherStructuralPatchSet',
      'fingerprintScoreGraph',
      'patchSchemaVersion',
      'processSesliTabTeacherStructuralEdit',
      'runtimeVersion',
    ].sort(),
  )

  assert.equal(runtime.contract, 'ST_OMR_CORRECTION_ENGINE_CE_STRUCT_BROWSER')
  assert.equal(runtime.contractVersion, '1.0.0')
  assert.equal(runtime.runtimeVersion, '1.0.0')
  assert.equal(runtime.patchSchemaVersion, 'teacher-structural-patch-set-v1')

  for (const forbidden of [
    'applyControlledCorrection',
    'resolveCandidate',
    'createReadinessGate',
    'approveRevision',
    'shareWithStudent',
    'writeMusicXml',
    'persist',
  ]) {
    assert.equal(Object.hasOwn(runtime, forbidden), false)
  }
})
