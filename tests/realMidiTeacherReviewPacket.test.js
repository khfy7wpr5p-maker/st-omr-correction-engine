import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRealMidiTeacherReviewPacket } from '../src/index.js'

test('teacher review packet includes only reviewable non-exact diagnostics and stays non-authoritative', () => {
  const packet = buildRealMidiTeacherReviewPacket([{ id: 'work-a', benchmark: {
    automaticCorrectionAuthority: false,
    diagnostics: [
      { code: 'MIDI_EXACT_MATCH', scoreEventId: 's1', midiEventId: 'm1' },
      { code: 'MIDI_AMBIGUOUS_MATCH', scoreEventId: 's2', midiEventId: 'm2', ambiguityReason: 'same_pitch_same_onset' },
      { code: 'MIDI_DURATION_CONFLICT', scoreEventId: 's3', midiEventId: 'm3' },
    ],
  } }])
  assert.equal(packet.reviewItemCount, 2)
  assert.equal(packet.items.every((item) => item.status === 'PENDING_TEACHER_REVIEW'), true)
  assert.equal(packet.items.every((item) => item.verifiedLabel === null), true)
  assert.equal(packet.measuredReliabilityEligible, false)
  assert.equal(packet.precisionRecallAvailable, false)
  assert.equal(packet.calibrationAvailable, false)
  assert.equal(packet.automaticCorrectionAuthority, false)
})

test('teacher review packet rejects authoritative benchmark input', () => {
  assert.throws(() => buildRealMidiTeacherReviewPacket([{ id: 'bad', benchmark: { automaticCorrectionAuthority: true, diagnostics: [] } }]), /must not carry automatic correction authority/)
})
