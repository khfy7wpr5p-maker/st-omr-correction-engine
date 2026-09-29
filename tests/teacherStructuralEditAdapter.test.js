import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../src/index.js'

function requireAdapter() {
  assert.equal(typeof api.processSesliTabTeacherStructuralEdit, 'function', 'processSesliTabTeacherStructuralEdit must be exported')
  return api.processSesliTabTeacherStructuralEdit
}

function graph({ overlap = false } = {}) {
  const measure = api.createMeasure({ key: 'm1', beats: 4, beatType: 4 })
  return api.createScoreGraph({
    sourceId: overlap ? 'adapter-overlap' : 'adapter-source',
    measures: [measure],
    events: overlap
      ? [
          api.createScoreEvent({ id: 'a', measureKey: 'm1', onset: 0, duration: 2, voice: 1, staff: 1, pitch: 60 }),
          api.createScoreEvent({ id: 'b', measureKey: 'm1', onset: 1, duration: 1, voice: 2, staff: 1, pitch: 62 }),
        ]
      : [
          api.createScoreEvent({ id: 'a', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 60 }),
          api.createScoreEvent({ id: 'b', measureKey: 'm1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: 62 }),
        ],
  })
}

function setFor(source, patch, id = 'adapter-set') {
  return api.createTeacherStructuralPatchSet({
    patchSetId: id,
    baseSourceId: source.sourceId,
    baseGraphFingerprint: api.fingerprintScoreGraph(source),
    authorization: api.createTeacherEditAuthorization({ actionId: 'adapter-teacher-action' }),
    patches: [patch],
  })
}

test('successful projection plus PASS revalidation yields only teacher-corrected revision eligibility', () => {
  const processEdit = requireAdapter()
  const source = graph()
  const patch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'b', before: 1, after: 0.5,
  })
  const packet = processEdit({ scoreGraph: source, patchSet: setFor(source, patch) })

  assert.equal(packet.mode, 'TEACHER_AUTHORIZED_STRUCTURAL_EDIT')
  assert.equal(packet.sourceGraph, source)
  assert.equal(packet.projection.ok, true)
  assert.equal(packet.revalidation.integrityDecision, 'PASS')
  assert.equal(packet.teacherCorrectedRevisionEligible, true)
  assert.equal(packet.automaticApplyAuthority, false)
  assert.equal(packet.finalTeacherApproval, false)
  assert.equal(packet.studentShareEligible, false)
  assert.equal(packet.musicXmlWriteBackAuthority, false)
  assert.equal(packet.learningAuthority, false)
  assert.equal(Object.isFrozen(packet), true)
  for (const prohibited of ['apply', 'approve', 'serializeMusicXml', 'sendToStudent', 'persist', 'learn']) {
    assert.equal(prohibited in packet, false)
  }
})

test('projection failure keeps source authoritative and revision eligibility false', () => {
  const processEdit = requireAdapter()
  const source = graph()
  const stale = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
    measureKey: 'm1', eventId: 'b', before: 99, after: 0.5,
  })
  const packet = processEdit({ scoreGraph: source, patchSet: setFor(source, stale, 'adapter-stale') })

  assert.equal(packet.sourceGraph, source)
  assert.equal(packet.projection.ok, false)
  assert.equal(packet.projection.graph, source)
  assert.equal(packet.revalidation, null)
  assert.equal(packet.teacherCorrectedRevisionEligible, false)
})

test('revalidation FAIL blocks teacher-corrected revision eligibility', () => {
  const processEdit = requireAdapter()
  const source = graph({ overlap: true })
  const patch = api.createTeacherStructuralPatch({
    operation: api.TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE,
    measureKey: 'm1', eventId: 'b', before: 2, after: 1,
  })
  const packet = processEdit({ scoreGraph: source, patchSet: setFor(source, patch, 'adapter-overlap-set') })

  assert.equal(packet.projection.ok, true)
  assert.equal(packet.revalidation.integrityDecision, 'FAIL')
  assert.equal(packet.revalidation.newFindings.some((finding) => finding.code === 'VOICE_OVERLAP'), true)
  assert.equal(packet.teacherCorrectedRevisionEligible, false)
  assert.equal(packet.finalTeacherApproval, false)
})
