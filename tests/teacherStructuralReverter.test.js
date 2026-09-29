import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../src/index.js'

function requireFn(name) {
  assert.equal(typeof api[name], 'function', `${name} must be exported`)
  return api[name]
}

function sourceGraph() {
  return api.createScoreGraph({
    sourceId: 'source-revert-1',
    measures: [api.createMeasure({ key: 'm1', beats: 4, beatType: 4 })],
    events: [
      api.createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60, isRest: false, metadata: { tieTypes: ['start'] } }),
      api.createScoreEvent({ id: 'r1', measureKey: 'm1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: null, isRest: true }),
    ],
  })
}

function setFor(source, patches, id = 'ps-revert') {
  return api.createTeacherStructuralPatchSet({
    patchSetId: id,
    baseSourceId: source.sourceId,
    baseGraphFingerprint: api.fingerprintScoreGraph(source),
    authorization: api.createTeacherEditAuthorization({ actionId: 'teacher-action-revert' }),
    patches,
  })
}

function insertedEvent(id) {
  return { id, measureKey: 'm1', onset: 2, duration: 0.5, voice: 2, staff: 1, pitch: 64, isRest: false, isChordTone: false, metadata: null }
}

test('every structural operation has a deterministic inverse', () => {
  const invert = requireFn('invertTeacherStructuralPatch')
  const source = sourceGraph()
  const patches = [
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, measureKey: 'm1', eventId: 'n2', before: null, after: insertedEvent('n2') }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT, measureKey: 'm1', eventId: 'r1', before: source.events[1], after: null }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5 }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE, measureKey: 'm1', eventId: 'n1', before: 1, after: 2 }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF, measureKey: 'm1', eventId: 'n1', before: 1, after: 2 }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE, measureKey: 'm1', eventId: 'n1', before: ['start'], after: ['start', 'stop'] }),
    api.createTeacherStructuralPatch({
      operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
      measureKey: 'm1',
      before: { beats: 4, beatType: 4, implicit: false, pickup: false },
      after: { beats: 3, beatType: 4, implicit: false, pickup: false },
    }),
  ]

  const [insertInverse, removeInverse, ...rest] = patches.map(invert)
  assert.equal(insertInverse.operation, api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT)
  assert.deepEqual(insertInverse.before, patches[0].after)
  assert.equal(insertInverse.after, null)

  assert.equal(removeInverse.operation, api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT)
  assert.equal(removeInverse.before, null)
  assert.deepEqual(removeInverse.after, patches[1].before)

  for (let i = 2; i < patches.length; i += 1) {
    assert.equal(rest[i - 2].operation, patches[i].operation)
    assert.deepEqual(rest[i - 2].before, patches[i].after)
    assert.deepEqual(rest[i - 2].after, patches[i].before)
  }
})

test('single structural operations project and revert exactly without mutating either graph', () => {
  const revert = requireFn('revertTeacherStructuralPatchSet')
  const source = sourceGraph()
  const sourceJson = JSON.stringify(source)

  const patches = [
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, measureKey: 'm1', eventId: 'n2', before: null, after: insertedEvent('n2') }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT, measureKey: 'm1', eventId: 'r1', before: source.events[1], after: null }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5 }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE, measureKey: 'm1', eventId: 'n1', before: 1, after: 2 }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF, measureKey: 'm1', eventId: 'n1', before: 1, after: 2 }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE, measureKey: 'm1', eventId: 'n1', before: ['start'], after: ['start', 'stop'] }),
    api.createTeacherStructuralPatch({
      operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
      measureKey: 'm1',
      before: { beats: 4, beatType: 4, implicit: false, pickup: false },
      after: { beats: 3, beatType: 4, implicit: false, pickup: false },
    }),
  ]

  for (let i = 0; i < patches.length; i += 1) {
    const set = setFor(source, [patches[i]], `single-${i}`)
    const projected = api.projectTeacherStructuralPatchSet(source, set)
    assert.equal(projected.ok, true)
    const projectedJson = JSON.stringify(projected.graph)
    const reverted = revert(projected.graph, set)
    assert.equal(reverted.ok, true)
    assert.deepEqual(reverted.graph, source)
    assert.equal(JSON.stringify(source), sourceJson)
    assert.equal(JSON.stringify(projected.graph), projectedJson)
  }
})

test('mixed structural patch set rolls back in reverse order to the exact base graph', () => {
  const invertSet = requireFn('invertTeacherStructuralPatchSet')
  const revert = requireFn('revertTeacherStructuralPatchSet')
  const source = sourceGraph()

  const patches = [
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, measureKey: 'm1', eventId: 'n2', before: null, after: insertedEvent('n2') }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5 }),
    api.createTeacherStructuralPatch({
      operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
      measureKey: 'm1',
      before: { beats: 4, beatType: 4, implicit: false, pickup: false },
      after: { beats: 3, beatType: 4, implicit: false, pickup: false },
    }),
  ]
  const set = setFor(source, patches, 'mixed')
  const projected = api.projectTeacherStructuralPatchSet(source, set)
  assert.equal(projected.ok, true)

  const inverseSet = invertSet(set, { projectedGraph: projected.graph })
  assert.equal(inverseSet.baseSourceId, projected.graph.sourceId)
  assert.equal(inverseSet.baseGraphFingerprint, api.fingerprintScoreGraph(projected.graph))
  assert.deepEqual(inverseSet.patches.map((patch) => patch.operation), [
    api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
    api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT,
  ])

  const reverted = revert(projected.graph, set)
  assert.equal(reverted.ok, true)
  assert.deepEqual(reverted.graph, source)
})

test('rollback fails closed when projected graph was tampered before revert', () => {
  const revert = requireFn('revertTeacherStructuralPatchSet')
  const source = sourceGraph()
  const patch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5,
  })
  const set = setFor(source, [patch])
  const projected = api.projectTeacherStructuralPatchSet(source, set)
  assert.equal(projected.ok, true)

  const tampered = api.createScoreGraph({
    sourceId: projected.graph.sourceId,
    measures: projected.graph.measures,
    events: projected.graph.events.map((event) => event.id === 'n1'
      ? api.createScoreEvent({ ...event, duration: 0.25 })
      : event),
  })
  const result = revert(tampered, set)
  assert.equal(result.ok, false)
  assert.equal(result.code, 'STALE_STRUCTURAL_BEFORE_MISMATCH')
  assert.equal(result.graph, tampered)
})
