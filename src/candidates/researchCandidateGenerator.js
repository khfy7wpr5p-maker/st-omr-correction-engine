import { POLYPHONIC_ERROR_CLASS } from '../contracts/errorTaxonomy.js'

export const RESEARCH_CANDIDATE_OPERATION = Object.freeze({
  CHANGE_VOICE: 'CHANGE_VOICE',
  CHANGE_DURATION: 'CHANGE_DURATION',
  CHANGE_ONSET: 'CHANGE_ONSET',
  CHANGE_STAFF: 'CHANGE_STAFF',
  ADD_TIE: 'ADD_TIE',
  REMOVE_TIE: 'REMOVE_TIE',
})

const CLASS_OPERATION = Object.freeze({
  [POLYPHONIC_ERROR_CLASS.VOICE]: RESEARCH_CANDIDATE_OPERATION.CHANGE_VOICE,
  [POLYPHONIC_ERROR_CLASS.DURATION]: RESEARCH_CANDIDATE_OPERATION.CHANGE_DURATION,
  [POLYPHONIC_ERROR_CLASS.ONSET]: RESEARCH_CANDIDATE_OPERATION.CHANGE_ONSET,
  [POLYPHONIC_ERROR_CLASS.STAFF]: RESEARCH_CANDIDATE_OPERATION.CHANGE_STAFF,
  [POLYPHONIC_ERROR_CLASS.TIE]: null,
})

export const DEFAULT_RESEARCH_CANDIDATE_LIMITS = Object.freeze({ maxPerEvent: 4, maxTotal: 16 })

function validateLimit(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer.`)
}

export function generateBoundedResearchCandidates(requests, options = {}) {
  if (!Array.isArray(requests)) throw new TypeError('requests must be an array.')
  const limits = { ...DEFAULT_RESEARCH_CANDIDATE_LIMITS, ...options }
  validateLimit(limits.maxPerEvent, 'maxPerEvent')
  validateLimit(limits.maxTotal, 'maxTotal')

  const candidates = []
  let exhausted = false

  for (const request of requests) {
    if (!request || typeof request !== 'object') throw new TypeError('candidate requests must be objects.')
    if (typeof request.eventId !== 'string' || !request.eventId.trim()) throw new TypeError('eventId is required.')
    if (!(request.errorClass in CLASS_OPERATION)) continue
    if (!Array.isArray(request.candidateValues)) throw new TypeError('candidateValues must be an array.')

    const operation = request.errorClass === POLYPHONIC_ERROR_CLASS.TIE
      ? (request.tieAction === 'ADD' ? RESEARCH_CANDIDATE_OPERATION.ADD_TIE : request.tieAction === 'REMOVE' ? RESEARCH_CANDIDATE_OPERATION.REMOVE_TIE : null)
      : CLASS_OPERATION[request.errorClass]
    if (!operation) continue

    const unique = []
    for (const value of request.candidateValues) {
      if (Object.is(value, request.originalValue)) continue
      if (!unique.some((item) => JSON.stringify(item) === JSON.stringify(value))) unique.push(value)
      if (unique.length >= limits.maxPerEvent) { exhausted = request.candidateValues.length > unique.length; break }
    }

    for (const value of unique) {
      if (candidates.length >= limits.maxTotal) { exhausted = true; break }
      candidates.push(Object.freeze({
        mode: 'RESEARCH_ONLY',
        applyEnabled: false,
        eventId: request.eventId,
        errorClass: request.errorClass,
        operation,
        before: request.originalValue,
        after: value,
        evidence: Object.freeze([...(request.evidence ?? [])]),
      }))
    }
    if (candidates.length >= limits.maxTotal) break
  }

  return Object.freeze({
    mode: 'RESEARCH_ONLY',
    applyEnabled: false,
    candidates: Object.freeze(candidates),
    exhausted,
    limits: Object.freeze(limits),
  })
}
