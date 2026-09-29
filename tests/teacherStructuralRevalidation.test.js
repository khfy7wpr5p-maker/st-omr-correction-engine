import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../src/index.js'

function requireRevalidator() {
  assert.equal(typeof api.revalidateTeacherStructuralRevision, 'function', 'revalidateTeacherStructuralRevision must be exported')
  return api.revalidateTeacherStructuralRevision
}

function makeSource({ withExpectedFindings = false, overlapSetup = false } = {}) {
  const measure = api.createMeasure({ key: 'm1', beats: 4, beatType: 4 })
  if (overlapSetup) {
    return api.createScoreGraph({
      sourceId: 'source-revalidation-overlap',
      measures: [measure],
      events: [
        api.createScoreEvent({ id: 'a', measureKey: 'm1', onset: 0, duration: 2, voice: 1, staff: 1, pitch: 60 }),
        api.createScoreEvent({ id: 'b', measureKey: 'm1', onset: 1, duration: 1, voice: 2, staff: 1, pitch: 62 }),
      ],
    })
  }
  return api.createScoreGraph({
    sourceId: 'source-revalidation-1',
    measures: [measure],
    events: [
      api.createScoreEvent({
        id: 'a', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60,
        metadata: withExpectedFindings ? { expectedStaff: 2 } : null,
      }),
      api.createScoreEvent({
        id: 'b', measureKey: 'm1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: 62,
        metadata: withExpectedFindings ? { expectedPitch: 63 } : null,
      }),
    ],
  })
}

function setFor(source, patches, id = 'ps-revalidate') {
  return api.createTeacherStructuralPatchSet({
    patchSetId: id,
    baseSourceId: source.sourceId,
    baseGraphFingerprint: api.fingerprintScoreGraph(source),
    authorization: api.createTeacherEditAuthorization({ actionId: 'teacher-action-revalidate' }),
    patches,
  })
}

test('declared structural diff passes integrity checks without claiming musical correctness or final approval', () => {
  const revalidate = requireRevalidator()
  const source = makeSource()
  const inserted = { id: 'r1', measureKey: 'm1', onset: 2, duration: 0.5, voice: 1, staff: 1, pitch: null, isRest: true, isChordTone: false, metadata: null }
  const patches = [
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION, measureKey: 'm1', eventId: 'b', before: 1, after: 0.5 }),
    api.createTeacherStructuralPatch({ operation: api.TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT, measureKey: 'm1', eventId: 'r1', eventIndex: 2, before: null, after: inserted }),
  ]
  const set = setFor(source, patches)
  const projected = api.projectTeacherStructuralPatchSet(source, set)
  assert.equal(projected.ok, true)

  const result = revalidate({ sourceGraph: source, projectedGraph: projected.graph, patchSet: set })
  assert.equal(result.mode, 'TEACHER_STRUCTURAL_REVALIDATION_V1')
  assert.equal(result.integrityDecision, 'PASS')
  assert.deepEqual(result.findings, [])
  assert.deepEqual(result.newFindings, [])
  assert.equal(result.reversibilityVerified, true)
  assert.equal(result.sourceMutationDetected, false)
  assert.equal(result.musicalCorrectnessProven, false)
  assert.equal(result.finalTeacherApproval, false)
})

test('undeclared insertion removal field and meter mutations fail structural diff verification', () => {
  const revalidate = requireRevalidator()
  const source = makeSource()
  const declared = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'b', before: 1, after: 0.5,
  })
  const set = setFor(source, [declared])

  const variants = [
    api.createScoreGraph({
      sourceId: source.sourceId,
      measures: source.measures,
      events: [...source.events, api.createScoreEvent({ id: 'x', measureKey: 'm1', onset: 2, duration: 1, voice: 1, staff: 1, pitch: 65 })],
    }),
    api.createScoreGraph({
      sourceId: source.sourceId,
      measures: source.measures,
      events: [source.events[0]],
    }),
    api.createScoreGraph({
      sourceId: source.sourceId,
      measures: source.measures,
      events: [
        api.createScoreEvent({ ...source.events[0], pitch: 61 }),
        api.createScoreEvent({ ...source.events[1], duration: 0.5 }),
      ],
    }),
    api.createScoreGraph({
      sourceId: source.sourceId,
      measures: [api.createMeasure({ key: 'm1', beats: 3, beatType: 4 })],
      events: [
        source.events[0],
        api.createScoreEvent({ ...source.events[1], duration: 0.5 }),
      ],
    }),
  ]

  for (const projectedGraph of variants) {
    const result = revalidate({ sourceGraph: source, projectedGraph, patchSet: set })
    assert.equal(result.integrityDecision, 'FAIL')
    assert.equal(result.findings.length > 0, true)
  }
})

test('pre-existing unrelated findings stay residual, declared fix is resolved, and no new finding still passes', () => {
  const revalidate = requireRevalidator()
  const source = makeSource({ withExpectedFindings: true })
  const patch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF,
    measureKey: 'm1', eventId: 'a', before: 1, after: 2,
  })
  const set = setFor(source, [patch], 'ps-residual')
  const projected = api.projectTeacherStructuralPatchSet(source, set)
  assert.equal(projected.ok, true)

  const result = revalidate({ sourceGraph: source, projectedGraph: projected.graph, patchSet: set })
  assert.equal(result.integrityDecision, 'PASS')
  assert.equal(result.residualFindings.some((item) => item.code === 'PITCH_EXPLICIT_PITCH_MISMATCH'), true)
  assert.equal(result.resolvedFindings.some((item) => item.code === 'STAFF_EXPLICIT_STAFF_MISMATCH'), true)
  assert.deepEqual(result.newFindings, [])
})

test('new same-voice overlap after a teacher patch is blocking and causes FAIL', () => {
  const revalidate = requireRevalidator()
  const source = makeSource({ overlapSetup: true })
  const patch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE,
    measureKey: 'm1', eventId: 'b', before: 2, after: 1,
  })
  const set = setFor(source, [patch], 'ps-new-overlap')
  const projected = api.projectTeacherStructuralPatchSet(source, set)
  assert.equal(projected.ok, true)

  const result = revalidate({ sourceGraph: source, projectedGraph: projected.graph, patchSet: set })
  assert.equal(result.integrityDecision, 'FAIL')
  assert.equal(result.newFindings.some((item) => item.code === 'VOICE_OVERLAP'), true)
  assert.equal(result.reversibilityVerified, true)
  assert.equal(result.musicalCorrectnessProven, false)
})
