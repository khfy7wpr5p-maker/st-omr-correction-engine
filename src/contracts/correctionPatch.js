export const PATCH_OPERATION = Object.freeze({
  CHANGE_VOICE: 'CHANGE_VOICE',
  CHANGE_DURATION: 'CHANGE_DURATION',
  CHANGE_STAFF: 'CHANGE_STAFF',
  CHANGE_RELATION: 'CHANGE_RELATION',
})

export function createCorrectionPatch({ eventId, measureKey, operation, before, after, evidence = [], confidence = 0, solverVersion = 'shadow' }) {
  if (typeof eventId !== 'string' || !eventId.trim()) throw new TypeError('eventId is required.')
  if (typeof measureKey !== 'string' || !measureKey.trim()) throw new TypeError('measureKey is required.')
  if (!Object.values(PATCH_OPERATION).includes(operation)) throw new TypeError('Unsupported patch operation.')
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new RangeError('confidence must be between 0 and 1.')
  return Object.freeze({ eventId, measureKey, operation, before, after, evidence: Object.freeze([...evidence]), confidence, solverVersion })
}
