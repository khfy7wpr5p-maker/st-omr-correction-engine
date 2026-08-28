import { isPolyphonicErrorClass } from '../contracts/errorTaxonomy.js'
import {
  CORRECTION_EVENT_ORIGIN,
  TEACHER_DECISION,
  createTeacherGoldCorrectionEvent,
} from './teacherGoldCorrectionEvent.js'

const SHA256 = /^[0-9a-f]{64}$/i

export const REAL_OMR_ANNOTATION_STATUS = Object.freeze({
  PENDING_TEACHER_REVIEW: 'PENDING_TEACHER_REVIEW',
})

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

function nonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer.`)
}

function freezeOptionalObject(value, name) {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object when provided.`)
  return Object.freeze({ ...value })
}

function freezeBbox(bbox) {
  if (bbox == null) return null
  if (!bbox || typeof bbox !== 'object' || Array.isArray(bbox)) throw new TypeError('bbox must be an object when provided.')
  for (const key of ['x', 'y', 'width', 'height']) {
    if (!Number.isFinite(bbox[key]) || bbox[key] < 0) throw new TypeError(`bbox.${key} must be a non-negative number.`)
  }
  return Object.freeze({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })
}

export function createRealOmrReviewObservation({
  observationId,
  sourceId,
  engineId,
  engineVersion,
  sourceRevisionId,
  sourceHash,
  page,
  system,
  measure,
  staff,
  voice,
  errorClass,
  originalValue,
  candidateValue = null,
  candidateConfidence = null,
  evidenceRefs = [],
  bbox = null,
  imageCropRef = null,
  sourceQuality = null,
  polyphonyComplexity = null,
}) {
  nonEmptyString(observationId, 'observationId')
  nonEmptyString(sourceId, 'sourceId')
  nonEmptyString(engineId, 'engineId')
  nonEmptyString(engineVersion, 'engineVersion')
  nonEmptyString(sourceRevisionId, 'sourceRevisionId')
  if (typeof sourceHash !== 'string' || !SHA256.test(sourceHash)) throw new TypeError('sourceHash must be a SHA-256 hex digest.')
  nonNegativeInteger(page, 'page')
  nonNegativeInteger(system, 'system')
  nonEmptyString(String(measure), 'measure')
  if (!Number.isInteger(staff) || staff < 1) throw new TypeError('staff must be a positive integer.')
  if (!Number.isInteger(voice) || voice < 1) throw new TypeError('voice must be a positive integer.')
  if (!isPolyphonicErrorClass(errorClass)) throw new TypeError('Unsupported polyphonic error class.')
  if (candidateConfidence != null && (!Number.isFinite(candidateConfidence) || candidateConfidence < 0 || candidateConfidence > 1)) {
    throw new TypeError('candidateConfidence must be between 0 and 1 when provided.')
  }
  if (!Array.isArray(evidenceRefs)) throw new TypeError('evidenceRefs must be an array.')
  for (const ref of evidenceRefs) nonEmptyString(ref, 'evidenceRef')
  if (imageCropRef != null) nonEmptyString(imageCropRef, 'imageCropRef')

  return Object.freeze({
    observationId,
    sourceId,
    engineId,
    engineVersion,
    sourceRevisionId,
    sourceHash,
    page,
    system,
    measure: String(measure),
    staff,
    voice,
    errorClass,
    originalValue,
    candidateValue,
    candidateConfidence,
    evidenceRefs: Object.freeze([...evidenceRefs]),
    bbox: freezeBbox(bbox),
    imageCropRef,
    sourceQuality: freezeOptionalObject(sourceQuality, 'sourceQuality'),
    polyphonyComplexity: freezeOptionalObject(polyphonyComplexity, 'polyphonyComplexity'),
    status: REAL_OMR_ANNOTATION_STATUS.PENDING_TEACHER_REVIEW,
  })
}

function compareObservation(left, right) {
  return left.sourceId.localeCompare(right.sourceId)
    || left.page - right.page
    || left.system - right.system
    || left.measure.localeCompare(right.measure, undefined, { numeric: true })
    || left.staff - right.staff
    || left.voice - right.voice
    || left.observationId.localeCompare(right.observationId)
}

export function buildRealOmrAnnotationBatch(observations, { batchId, maxItems = 50 } = {}) {
  nonEmptyString(batchId, 'batchId')
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array.')
  if (!Number.isInteger(maxItems) || maxItems < 1) throw new TypeError('maxItems must be a positive integer.')

  const seen = new Set()
  for (const observation of observations) {
    if (!observation || observation.status !== REAL_OMR_ANNOTATION_STATUS.PENDING_TEACHER_REVIEW) {
      throw new TypeError('Only pending REAL_OMR review observations can enter a batch.')
    }
    if (seen.has(observation.observationId)) throw new TypeError(`duplicate observationId: ${observation.observationId}`)
    seen.add(observation.observationId)
  }

  const ordered = [...observations].sort(compareObservation)
  const items = ordered.slice(0, maxItems)
  return Object.freeze({
    batchId,
    status: REAL_OMR_ANNOTATION_STATUS.PENDING_TEACHER_REVIEW,
    items: Object.freeze(items),
    totalInputCount: observations.length,
    deferredCount: Math.max(0, observations.length - items.length),
    teacherDecisionsCreated: 0,
  })
}

export function annotateRealOmrObservation(observation, annotation) {
  if (!observation || observation.status !== REAL_OMR_ANNOTATION_STATUS.PENDING_TEACHER_REVIEW) {
    throw new TypeError('A pending REAL_OMR review observation is required.')
  }
  if (!annotation || typeof annotation !== 'object' || Array.isArray(annotation)) throw new TypeError('annotation is required.')
  nonEmptyString(annotation.teacherApprovalId, 'teacherApprovalId')
  if (!Object.values(TEACHER_DECISION).includes(annotation.teacherDecision)) throw new TypeError('Explicit teacherDecision is required.')
  if (!Object.prototype.hasOwnProperty.call(annotation, 'teacherGoldValue')) throw new TypeError('Explicit teacherGoldValue is required.')
  if (typeof annotation.correctionNeeded !== 'boolean') throw new TypeError('correctionNeeded must be boolean.')
  if (typeof annotation.correctionSafe !== 'boolean') throw new TypeError('correctionSafe must be boolean.')
  if (typeof annotation.evidenceAvailable !== 'boolean') throw new TypeError('evidenceAvailable must be boolean.')

  return createTeacherGoldCorrectionEvent({
    eventId: observation.observationId,
    sourceId: observation.sourceId,
    engineId: observation.engineId,
    origin: CORRECTION_EVENT_ORIGIN.REAL_OMR,
    page: observation.page,
    system: observation.system,
    measure: observation.measure,
    staff: observation.staff,
    voice: observation.voice,
    errorClass: observation.errorClass,
    originalValue: observation.originalValue,
    teacherGoldValue: annotation.teacherGoldValue,
    candidateValue: observation.candidateValue,
    correctionNeeded: annotation.correctionNeeded,
    correctionSafe: annotation.correctionSafe,
    evidenceAvailable: annotation.evidenceAvailable,
    teacherDecision: annotation.teacherDecision,
    provenance: {
      teacherApprovalId: annotation.teacherApprovalId,
      sourceRevisionId: observation.sourceRevisionId,
      sourceHash: observation.sourceHash,
      engineVersion: observation.engineVersion,
      observationId: observation.observationId,
      reviewNote: annotation.reviewNote ?? null,
    },
    bbox: observation.bbox,
    imageCropRef: observation.imageCropRef,
    sourceQuality: observation.sourceQuality,
    polyphonyComplexity: observation.polyphonyComplexity,
  })
}
