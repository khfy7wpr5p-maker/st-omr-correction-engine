import { CORRECTION_EVENT_ORIGIN, TEACHER_DECISION } from './teacherGoldCorrectionEvent.js'

const SHA256 = /^[0-9a-f]{64}$/i

export const REAL_OMR_GOLD_REQUIRED_PROVENANCE = Object.freeze([
  'teacherApprovalId',
  'sourceRevisionId',
  'sourceHash',
  'engineVersion',
])

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

function sameGoldValue(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
}

export function evaluateRealOmrGoldEligibility(event) {
  const reasons = []
  if (!event || typeof event !== 'object') {
    return Object.freeze({ eligible: false, reasons: Object.freeze(['EVENT_REQUIRED']) })
  }

  if (event.origin !== CORRECTION_EVENT_ORIGIN.REAL_OMR) reasons.push('ORIGIN_NOT_REAL_OMR')
  if (!nonEmptyString(event.eventId)) reasons.push('EVENT_ID_REQUIRED')
  if (!nonEmptyString(event.sourceId)) reasons.push('SOURCE_ID_REQUIRED')
  if (!nonEmptyString(event.engineId)) reasons.push('ENGINE_ID_REQUIRED')
  if (!nonEmptyString(event.taxonomyVersion)) reasons.push('TAXONOMY_VERSION_REQUIRED')
  if (event.teacherDecision === TEACHER_DECISION.AMBIGUOUS) reasons.push('TEACHER_DECISION_AMBIGUOUS')
  if (!Object.values(TEACHER_DECISION).includes(event.teacherDecision)) reasons.push('TEACHER_DECISION_REQUIRED')
  if (event.candidateValue == null) reasons.push('CANDIDATE_VALUE_REQUIRED')

  const provenance = event.provenance
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    reasons.push('PROVENANCE_REQUIRED')
  } else {
    for (const field of REAL_OMR_GOLD_REQUIRED_PROVENANCE) {
      if (!nonEmptyString(provenance[field])) reasons.push(`PROVENANCE_${field.toUpperCase()}_REQUIRED`)
    }
    if (nonEmptyString(provenance.sourceHash) && !SHA256.test(provenance.sourceHash)) reasons.push('PROVENANCE_SOURCE_HASH_INVALID')
  }

  return Object.freeze({ eligible: reasons.length === 0, reasons: Object.freeze(reasons) })
}

export function createRealOmrCalibrationRecord({ event, confidence }) {
  const eligibility = evaluateRealOmrGoldEligibility(event)
  if (!eligibility.eligible) throw new TypeError(`REAL_OMR event is not calibration-eligible: ${eligibility.reasons.join(',')}`)
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new TypeError('confidence must be between 0 and 1.')

  return Object.freeze({
    eventId: event.eventId,
    sourceId: event.sourceId,
    engineId: event.engineId,
    errorClass: event.errorClass,
    taxonomyVersion: event.taxonomyVersion,
    confidence,
    correct: sameGoldValue(event.candidateValue, event.teacherGoldValue),
    teacherDecision: event.teacherDecision,
    correctionSafe: event.correctionSafe,
    provenance: Object.freeze({ ...event.provenance }),
  })
}

export function buildRealOmrCalibrationRecords(samples) {
  if (!Array.isArray(samples)) throw new TypeError('samples must be an array.')
  const seen = new Set()
  const records = samples.map((sample, index) => {
    if (!sample || typeof sample !== 'object') throw new TypeError(`sample ${index} must be an object.`)
    const eventId = sample.event?.eventId
    if (seen.has(eventId)) throw new TypeError(`duplicate REAL_OMR eventId: ${eventId}`)
    const record = createRealOmrCalibrationRecord(sample)
    seen.add(record.eventId)
    return record
  })
  return Object.freeze(records)
}
