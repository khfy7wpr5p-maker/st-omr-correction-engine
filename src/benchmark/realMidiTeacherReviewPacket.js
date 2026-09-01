const REVIEWABLE_CODES = new Set([
  'MIDI_AMBIGUOUS_MATCH',
  'MIDI_PITCH_CONFLICT',
  'MIDI_ONSET_CONFLICT',
  'MIDI_DURATION_CONFLICT',
  'MIDI_SCORE_NOTE_MISSING',
  'MIDI_EXTRA_NOTE',
])

function nonEmpty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

export function buildRealMidiTeacherReviewPacket(works) {
  if (!Array.isArray(works) || works.length === 0) throw new TypeError('works must be a non-empty array.')
  const items = []
  for (const work of works) {
    nonEmpty(work.id, 'work.id')
    if (!work.benchmark || typeof work.benchmark !== 'object') throw new TypeError('work.benchmark is required.')
    if (work.benchmark.automaticCorrectionAuthority !== false) throw new TypeError('Teacher review inputs must not carry automatic correction authority.')
    const diagnostics = Array.isArray(work.benchmark.diagnostics) ? work.benchmark.diagnostics : []
    diagnostics.forEach((diagnostic, index) => {
      if (!REVIEWABLE_CODES.has(diagnostic.code)) return
      items.push(Object.freeze({
        reviewId: `${work.id}:diagnostic:${index + 1}`,
        workId: work.id,
        diagnosticCode: diagnostic.code,
        scoreEventId: diagnostic.scoreEventId ?? null,
        midiEventId: diagnostic.midiEventId ?? null,
        ambiguityReason: diagnostic.ambiguityReason ?? null,
        location: diagnostic.location ?? null,
        status: 'PENDING_TEACHER_REVIEW',
        verifiedLabel: null,
        reviewerId: null,
        reviewedAt: null,
        note: null,
        automaticCorrectionAuthority: false,
      }))
    })
  }
  return Object.freeze({
    schema: 'st_omr_real_midi_teacher_review_packet_v1',
    workCount: works.length,
    reviewItemCount: items.length,
    items: Object.freeze(items),
    authority: 'HUMAN_REVIEW_REQUIRED',
    measuredReliabilityEligible: false,
    precisionRecallAvailable: false,
    calibrationAvailable: false,
    automaticCorrectionAuthority: false,
  })
}
