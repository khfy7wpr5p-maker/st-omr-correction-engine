import { CORRECTION_STATUS } from '../contracts/status.js'

function patchKey(patch) {
  return JSON.stringify([patch.eventId, patch.measureKey, patch.operation, patch.before, patch.after])
}

function patchesEqual(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false
  const a = actual.map(patchKey).sort()
  const b = expected.map(patchKey).sort()
  return a.every((value, index) => value === b[index])
}

export async function runCorrectionBenchmark(goldCases, solve) {
  if (!Array.isArray(goldCases)) throw new TypeError('goldCases must be an array.')
  if (typeof solve !== 'function') throw new TypeError('solve must be a function.')

  for (const gold of goldCases) {
    if (!gold?.teacherApproval?.approved) throw new TypeError('Benchmark refuses non-approved gold data.')
  }

  let resolved = 0
  let correctResolved = 0
  let incorrectResolved = 0
  let ambiguous = 0
  let blockedOrUnsupported = 0

  const cases = []
  for (const gold of goldCases) {
    const result = await solve(gold.input)
    let outcome = result?.status ?? 'INVALID_RESULT'
    let correct = false

    if (result?.status === CORRECTION_STATUS.RESOLVED) {
      resolved += 1
      correct = patchesEqual(result.proposedPatches, gold.expectedPatches)
      if (correct) correctResolved += 1
      else incorrectResolved += 1
    } else if (result?.status === CORRECTION_STATUS.AMBIGUOUS || result?.status === CORRECTION_STATUS.NO_CHANGE) {
      ambiguous += 1
    } else {
      blockedOrUnsupported += 1
    }

    cases.push(Object.freeze({ id: gold.id, outcome, correct }))
  }

  const total = goldCases.length
  const coverage = total > 0 ? resolved / total : 0
  const precision = resolved > 0 ? correctResolved / resolved : null
  return Object.freeze({
    total,
    resolved,
    correctResolved,
    incorrectResolved,
    ambiguous,
    blockedOrUnsupported,
    coverage,
    precision,
    cases: Object.freeze(cases),
  })
}
