import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CORRECTION_EVENT_ORIGIN,
  POLYPHONIC_ERROR_CLASS,
  TEACHER_DECISION,
  createTeacherGoldCorrectionEvent,
  evaluateSourceMutationInvariant,
} from '../src/index.js'

test('teacher-gold correction event preserves real/synthetic origin and provenance', () => {
  const event = createTeacherGoldCorrectionEvent({
    eventId: 'gold-1',
    sourceId: 'scan-1',
    engineId: 'audiveris',
    origin: CORRECTION_EVENT_ORIGIN.REAL_OMR,
    page: 0,
    system: 0,
    measure: 3,
    staff: 1,
    voice: 3,
    errorClass: POLYPHONIC_ERROR_CLASS.VOICE,
    originalValue: 1,
    teacherGoldValue: 3,
    candidateValue: 3,
    correctionNeeded: true,
    correctionSafe: true,
    evidenceAvailable: true,
    teacherDecision: TEACHER_DECISION.ACCEPT_CORRECTION,
    provenance: { teacherApprovalId: 'approval-1', sourceRevisionId: 'rev-1' },
    bbox: { x: 1, y: 2, width: 3, height: 4 },
    sourceQuality: { blur: 0.1 },
    polyphonyComplexity: { voiceCount: 3 },
  })

  assert.equal(event.origin, 'REAL_OMR')
  assert.equal(event.errorClass, 'VOICE')
  assert.equal(event.taxonomyVersion, '1.0.0')
  assert.equal(event.measure, '3')
  assert.equal(Object.isFrozen(event.provenance), true)
})

test('teacher-gold correction event rejects unversioned or unknown classes', () => {
  const base = {
    eventId: 'gold-2', sourceId: 'scan-2', engineId: 'engine', origin: CORRECTION_EVENT_ORIGIN.SYNTHETIC,
    page: 0, system: 0, measure: 1, staff: 1, voice: 1, originalValue: 1, teacherGoldValue: 1,
    correctionNeeded: false, correctionSafe: false, evidenceAvailable: false,
    teacherDecision: TEACHER_DECISION.NO_CORRECTION_NEEDED, provenance: { id: 'p' },
  }
  assert.throws(() => createTeacherGoldCorrectionEvent({ ...base, errorClass: 'UNKNOWN' }), /Unsupported polyphonic error class/)
})

test('source mutation invariant compares exact source bytes', () => {
  const same = evaluateSourceMutationInvariant('<score>raw</score>', '<score>raw</score>')
  const changed = evaluateSourceMutationInvariant('<score>raw</score>', '<score>changed</score>')
  assert.equal(same.ok, true)
  assert.equal(same.code, 'SOURCE_UNCHANGED')
  assert.equal(changed.ok, false)
  assert.equal(changed.code, 'SOURCE_MUTATED')
  assert.notEqual(changed.beforeHash, changed.afterHash)
})
