export const EVIDENCE_SOURCE = Object.freeze({
  VALIDATOR: 'validator',
  SYMBOLIC: 'symbolic',
  VISUAL: 'visual',
  TEACHER: 'teacher',
})

export function createEvidence({ source, code, weight = 1, location = null, details = null }) {
  if (!Object.values(EVIDENCE_SOURCE).includes(source)) throw new TypeError('Unsupported evidence source.')
  if (typeof code !== 'string' || !code.trim()) throw new TypeError('Evidence code is required.')
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new RangeError('Evidence weight must be between 0 and 1.')
  return Object.freeze({ source, code, weight, location, details })
}
