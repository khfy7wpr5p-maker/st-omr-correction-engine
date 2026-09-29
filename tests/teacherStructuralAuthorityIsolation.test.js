import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as api from '../src/index.js'

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('teacher structural modules remain isolated from automatic correction authority', () => {
  const structuralPaths = [
    'src/correction/teacherStructuralProjection.js',
    'src/validation/teacherStructuralRevalidation.js',
    'adapters/seslitab/teacherStructuralEditAdapter.js',
  ]
  for (const path of structuralPaths) {
    const content = read(path)
    assert.equal(content.includes('/resolver/'), false, path)
    assert.equal(content.includes('/candidates/'), false, path)
    assert.equal(content.includes('/readiness/'), false, path)
    assert.equal(content.includes('applyControlledVoiceCorrection'), false, path)
    assert.equal(content.includes('fetch('), false, path)
  }

  const correctionPatch = read('src/contracts/correctionPatch.js')
  for (const operation of ['INSERT_EVENT', 'REMOVE_EVENT', 'CHANGE_MEASURE_METER']) {
    assert.equal(correctionPatch.includes(operation), false)
  }

  const controlled = read('src/correction/controlledAutoCorrection.js')
  assert.equal(controlled.includes('teacherStructural'), false)
})

test('package dependencies remain unchanged and no new runtime authority is introduced', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.deepEqual(pkg.dependencies, { '@tonejs/midi': '2.0.28' })
})

test('E11A policy remains exactly the existing one-patch voice-only automatic slice', () => {
  assert.equal(api.E11A_CONTROLLED_POLICY.minConfidence, 0.9)
  assert.equal(api.E11A_CONTROLLED_POLICY.minIndependentEvidenceSources, 2)
  assert.equal(api.E11A_CONTROLLED_POLICY.maxPatches, 1)
  assert.deepEqual(api.E11A_CONTROLLED_POLICY.allowedOperations, [api.PATCH_OPERATION.CHANGE_VOICE])
})

test('teacher structural patch set cannot become an E11A automatic correction result', async () => {
  const source = api.createScoreGraph({
    sourceId: 'authority-source',
    measures: [api.createMeasure({ key: 'm1', beats: 4, beatType: 4 })],
    events: [api.createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60 })],
  })
  const patch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5,
  })
  const patchSet = api.createTeacherStructuralPatchSet({
    patchSetId: 'authority-set',
    baseSourceId: source.sourceId,
    baseGraphFingerprint: api.fingerprintScoreGraph(source),
    authorization: api.createTeacherEditAuthorization({ actionId: 'teacher-authority-action' }),
    patches: [patch],
  })

  const outcome = await api.applyControlledVoiceCorrection({
    scoreGraph: source,
    correctionResult: patchSet,
    revalidate: () => ({ decision: api.CONTROLLED_CORRECTION_DECISION.ACCEPT }),
  })

  assert.equal(outcome.applied, false)
  assert.equal(outcome.graph, source)
  assert.equal(outcome.code, 'CORRECTION_NOT_RESOLVED')
})
