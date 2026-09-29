import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../src/index.js'

function requireFn(name) {
  assert.equal(typeof api[name], 'function', `${name} must be exported`)
  return api[name]
}

test('teacher structural contract exports exactly the approved operation vocabulary', () => {
  assert.ok(api.TEACHER_STRUCTURAL_OPERATION, 'TEACHER_STRUCTURAL_OPERATION must be exported')
  assert.deepEqual(Object.values(api.TEACHER_STRUCTURAL_OPERATION), [
    'INSERT_EVENT',
    'REMOVE_EVENT',
    'CHANGE_EVENT_DURATION',
    'CHANGE_EVENT_VOICE',
    'CHANGE_EVENT_STAFF',
    'CHANGE_EVENT_TIE',
    'CHANGE_MEASURE_METER',
  ])
  assert.equal(api.TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION, 'teacher-structural-patch-set-v1')
})

test('teacher edit authorization requires a non-empty host action id', () => {
  const createTeacherEditAuthorization = requireFn('createTeacherEditAuthorization')
  assert.throws(() => createTeacherEditAuthorization({ actionId: '' }), /actionId/)
  const authorization = createTeacherEditAuthorization({ actionId: 'teacher-action-1' })
  assert.deepEqual(authorization, { mode: 'EXPLICIT_TEACHER_EDIT', actionId: 'teacher-action-1' })
  assert.equal(Object.isFrozen(authorization), true)
})

test('teacher structural patch set requires exact revision identity and explicit authorization', () => {
  const createTeacherEditAuthorization = requireFn('createTeacherEditAuthorization')
  const createTeacherStructuralPatch = requireFn('createTeacherStructuralPatch')
  const createTeacherStructuralPatchSet = requireFn('createTeacherStructuralPatchSet')
  const authorization = createTeacherEditAuthorization({ actionId: 'teacher-action-1' })
  const patch = createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1',
    eventId: 'n1',
    before: 1,
    after: 0.5,
  })
  const fingerprint = 'a'.repeat(64)

  assert.throws(() => createTeacherStructuralPatchSet({
    patchSetId: 'ps1', baseSourceId: 'source-1', baseGraphFingerprint: fingerprint, patches: [patch],
  }), /authorization/)
  assert.throws(() => createTeacherStructuralPatchSet({
    patchSetId: '', baseSourceId: 'source-1', baseGraphFingerprint: fingerprint, authorization, patches: [patch],
  }), /patchSetId/)
  assert.throws(() => createTeacherStructuralPatchSet({
    patchSetId: 'ps1', baseSourceId: '', baseGraphFingerprint: fingerprint, authorization, patches: [patch],
  }), /baseSourceId/)
  assert.throws(() => createTeacherStructuralPatchSet({
    patchSetId: 'ps1', baseSourceId: 'source-1', baseGraphFingerprint: 'ABC', authorization, patches: [patch],
  }), /baseGraphFingerprint/)
  assert.throws(() => createTeacherStructuralPatchSet({
    patchSetId: 'ps1', baseSourceId: 'source-1', baseGraphFingerprint: fingerprint, authorization, patches: [],
  }), /patches/)

  const set = createTeacherStructuralPatchSet({
    patchSetId: 'ps1', baseSourceId: 'source-1', baseGraphFingerprint: fingerprint, authorization, patches: [patch],
  })
  assert.equal(set.automaticApplyAuthority, false)
  assert.equal(set.finalTeacherApproval, false)
  assert.equal(set.studentShareEligible, false)
  assert.equal(Object.isFrozen(set), true)
  assert.equal(Object.isFrozen(set.patches), true)
  assert.equal(Object.isFrozen(set.patches[0]), true)
})

test('teacher structural patch validates operation-specific shapes', () => {
  const createTeacherStructuralPatch = requireFn('createTeacherStructuralPatch')
  const op = api.TEACHER_STRUCTURAL_OPERATION

  assert.throws(() => createTeacherStructuralPatch({
    operation: 'ADD_ANYTHING', measureKey: 'm1', eventId: 'n1', before: null, after: {},
  }), /operation/)

  assert.throws(() => createTeacherStructuralPatch({
    operation: op.INSERT_EVENT, measureKey: 'm1', eventId: 'n1', before: {}, after: {},
  }), /before/)
  assert.throws(() => createTeacherStructuralPatch({
    operation: op.REMOVE_EVENT, measureKey: 'm1', eventId: 'n1', before: {}, after: {},
  }), /after/)
  assert.throws(() => createTeacherStructuralPatch({
    operation: op.CHANGE_EVENT_DURATION, measureKey: 'm1', before: 1, after: 2,
  }), /eventId/)
  assert.throws(() => createTeacherStructuralPatch({
    operation: op.CHANGE_MEASURE_METER, measureKey: 'm1', eventId: 'n1',
    before: { beats: 4, beatType: 4, implicit: false, pickup: false },
    after: { beats: 3, beatType: 4, implicit: false, pickup: false },
  }), /eventId/)
})

test('score graph fingerprint is deterministic and changes with graph content', () => {
  const fingerprintScoreGraph = requireFn('fingerprintScoreGraph')
  const graph = api.createScoreGraph({
    sourceId: 'source-1',
    measures: [api.createMeasure({ key: 'm1', beats: 4, beatType: 4 })],
    events: [api.createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 1, pitch: 60 })],
  })
  const changed = api.createScoreGraph({
    sourceId: 'source-1',
    measures: graph.measures,
    events: [api.createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 2, pitch: 60 })],
  })

  const first = fingerprintScoreGraph(graph)
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(fingerprintScoreGraph(graph), first)
  assert.notEqual(fingerprintScoreGraph(changed), first)
})

test('existing automatic correction operation vocabulary is not widened', () => {
  assert.deepEqual(Object.values(api.PATCH_OPERATION), [
    'CHANGE_PITCH',
    'CHANGE_ONSET',
    'CHANGE_VOICE',
    'CHANGE_DURATION',
    'CHANGE_STAFF',
    'CHANGE_TIE',
    'CHANGE_RELATION',
  ])
  assert.equal(Object.values(api.PATCH_OPERATION).includes('INSERT_EVENT'), false)
  assert.equal(Object.values(api.PATCH_OPERATION).includes('REMOVE_EVENT'), false)
  assert.equal(Object.values(api.PATCH_OPERATION).includes('CHANGE_MEASURE_METER'), false)
})
