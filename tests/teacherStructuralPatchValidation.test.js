import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../src/index.js'

function requireValidator() {
  assert.equal(typeof api.validateTeacherStructuralPatchAgainstGraph, 'function', 'validateTeacherStructuralPatchAgainstGraph must be exported')
  return api.validateTeacherStructuralPatchAgainstGraph
}

function fixtureGraph() {
  return api.createScoreGraph({
    sourceId: 'source-struct-1',
    measures: [api.createMeasure({ key: 'm1', beats: 4, beatType: 4 })],
    events: [
      api.createScoreEvent({ id: 'n1', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60, isRest: false, metadata: { tieTypes: ['start'] } }),
      api.createScoreEvent({ id: 'r1', measureKey: 'm1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: null, isRest: true }),
    ],
  })
}

function patch(operation, values = {}) {
  return api.createTeacherStructuralPatch({
    operation,
    measureKey: 'm1',
    eventId: values.eventId ?? 'x1',
    before: values.before,
    after: values.after,
    eventIndex: values.eventIndex ?? null,
  })
}

test('explicit inserted note and rest payloads are accepted without deriving musical fields', () => {
  const validate = requireValidator()
  const source = fixtureGraph()
  const noteAfter = { id: 'n2', measureKey: 'm1', onset: 2, duration: 0.5, voice: 2, staff: 1, pitch: 64, isRest: false, isChordTone: false, metadata: null }
  const restAfter = { id: 'r2', measureKey: 'm1', onset: 2.5, duration: 0.5, voice: 2, staff: 1, pitch: null, isRest: true, isChordTone: false, metadata: null }

  const note = validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, { eventId: 'n2', eventIndex: 2, before: null, after: noteAfter }) })
  const rest = validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, { eventId: 'r2', eventIndex: 2, before: null, after: restAfter }) })

  assert.equal(note.ok, true)
  assert.equal(rest.ok, true)
  assert.deepEqual(note.normalizedPatch.after, api.createScoreEvent(noteAfter))
  assert.deepEqual(rest.normalizedPatch.after, api.createScoreEvent(restAfter))
})

test('insert fails closed for incomplete payload, duplicate id, or unknown measure', () => {
  const validate = requireValidator()
  const source = fixtureGraph()
  const incomplete = { id: 'n2', measureKey: 'm1', onset: 2, duration: 1, staff: 1, pitch: 64, isRest: false }
  const duplicate = { id: 'n1', measureKey: 'm1', onset: 2, duration: 1, voice: 1, staff: 1, pitch: 64, isRest: false }
  const unknownMeasure = { id: 'n2', measureKey: 'm9', onset: 2, duration: 1, voice: 1, staff: 1, pitch: 64, isRest: false }

  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, { eventId: 'n2', eventIndex: 2, before: null, after: incomplete }) }).code, 'INVALID_INSERT_EVENT')
  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, { eventId: 'n1', eventIndex: 2, before: null, after: duplicate }) }).code, 'INSERT_EVENT_ID_ALREADY_EXISTS')

  const unknownPatch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT,
    measureKey: 'm9',
    eventId: 'n2',
    eventIndex: 2,
    before: null,
    after: unknownMeasure,
  })
  assert.equal(validate({ scoreGraph: source, patch: unknownPatch }).code, 'INSERT_MEASURE_NOT_FOUND')
})

test('remove note or rest requires the exact full current event snapshot', () => {
  const validate = requireValidator()
  const source = fixtureGraph()

  for (const event of source.events) {
    const exact = patch(api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT, { eventId: event.id, eventIndex: source.events.indexOf(event), before: event, after: null })
    assert.equal(validate({ scoreGraph: source, patch: exact }).ok, true)

    const staleBefore = { ...event, duration: event.duration + 0.25 }
    const stale = patch(api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT, { eventId: event.id, eventIndex: source.events.indexOf(event), before: staleBefore, after: null })
    assert.equal(validate({ scoreGraph: source, patch: stale }).code, 'STALE_STRUCTURAL_BEFORE_MISMATCH')
  }

  const missing = patch(api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT, {
    eventId: 'missing',
    eventIndex: 0,
    before: { id: 'missing', measureKey: 'm1', onset: 0, duration: 1, end: 1, voice: 1, staff: 1, pitch: 60, isRest: false, isChordTone: false, metadata: null },
    after: null,
  })
  assert.equal(validate({ scoreGraph: source, patch: missing }).code, 'STRUCTURAL_TARGET_NOT_FOUND')
})

test('duration voice and staff changes validate exact before values and ScoreEvent constraints', () => {
  const validate = requireValidator()
  const source = fixtureGraph()

  const cases = [
    [api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, 1, 0.5],
    [api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE, 1, 2],
    [api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF, 1, 2],
  ]
  for (const [operation, before, after] of cases) {
    const result = validate({ scoreGraph: source, patch: patch(operation, { eventId: 'n1', before, after }) })
    assert.equal(result.ok, true)
  }

  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, { eventId: 'n1', before: 1, after: -1 }) }).code, 'INVALID_STRUCTURAL_AFTER')
  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE, { eventId: 'n1', before: 1, after: 0 }) }).code, 'INVALID_STRUCTURAL_AFTER')
  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF, { eventId: 'n1', before: 1, after: 1.5 }) }).code, 'INVALID_STRUCTURAL_AFTER')
  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, { eventId: 'n1', before: 99, after: 0.5 }) }).code, 'STALE_STRUCTURAL_BEFORE_MISMATCH')
})

test('tie change is bounded to unique start/stop roles and exact before state', () => {
  const validate = requireValidator()
  const source = fixtureGraph()

  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE, { eventId: 'n1', before: ['start'], after: ['start', 'stop'] }) }).ok, true)
  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE, { eventId: 'n1', before: ['start'], after: ['slur'] }) }).code, 'INVALID_STRUCTURAL_AFTER')
  assert.equal(validate({ scoreGraph: source, patch: patch(api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE, { eventId: 'n1', before: null, after: ['stop'] }) }).code, 'STALE_STRUCTURAL_BEFORE_MISMATCH')
})

test('meter change validates complete supported meter state through createMeasure', () => {
  const validate = requireValidator()
  const source = fixtureGraph()
  const before = { beats: 4, beatType: 4, implicit: false, pickup: false }
  const after = { beats: 3, beatType: 4, implicit: false, pickup: false }
  const meterPatch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
    measureKey: 'm1',
    before,
    after,
  })
  const result = validate({ scoreGraph: source, patch: meterPatch })
  assert.equal(result.ok, true)
  assert.deepEqual(result.normalizedPatch.after, after)
  assert.equal('expectedQuarterBeats' in result.normalizedPatch.after, false)

  const stale = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
    measureKey: 'm1',
    before: { ...before, beats: 2 },
    after,
  })
  assert.equal(validate({ scoreGraph: source, patch: stale }).code, 'STALE_STRUCTURAL_BEFORE_MISMATCH')

  const invalid = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
    measureKey: 'm1',
    before,
    after: { ...after, beatType: 0 },
  })
  assert.equal(validate({ scoreGraph: source, patch: invalid }).code, 'INVALID_STRUCTURAL_AFTER')
})


test('exact snapshot comparison is independent of object key insertion order', () => {
  const validate = requireValidator()
  const source = fixtureGraph()
  const event = source.events[0]
  const reorderedBefore = {
    metadata: event.metadata,
    isChordTone: event.isChordTone,
    isRest: event.isRest,
    pitch: event.pitch,
    staff: event.staff,
    voice: event.voice,
    end: event.end,
    duration: event.duration,
    onset: event.onset,
    measureKey: event.measureKey,
    id: event.id,
  }
  const remove = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT,
    measureKey: 'm1',
    eventId: 'n1',
    eventIndex: 0,
    before: reorderedBefore,
    after: null,
  })
  assert.equal(validate({ scoreGraph: source, patch: remove }).ok, true)

  const meter = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER,
    measureKey: 'm1',
    before: { pickup: false, implicit: false, beatType: 4, beats: 4 },
    after: { pickup: false, implicit: false, beatType: 4, beats: 3 },
  })
  assert.equal(validate({ scoreGraph: source, patch: meter }).ok, true)
})
