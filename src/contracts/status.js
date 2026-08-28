export const CORRECTION_STATUS = Object.freeze({
  NO_CHANGE: 'NO_CHANGE',
  RESOLVED: 'RESOLVED',
  AMBIGUOUS: 'AMBIGUOUS',
  UNSUPPORTED: 'UNSUPPORTED',
  BLOCKED: 'BLOCKED',
})

export function isCorrectionStatus(value) {
  return Object.values(CORRECTION_STATUS).includes(value)
}
