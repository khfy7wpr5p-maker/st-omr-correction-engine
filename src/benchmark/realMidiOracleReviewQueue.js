import { isMidiComparisonCode } from '../contracts/midiReferenceEvidence.js'
import { REAL_MIDI_PAIR_STATUS } from './realMidiPairReadiness.js'

export const REAL_MIDI_ORACLE_REVIEW_STATUS = Object.freeze({
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  AMBIGUOUS: 'AMBIGUOUS',
})

export const REAL_MIDI_ORACLE_REVIEWER_KIND = Object.freeze({
  TEACHER: 'TEACHER',
  INDEPENDENT_REFERENCE: 'INDEPENDENT_REFERENCE',
})

function nonEmpty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

export function createRealMidiOracleReviewItem({
  reviewId,
  pairReadiness,
  diagnosticCode,
  scoreEventId = null,
  midiEventId = null,
  location = null,
  details = null,
}) {
  nonEmpty(reviewId, 'reviewId')
  if (!pairReadiness || pairReadiness.status !== REAL_MIDI_PAIR_STATUS.READY_FOR_ORACLE_REVIEW || pairReadiness.readyForOracleReview !== true) {
    throw new TypeError('A READY_FOR_ORACLE_REVIEW real MIDI pair is required.')
  }
  if (!isMidiComparisonCode(diagnosticCode)) throw new TypeError('Unsupported MIDI diagnostic code.')
  if (scoreEventId != null) nonEmpty(scoreEventId, 'scoreEventId')
  if (midiEventId != null) nonEmpty(midiEventId, 'midiEventId')
  return Object.freeze({
    reviewId,
    pairId: pairReadiness.id,
    diagnosticCode,
    scoreEventId,
    midiEventId,
    location: location ? Object.freeze({ ...location }) : null,
    details: details ? Object.freeze({ ...details }) : Object.freeze({}),
    status: REAL_MIDI_ORACLE_REVIEW_STATUS.PENDING,
    verifiedLabel: null,
    reviewer: null,
    automaticCorrectionAuthority: false,
  })
}

export function resolveRealMidiOracleReviewItem(item, {
  reviewerKind,
  reviewerId,
  verifiedLabel,
  ambiguous = false,
  note = null,
}) {
  if (!item || item.status !== REAL_MIDI_ORACLE_REVIEW_STATUS.PENDING) throw new TypeError('A pending real MIDI oracle review item is required.')
  if (!Object.values(REAL_MIDI_ORACLE_REVIEWER_KIND).includes(reviewerKind)) throw new TypeError('Explicit teacher or independent-reference reviewer kind is required.')
  nonEmpty(reviewerId, 'reviewerId')
  if (note != null) nonEmpty(note, 'note')
  if (ambiguous !== true && typeof verifiedLabel !== 'boolean') throw new TypeError('verifiedLabel must be boolean unless the decision is ambiguous.')
  return Object.freeze({
    ...item,
    status: ambiguous ? REAL_MIDI_ORACLE_REVIEW_STATUS.AMBIGUOUS : REAL_MIDI_ORACLE_REVIEW_STATUS.VERIFIED,
    verifiedLabel: ambiguous ? null : verifiedLabel,
    reviewer: Object.freeze({ kind: reviewerKind, id: reviewerId, note }),
    automaticCorrectionAuthority: false,
  })
}
