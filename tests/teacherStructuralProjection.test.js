import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../src/index.js'

function requireProjector() {
  assert.equal(typeof api.projectTeacherStructuralPatchSet, 'function', 'projectTeacherStructuralPatchSet must be exported')
  return api.projectTeacherStructuralPatchSet
}

function sourceGraph() {
  return api.createScoreGraph({
    sourceId: 'source-projection-1',
    measures: [api.createMeasure({ key: 'm1', beats: 4, beatType: 4 })],
    events: [
      api.createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60, isRest: false, metadata: { tieTypes: ['start'] } }),
      api.createScoreEvent({ id: 'r1', measureKey: 'm1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: null, isRest: true }),
    ],
  })
}

function patchSet(source, patches, overrides = {}) {
  return api.createTeacherStructuralPatchSet({
    patchSetId: overrides.patchSetId ?? 'ps-projection',
    baseSourceId: overrides.baseSourceId ?? source.sourceId,
    baseGraphFingerprint: overrides.baseGraphFingerprint ?? api.fingerprintScoreGraph(source),
    authorization: overrides.authorization ?? api.createTeacherEditAuthorization({ actionId: 'teacher-action-projection' }),
    patches,
  })
}

function insertedEvent(id, { rest = false } = {}) {
  return { id, measureKey: 'm1', onset: 2, duration: 0.5, voice: 2, staff: 1, pitch: rest ? null : 64, isRest: rest, isChordTone: false, metadata: null }
}

test('projection fails closed on source id, fingerprint, or teacher authorization mismatch', () => {
  const project = requireProjector()
  const source = sourceGraph()
  const p = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5,
  })

  const sourceMismatch = patchSet(source, [p], { baseSourceId: 'other-source' })
  assert.equal(project(source, sourceMismatch).code, 'STRUCTURAL_SOURCE_ID_MISMATCH')

  const fingerprintMismatch = patchSet(source, [p], { baseGraphFingerprint: 'b'.repeat(64) })
  assert.equal(project(source, fingerprintMismatch).code, 'STRUCTURAL_BASE_FINGERPRINT_MISMATCH')

  const valid = patchSet(source, [p])
  const missingAuthorization = Object.freeze({ ...valid, authorization: null })
  assert.equal(project(source, missingAuthorization).code, 'STRUCTURAL_TEACHER_AUTHORIZATION_REQUIRED')
})

test('single teacher structural operations project onto a new graph without mutating source', () => {
  const project = requireProjector()
  const cases = [
    {
      name: 'insert note',
      patch: () => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, measureKey: 'm1', eventId: 'n2', before: null, after: insertedEvent('n2') }),
      assertProjected: (graph) => assert.equal(graph.events.some((event) => event.id === 'n2' && event.pitch === 64), true),
    },
    {
      name: 'insert rest',
      patch: () => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, measureKey: 'm1', eventId: 'r2', before: null, after: insertedEvent('r2', { rest: true }) }),
      assertProjected: (graph) => assert.equal(graph.events.some((event) => event.id === 'r2' && event.isRest), true),
    },
    {
      name: 'remove note',
      patch: (source) => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT, measureKey: 'm1', eventId: 'n1', before: source.events[0], after: null }),
      assertProjected: (graph) => assert.equal(graph.events.some((event) => event.id === 'n1'), false),
    },
    {
      name: 'remove rest',
      patch: (source) => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT, measureKey: 'm1', eventId: 'r1', before: source.events[1], after: null }),
      assertProjected: (graph) => assert.equal(graph.events.some((event) => event.id === 'r1'), false),
    },
    {
      name: 'duration',
      patch: () => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5 }),
      assertProjected: (graph) => assert.equal(graph.events.find((event) => event.id === 'n1').duration, 0.5),
    },
    {
      name: 'voice',
      patch: () => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE, measureKey: 'm1', eventId: 'n1', before: 1, after: 2 }),
      assertProjected: (graph) => assert.equal(graph.events.find((event) => event.id === 'n1').voice, 2),
    },
    {
      name: 'staff',
      patch: () => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF, measureKey: 'm1', eventId: 'n1', before: 1, after: 2 }),
      assertProjected: (graph) => assert.equal(graph.events.find((event) => event.id === 'n1').staff, 2),
    },
    {
      name: 'tie',
      patch: () => api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE, measureKey: 'm1', eventId: 'n1', before: ['start'], after: ['start', 'stop'] }),
      assertProjected: (graph) => assert.deepEqual(graph.events.find((event) => event.id === 'n1').metadata.tieTypes, ['start', 'stop']),
    },
    {
      name: 'meter',
      patch: () => api.createTeacherStructuralPatch({
        operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
        measureKey: 'm1',
        before: { beats: 4, beatType: 4, implicit: false, pickup: false },
        after: { beats: 3, beatType: 4, implicit: false, pickup: false },
      }),
      assertProjected: (graph) => {
        assert.equal(graph.measures[0].beats, 3)
        assert.equal(graph.measures[0].expectedQuarterBeats, 3)
      },
    },
  ]

  for (const item of cases) {
    const source = sourceGraph()
    const sourceBefore = JSON.stringify(source)
    const p = item.patch(source)
    const result = project(source, patchSet(source, [p], { patchSetId: `ps-${item.name}` }))

    assert.equal(result.ok, true, item.name)
    assert.equal(result.code, 'TEACHER_STRUCTURAL_PROJECTED', item.name)
    assert.equal(result.sourceGraph, source, item.name)
    assert.notEqual(result.graph, source, item.name)
    assert.equal(result.graph.sourceId, source.sourceId, item.name)
    assert.equal(JSON.stringify(source), sourceBefore, item.name)
    assert.equal(result.audit.length, 1, item.name)
    assert.equal(result.audit[0].operation, p.operation, item.name)
    assert.equal(result.audit[0].order, 0, item.name)
    item.assertProjected(result.graph)
  }
})

test('mixed patch set is atomic and exposes no partial authoritative graph or audit', () => {
  const project = requireProjector()
  const source = sourceGraph()
  const insert = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT,
    measureKey: 'm1', eventId: 'n2', before: null, after: insertedEvent('n2'),
  })
  const stale = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'n1', before: 99, after: 0.5,
  })

  const result = project(source, patchSet(source, [insert, stale]))
  assert.equal(result.ok, false)
  assert.equal(result.code, 'STALE_STRUCTURAL_BEFORE_MISMATCH')
  assert.equal(result.graph, source)
  assert.equal(result.sourceGraph, source)
  assert.deepEqual(result.audit, [])
  assert.equal(source.events.some((event) => event.id === 'n2'), false)
})

test('a structural patch set cannot be replayed against its projected revision', () => {
  const project = requireProjector()
  const source = sourceGraph()
  const p = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5,
  })
  const set = patchSet(source, [p])
  const first = project(source, set)
  assert.equal(first.ok, true)

  const replay = project(first.graph, set)
  assert.equal(replay.ok, false)
  assert.equal(replay.code, 'STRUCTURAL_BASE_FINGERPRINT_MISMATCH')
  assert.equal(replay.graph, first.graph)
})
