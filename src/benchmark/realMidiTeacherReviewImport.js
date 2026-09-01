export const REAL_MIDI_TEACHER_REVIEW_DECISION = Object.freeze({
  DIAGNOSTIC_CORRECT: 'DIAGNOSTIC_CORRECT',
  DIAGNOSTIC_FALSE_POSITIVE: 'DIAGNOSTIC_FALSE_POSITIVE',
  AMBIGUOUS: 'AMBIGUOUS',
})

export const REAL_MIDI_TEACHER_REVIEW_IMPORT_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED_TEACHER_REVIEW',
  AMBIGUOUS: 'AMBIGUOUS_TEACHER_REVIEW',
})

function nonEmpty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

function validIsoTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

export function validateRealMidiTeacherReviewDecision(packet, {
  reviewId,
  decision,
  reviewerId,
  reviewedAt,
  note = null,
}) {
  if (!packet || packet.schema !== 'st_omr_real_midi_teacher_review_packet_v1') {
    throw new TypeError('A st_omr_real_midi_teacher_review_packet_v1 packet is required.')
  }
  if (packet.authority !== 'HUMAN_REVIEW_REQUIRED' || packet.automaticCorrectionAuthority !== false) {
    throw new TypeError('Teacher review packet must remain non-authoritative.')
  }
  nonEmpty(reviewId, 'reviewId')
  nonEmpty(reviewerId, 'reviewerId')
  if (!validIsoTimestamp(reviewedAt)) throw new TypeError('reviewedAt must be an exact ISO-8601 UTC timestamp.')
  if (note != null) nonEmpty(note, 'note')
  if (!Object.values(REAL_MIDI_TEACHER_REVIEW_DECISION).includes(decision)) {
    throw new TypeError('Unsupported teacher review decision.')
  }
  const item = Array.isArray(packet.items) ? packet.items.find((candidate) => candidate.reviewId === reviewId) : null
  if (!item) throw new TypeError('reviewId must identify an item in the supplied packet.')
  if (item.status !== 'PENDING_TEACHER_REVIEW' || item.verifiedLabel !== null) {
    throw new TypeError('Teacher review item must still be pending and unlabeled.')
  }
  if (item.automaticCorrectionAuthority !== false) {
    throw new TypeError('Teacher review item must not carry automatic correction authority.')
  }
  const ambiguous = decision === REAL_MIDI_TEACHER_REVIEW_DECISION.AMBIGUOUS
  const verifiedLabel = ambiguous
    ? null
    : decision === REAL_MIDI_TEACHER_REVIEW_DECISION.DIAGNOSTIC_CORRECT
  return Object.freeze({
    schema: 'st_omr_real_midi_teacher_review_decision_v1',
    reviewId,
    workId: item.workId,
    diagnosticCode: item.diagnosticCode,
    scoreEventId: item.scoreEventId,
    midiEventId: item.midiEventId,
    ambiguityReason: item.ambiguityReason,
    location: item.location,
    decision,
    status: ambiguous
      ? REAL_MIDI_TEACHER_REVIEW_IMPORT_STATUS.AMBIGUOUS
      : REAL_MIDI_TEACHER_REVIEW_IMPORT_STATUS.VERIFIED,
    verifiedLabel,
    reviewerId,
    reviewedAt,
    note,
    teacherGoldEligible: false,
    measuredReliabilityEligible: false,
    precisionRecallAvailable: false,
    calibrationAvailable: false,
    automaticCorrectionAuthority: false,
  })
}
