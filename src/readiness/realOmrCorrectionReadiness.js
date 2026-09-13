import { evaluateRealOmrGoldEligibility } from '../benchmark/realOmrGoldEligibility.js'
import { CORRECTION_EVENT_ORIGIN, TEACHER_DECISION } from '../benchmark/teacherGoldCorrectionEvent.js'
import { CORRECTION_READINESS, evaluateCorrectionReadiness } from './productionReadiness.js'

export const REAL_OMR_CORRECTION_EVIDENCE_SCOPE = 'REAL_OMR_CORRECTION_NEEDED_ONLY'

const READINESS_ORDER = Object.freeze([
  CORRECTION_READINESS.RESEARCH_ONLY,
  CORRECTION_READINESS.SHADOW_READY,
  CORRECTION_READINESS.TEACHER_REVIEW_READY,
  CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE,
  CORRECTION_READINESS.PRODUCTION_APPROVED,
])

function ensureEvents(events) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('Each event must be an object.')
  }
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1
}

function isAcceptedCorrectionNeeded(event) {
  return evaluateRealOmrGoldEligibility(event).eligible
    && event.correctionNeeded === true
    && event.teacherDecision === TEACHER_DECISION.ACCEPT_CORRECTION
    && event.evidenceAvailable === true
}

export function summarizeRealOmrCorrectionEvidence(events = []) {
  ensureEvents(events)

  const realOmrEvents = events.filter((event) => event.origin === CORRECTION_EVENT_ORIGIN.REAL_OMR)
  const eligibleRealOmrEvents = realOmrEvents.filter((event) => evaluateRealOmrGoldEligibility(event).eligible)
  const acceptedCorrectionNeeded = eligibleRealOmrEvents.filter(isAcceptedCorrectionNeeded)
  const safeAcceptedCorrectionNeeded = acceptedCorrectionNeeded.filter((event) => event.correctionSafe === true)
  const noCorrectionNeeded = eligibleRealOmrEvents.filter((event) => event.teacherDecision === TEACHER_DECISION.NO_CORRECTION_NEEDED)
  const ambiguous = realOmrEvents.filter((event) => event.teacherDecision === TEACHER_DECISION.AMBIGUOUS)

  const byClass = {}
  const correctionNeededByClass = {}
  for (const event of eligibleRealOmrEvents) increment(byClass, event.errorClass)
  for (const event of acceptedCorrectionNeeded) increment(correctionNeededByClass, event.errorClass)

  return Object.freeze({
    scope: REAL_OMR_CORRECTION_EVIDENCE_SCOPE,
    realOmrLabelCount: realOmrEvents.length,
    eligibleRealOmrLabelCount: eligibleRealOmrEvents.length,
    ineligibleRealOmrLabelCount: realOmrEvents.length - eligibleRealOmrEvents.length,
    independentRealOmrSourceCount: new Set(eligibleRealOmrEvents.map((event) => event.sourceId)).size,
    acceptedCorrectionNeededCount: acceptedCorrectionNeeded.length,
    acceptedCorrectionNeededSourceCount: new Set(acceptedCorrectionNeeded.map((event) => event.sourceId)).size,
    safeAcceptedCorrectionNeededCount: safeAcceptedCorrectionNeeded.length,
    safeAcceptedCorrectionNeededSourceCount: new Set(safeAcceptedCorrectionNeeded.map((event) => event.sourceId)).size,
    noCorrectionNeededCount: noCorrectionNeeded.length,
    ambiguousCount: ambiguous.length,
    byClass: Object.freeze({ ...byClass }),
    correctionNeededByClass: Object.freeze({ ...correctionNeededByClass }),
    noCorrectionLabelsCanPromoteAutomaticCorrection: false,
    ineligibleLabelsCanPromoteAutomaticCorrection: false,
  })
}

function capResult(result, capStatus, blocker) {
  const achievedIndex = READINESS_ORDER.indexOf(result.achievedStatus)
  const capIndex = READINESS_ORDER.indexOf(capStatus)
  if (achievedIndex <= capIndex) {
    return Object.freeze({
      ...result,
      approved: false,
      blockers: Object.freeze([...result.blockers, blocker]),
    })
  }
  return Object.freeze({
    ...result,
    achievedStatus: capStatus,
    approved: false,
    blockers: Object.freeze([...result.blockers, blocker]),
  })
}

export function evaluateRealOmrCorrectionReadiness({
  events = [],
  requestedStatus = CORRECTION_READINESS.PRODUCTION_APPROVED,
  evidence = {},
} = {}) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new TypeError('evidence must be an object.')

  const summary = summarizeRealOmrCorrectionEvidence(events)
  const correctionNeededTeacherGoldAvailable = summary.acceptedCorrectionNeededCount > 0
  const correctionSafeTeacherGoldAvailable = summary.safeAcceptedCorrectionNeededCount > 0

  const result = evaluateCorrectionReadiness({
    requestedStatus,
    evidence: {
      ...evidence,
      teacherGoldEvidenceAvailable: correctionNeededTeacherGoldAvailable,
    },
  })

  let gated = result
  const requestedIndex = READINESS_ORDER.indexOf(requestedStatus)
  const autoIndex = READINESS_ORDER.indexOf(CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE)
  if (requestedIndex >= autoIndex && correctionNeededTeacherGoldAvailable && !correctionSafeTeacherGoldAvailable) {
    gated = capResult(
      result,
      CORRECTION_READINESS.TEACHER_REVIEW_READY,
      Object.freeze({
        status: CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE,
        requirement: 'correctionSafeTeacherGoldEvidenceAvailable',
      }),
    )
  }

  return Object.freeze({
    ...gated,
    evidenceScope: REAL_OMR_CORRECTION_EVIDENCE_SCOPE,
    correctionNeededTeacherGoldAvailable,
    correctionSafeTeacherGoldAvailable,
    noCorrectionLabelsUsedForAutomaticPromotion: false,
    ineligibleLabelsUsedForAutomaticPromotion: false,
    summary,
  })
}
