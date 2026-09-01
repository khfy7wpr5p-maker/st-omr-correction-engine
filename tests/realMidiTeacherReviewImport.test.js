import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REAL_MIDI_TEACHER_REVIEW_DECISION,
  REAL_MIDI_TEACHER_REVIEW_IMPORT_STATUS,
  buildRealMidiTeacherReviewPacket,
  validateRealMidiTeacherReviewDecision,
} from '../src/index.js'

function packet() {
  return buildRealMidiTeacherReviewPacket([{ id: 'sor-op35-no13', benchmark: {
    automaticCorrectionAuthority: false,
    diagnostics: [{
      code: 'MIDI_AMBIGUOUS_MATCH',
      scoreEventId: 'score-1',
      midiEventId: 'midi-1',
      ambiguityReason: 'POLYPHONIC_SAME_PITCH_MIDI_COLLAPSE',
      location: { measure: 1, beat: 0 },
    }],
  } }])
}

test('teacher review import maps a verified human decision without granting downstream authority', () => {
  const decision = validateRealMidiTeacherReviewDecision(packet(), {
    reviewId: 'sor-op35-no13:diagnostic:1',
    decision: REAL_MIDI_TEACHER_REVIEW_DECISION.DIAGNOSTIC_CORRECT,
    reviewerId: 'teacher-1',
    reviewedAt: '2026-09-01T21:00:00.000Z',
    note: 'Confirmed against written voices.',
  })
  assert.equal(decision.status, REAL_MIDI_TEACHER_REVIEW_IMPORT_STATUS.VERIFIED)
  assert.equal(decision.verifiedLabel, true)
  assert.equal(decision.teacherGoldEligible, false)
  assert.equal(decision.measuredReliabilityEligible, false)
  assert.equal(decision.precisionRecallAvailable, false)
  assert.equal(decision.calibrationAvailable, false)
  assert.equal(decision.automaticCorrectionAuthority, false)
})

test('teacher review import preserves ambiguous decisions as unlabeled', () => {
  const decision = validateRealMidiTeacherReviewDecision(packet(), {
    reviewId: 'sor-op35-no13:diagnostic:1',
    decision: REAL_MIDI_TEACHER_REVIEW_DECISION.AMBIGUOUS,
    reviewerId: 'teacher-1',
    reviewedAt: '2026-09-01T21:00:00.000Z',
  })
  assert.equal(decision.status, REAL_MIDI_TEACHER_REVIEW_IMPORT_STATUS.AMBIGUOUS)
  assert.equal(decision.verifiedLabel, null)
})

test('teacher review import fails closed for unknown items, malformed timestamps, and authoritative packets', () => {
  assert.throws(() => validateRealMidiTeacherReviewDecision(packet(), {
    reviewId: 'missing',
    decision: REAL_MIDI_TEACHER_REVIEW_DECISION.DIAGNOSTIC_CORRECT,
    reviewerId: 'teacher-1',
    reviewedAt: '2026-09-01T21:00:00.000Z',
  }), /identify an item/)
  assert.throws(() => validateRealMidiTeacherReviewDecision(packet(), {
    reviewId: 'sor-op35-no13:diagnostic:1',
    decision: REAL_MIDI_TEACHER_REVIEW_DECISION.DIAGNOSTIC_CORRECT,
    reviewerId: 'teacher-1',
    reviewedAt: '2026-09-01',
  }), /exact ISO-8601 UTC timestamp/)
  const authoritative = { ...packet(), automaticCorrectionAuthority: true }
  assert.throws(() => validateRealMidiTeacherReviewDecision(authoritative, {
    reviewId: 'sor-op35-no13:diagnostic:1',
    decision: REAL_MIDI_TEACHER_REVIEW_DECISION.DIAGNOSTIC_CORRECT,
    reviewerId: 'teacher-1',
    reviewedAt: '2026-09-01T21:00:00.000Z',
  }), /must remain non-authoritative/)
})
