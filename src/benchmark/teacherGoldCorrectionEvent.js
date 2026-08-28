import { POLYPHONIC_ERROR_TAXONOMY_VERSION, isPolyphonicErrorClass } from '../contracts/errorTaxonomy.js'

export const CORRECTION_EVENT_ORIGIN = Object.freeze({
  REAL_OMR: 'REAL_OMR',
  CONTROLLED_MUTATION: 'CONTROLLED_MUTATION',
  SYNTHETIC: 'SYNTHETIC',
})

export const TEACHER_DECISION = Object.freeze({
  ACCEPT_CORRECTION: 'ACCEPT_CORRECTION',
  REJECT_CORRECTION: 'REJECT_CORRECTION',
  NO_CORRECTION_NEEDED: 'NO_CORRECTION_NEEDED',
  AMBIGUOUS: 'AMBIGUOUS',
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
  if (typeof bbox !== 'object' || Array.isArray(bbox)) throw new TypeError('bbox must be an object when provided.')
  for (const key of ['x', 'y', 'width', 'height']) {
    if (!Number.isFinite(bbox[key]) || bbox[key] < 0) throw new TypeError(`bbox.${key} must be a non-negative number.`)
  }
  return Object.freeze({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })
}

export function createTeacherGoldCorrectionEvent({
  eventId,
  sourceId,
  engineId,
  origin,
  page,
  system,
  measure,
  staff,
  voice,
  errorClass,
  originalValue,
  teacherGoldValue,
  candidateValue = null,
  correctionNeeded,
  correctionSafe,
  evidenceAvailable,
  teacherDecision,
  provenance,
  bbox = null,
  imageCropRef = null,
  sourceQuality = null,
  polyphonyComplexity = null,
  taxonomyVersion = POLYPHONIC_ERROR_TAXONOMY_VERSION,
}) {
  nonEmptyString(eventId, 'eventId')
  nonEmptyString(sourceId, 'sourceId')
  nonEmptyString(engineId, 'engineId')
  if (!Object.values(CORRECTION_EVENT_ORIGIN).includes(origin)) throw new TypeError('Unsupported correction event origin.')
  nonNegativeInteger(page, 'page')
  nonNegativeInteger(system, 'system')
  nonEmptyString(String(measure), 'measure')
  if (!Number.isInteger(staff) || staff < 1) throw new TypeError('staff must be a positive integer.')
  if (!Number.isInteger(voice) || voice < 1) throw new TypeError('voice must be a positive integer.')
  if (!isPolyphonicErrorClass(errorClass)) throw new TypeError('Unsupported polyphonic error class.')
  if (typeof correctionNeeded !== 'boolean') throw new TypeError('correctionNeeded must be boolean.')
  if (typeof correctionSafe !== 'boolean') throw new TypeError('correctionSafe must be boolean.')
  if (typeof evidenceAvailable !== 'boolean') throw new TypeError('evidenceAvailable must be boolean.')
  if (!Object.values(TEACHER_DECISION).includes(teacherDecision)) throw new TypeError('Unsupported teacher decision.')
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) throw new TypeError('provenance is required.')
  if (typeof taxonomyVersion !== 'string' || !taxonomyVersion.trim()) throw new TypeError('taxonomyVersion is required.')
  if (imageCropRef != null && (typeof imageCropRef !== 'string' || !imageCropRef.trim())) throw new TypeError('imageCropRef must be a non-empty string when provided.')

  return Object.freeze({
    eventId,
    sourceId,
    engineId,
    origin,
    page,
    system,
    measure: String(measure),
    staff,
    voice,
    errorClass,
    taxonomyVersion,
    originalValue,
    teacherGoldValue,
    candidateValue,
    correctionNeeded,
    correctionSafe,
    evidenceAvailable,
    teacherDecision,
    provenance: Object.freeze({ ...provenance }),
    bbox: freezeBbox(bbox),
    imageCropRef,
    sourceQuality: freezeOptionalObject(sourceQuality, 'sourceQuality'),
    polyphonyComplexity: freezeOptionalObject(polyphonyComplexity, 'polyphonyComplexity'),
  })
}
