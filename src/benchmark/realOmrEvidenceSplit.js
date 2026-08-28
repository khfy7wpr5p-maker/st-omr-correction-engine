const SHA256 = /^[0-9a-f]{64}$/i

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

function validateRecord(record, label, index) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError(`${label} record ${index} must be an object.`)
  nonEmptyString(record.eventId, `${label} record eventId`)
  nonEmptyString(record.sourceId, `${label} record sourceId`)
  nonEmptyString(record.engineId, `${label} record engineId`)
  if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) throw new TypeError(`${label} record confidence must be between 0 and 1.`)
  if (typeof record.correct !== 'boolean') throw new TypeError(`${label} record correct must be boolean.`)
  if (!record.provenance || typeof record.provenance !== 'object' || Array.isArray(record.provenance)) throw new TypeError(`${label} record provenance is required.`)
  if (!SHA256.test(record.provenance.sourceHash ?? '')) throw new TypeError(`${label} record provenance.sourceHash must be SHA-256.`)
  nonEmptyString(record.provenance.sourceRevisionId, `${label} record provenance.sourceRevisionId`)
  nonEmptyString(record.provenance.teacherApprovalId, `${label} record provenance.teacherApprovalId`)
  nonEmptyString(record.provenance.engineVersion, `${label} record provenance.engineVersion`)
}

function uniqueIds(records, label) {
  const seen = new Set()
  for (const record of records) {
    if (seen.has(record.eventId)) throw new TypeError(`duplicate eventId in ${label}: ${record.eventId}`)
    seen.add(record.eventId)
  }
  return seen
}

function sourceHashes(records) {
  return new Set(records.map((record) => record.provenance.sourceHash))
}

function groupCounts(records, keyFn) {
  const counts = new Map()
  for (const record of records) {
    const key = keyFn(record)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Object.freeze(Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b))))
}

export function createRealOmrEvidenceSplit({ splitId, calibration = [], finalEvaluation = [] }) {
  nonEmptyString(splitId, 'splitId')
  if (!Array.isArray(calibration) || !Array.isArray(finalEvaluation)) throw new TypeError('calibration and finalEvaluation must be arrays.')
  calibration.forEach((record, index) => validateRecord(record, 'calibration', index))
  finalEvaluation.forEach((record, index) => validateRecord(record, 'finalEvaluation', index))

  const calibrationIds = uniqueIds(calibration, 'calibration')
  const evaluationIds = uniqueIds(finalEvaluation, 'finalEvaluation')
  for (const eventId of calibrationIds) {
    if (evaluationIds.has(eventId)) throw new TypeError(`event leakage across calibration/finalEvaluation: ${eventId}`)
  }

  const calibrationSources = sourceHashes(calibration)
  const evaluationSources = sourceHashes(finalEvaluation)
  const sourceLeakage = [...calibrationSources].filter((hash) => evaluationSources.has(hash))
  if (sourceLeakage.length) throw new TypeError(`source leakage across calibration/finalEvaluation: ${sourceLeakage.join(',')}`)

  return Object.freeze({
    splitId,
    leakageFree: true,
    calibration: Object.freeze([...calibration]),
    finalEvaluation: Object.freeze([...finalEvaluation]),
    sourceCounts: Object.freeze({ calibration: calibrationSources.size, finalEvaluation: evaluationSources.size }),
    eventCounts: Object.freeze({ calibration: calibration.length, finalEvaluation: finalEvaluation.length }),
  })
}

export function summarizeRealOmrEvidenceSplit(split) {
  if (!split || split.leakageFree !== true || !Array.isArray(split.calibration) || !Array.isArray(split.finalEvaluation)) {
    throw new TypeError('A leakage-free REAL_OMR evidence split is required.')
  }
  return Object.freeze({
    splitId: split.splitId,
    leakageFree: true,
    eventCounts: split.eventCounts,
    sourceCounts: split.sourceCounts,
    calibrationByErrorClass: groupCounts(split.calibration, (record) => record.errorClass),
    finalEvaluationByErrorClass: groupCounts(split.finalEvaluation, (record) => record.errorClass),
    calibrationByEngine: groupCounts(split.calibration, (record) => record.engineId),
    finalEvaluationByEngine: groupCounts(split.finalEvaluation, (record) => record.engineId),
  })
}
