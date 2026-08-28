import { EVIDENCE_SOURCE, createEvidence } from '../contracts/evidence.js'

function nonEmpty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`)
}

function bboxValue(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be non-negative.`)
}

function normalizeQuality(sourceQuality) {
  if (sourceQuality == null) return null
  if (typeof sourceQuality !== 'object' || Array.isArray(sourceQuality)) throw new TypeError('sourceQuality must be an object.')
  return Object.freeze({ ...sourceQuality })
}

export function createVisualLocalizationEvidence({
  eventId,
  page,
  systemId,
  measureId,
  staffId,
  bbox,
  imageCropRef,
  localizationConfidence,
  sourceQuality = null,
}) {
  nonEmpty(eventId, 'eventId')
  positiveInteger(page, 'page')
  nonEmpty(systemId, 'systemId')
  nonEmpty(measureId, 'measureId')
  positiveInteger(staffId, 'staffId')
  if (!bbox || typeof bbox !== 'object' || Array.isArray(bbox)) throw new TypeError('bbox is required.')
  bboxValue(bbox.x, 'bbox.x')
  bboxValue(bbox.y, 'bbox.y')
  bboxValue(bbox.width, 'bbox.width')
  bboxValue(bbox.height, 'bbox.height')
  nonEmpty(imageCropRef, 'imageCropRef')
  if (!Number.isFinite(localizationConfidence) || localizationConfidence < 0 || localizationConfidence > 1) {
    throw new TypeError('localizationConfidence must be between 0 and 1.')
  }

  const normalizedBbox = Object.freeze({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })
  return createEvidence({
    source: EVIDENCE_SOURCE.VISUAL,
    code: 'IMAGE_LOCALIZATION',
    weight: localizationConfidence,
    location: Object.freeze({ eventId, page, systemId, measureId, staffId, bbox: normalizedBbox }),
    details: Object.freeze({ imageCropRef, localizationConfidence, sourceQuality: normalizeQuality(sourceQuality) }),
  })
}
