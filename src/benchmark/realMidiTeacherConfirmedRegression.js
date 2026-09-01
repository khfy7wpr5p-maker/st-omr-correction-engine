import { REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1 } from './realOmrMidiShadowReviewBatch.js'

export const REAL_MIDI_TEACHER_CONFIRMED_REGRESSION_VERSION = '1.0.0'

export const REAL_MIDI_TEACHER_CONFIRMED_PRIMARY_DECISION = Object.freeze({
  DIAGNOSTIC_FALSE_POSITIVE: 'DIAGNOSTIC_FALSE_POSITIVE',
})

const REVIEW_IDS = Object.freeze([
  'sor-score-01', 'sor-score-02', 'sor-score-03', 'sor-score-04', 'sor-score-05',
  'sor-score-06', 'sor-score-07', 'sor-score-08', 'sor-score-09', 'sor-score-10',
  'sor-score-11', 'sor-score-12', 'sor-score-13', 'sor-score-14', 'sor-score-15',
  'sor-score-16', 'sor-midi-witness-17', 'sor-midi-witness-18', 'sor-midi-witness-19', 'sor-midi-witness-20',
  'bach-score-01', 'bach-score-02', 'bach-score-03', 'bach-score-04', 'bach-score-05',
  'bach-score-06', 'bach-score-07', 'bach-score-08', 'bach-score-09', 'bach-score-10',
  'bach-score-11', 'bach-score-12', 'bach-score-13', 'bach-score-14', 'bach-score-15',
  'bach-score-16', 'bach-midi-witness-17', 'bach-midi-witness-18', 'bach-midi-witness-19', 'bach-midi-witness-20',
])

const SECONDARY_OBSERVATIONS = Object.freeze({
  'sor-score-07': Object.freeze({ confirmedRealDiagnosticCodes: Object.freeze(['MIDI_DURATION_CONFLICT']), note: 'Pitch is correct; teacher review confirmed a real duration/voice serialization problem.' }),
  'sor-score-12': Object.freeze({ confirmedRealDiagnosticCodes: Object.freeze([]), note: 'Primary pitch and listed duration conflict are false positives; onset displacement was separately observed.' }),
  'bach-score-07': Object.freeze({ confirmedRealDiagnosticCodes: Object.freeze([]), note: 'Primary pitch conflict is a matcher false positive caused by onset/voice/chord-grouping displacement.' }),
  'bach-score-08': Object.freeze({ confirmedRealDiagnosticCodes: Object.freeze([]), note: 'Primary pitch conflict is a matcher false positive caused by onset/voice/chord-grouping displacement.' }),
  'bach-score-09': Object.freeze({ confirmedRealDiagnosticCodes: Object.freeze([]), note: 'Primary pitch conflict is a matcher false positive caused by onset/voice/chord-grouping displacement.' }),
  'bach-score-10': Object.freeze({ confirmedRealDiagnosticCodes: Object.freeze(['MIDI_DURATION_CONFLICT']), note: 'Pitch is correct; teacher review confirmed dotted-eighth versus eighth duration mismatch.' }),
  'bach-score-16': Object.freeze({ confirmedRealDiagnosticCodes: Object.freeze([]), note: 'Primary pitch conflict is false; timing/onset assignment is displaced. Duration was not independently labeled.' }),
})

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function indexedBatchItems() {
  const index = new Map()
  for (const work of REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.works) {
    for (const item of work.reviewItems) {
      if (index.has(item.reviewId)) throw new TypeError(`Duplicate shadow review id: ${item.reviewId}`)
      index.set(item.reviewId, { work, item })
    }
  }
  return index
}

const batchIndex = indexedBatchItems()
const items = REVIEW_IDS.map((reviewId) => {
  const entry = batchIndex.get(reviewId)
  if (!entry) throw new TypeError(`Teacher-confirmed regression review id is not present in the pinned shadow batch: ${reviewId}`)
  const secondary = SECONDARY_OBSERVATIONS[reviewId] ?? null
  return {
    reviewId,
    workId: entry.work.id,
    measureKey: entry.item.measureKey,
    reviewItemKind: entry.item.kind,
    primaryDiagnosticCode: entry.item.diagnosticCode,
    observedDiagnosticCodes: entry.item.observedDiagnosticCodes,
    scoreEventId: entry.item.scoreEventId,
    midiEventIds: entry.item.midiEventIds,
    expectedPrimaryDecision: REAL_MIDI_TEACHER_CONFIRMED_PRIMARY_DECISION.DIAGNOSTIC_FALSE_POSITIVE,
    verifiedLabel: false,
    secondaryObservation: secondary,
    automaticCorrectionAuthority: false,
  }
})

export const REAL_MIDI_TEACHER_CONFIRMED_REGRESSION_V1 = deepFreeze({
  id: 'real-midi-teacher-confirmed-primary-regression-v1',
  schemaVersion: REAL_MIDI_TEACHER_CONFIRMED_REGRESSION_VERSION,
  sourceBatchId: REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.id,
  sourceBatchSha256: REAL_OMR_MIDI_SHADOW_REVIEW_BATCH_V1.batchSha256,
  reviewScope: 'PRIMARY_DIAGNOSTIC_ONLY',
  provenance: {
    reviewSource: 'HUMAN_TEACHER_CONFIRMATION',
    reviewerId: null,
    reviewedAt: null,
    reviewerIdentityClaimed: false,
    exactReviewTimestampClaimed: false,
  },
  eligibility: {
    teacherGoldEligible: false,
    measuredReliabilityEligible: false,
    calibrationEligible: false,
    recallIdentifiable: false,
  },
  safety: {
    shadowOnly: true,
    weight: 0,
    automaticCorrectionAuthority: false,
    sourceMutation: false,
    extraMidiMeansMissingOmr: false,
  },
  expectedSummary: {
    sampleSize: 40,
    sorCount: 20,
    bachCount: 20,
    diagnosticCorrectCount: 0,
    diagnosticFalsePositiveCount: 40,
    ambiguousCount: 0,
    primaryDiagnosticPrecision: 0,
    recall: null,
  },
  items,
})

export function summarizeRealMidiTeacherConfirmedRegression(regression = REAL_MIDI_TEACHER_CONFIRMED_REGRESSION_V1) {
  if (!regression || !Array.isArray(regression.items)) throw new TypeError('Teacher-confirmed regression fixture is required.')
  const diagnosticCorrectCount = regression.items.filter((item) => item.verifiedLabel === true).length
  const diagnosticFalsePositiveCount = regression.items.filter((item) => item.verifiedLabel === false).length
  const ambiguousCount = regression.items.length - diagnosticCorrectCount - diagnosticFalsePositiveCount
  const binaryCount = diagnosticCorrectCount + diagnosticFalsePositiveCount
  return Object.freeze({
    sampleSize: regression.items.length,
    diagnosticCorrectCount,
    diagnosticFalsePositiveCount,
    ambiguousCount,
    primaryDiagnosticPrecision: binaryCount ? diagnosticCorrectCount / binaryCount : null,
    recall: null,
    recallIdentifiable: false,
    automaticCorrectionAuthority: false,
  })
}
