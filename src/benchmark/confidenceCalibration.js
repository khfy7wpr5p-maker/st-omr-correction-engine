export const CALIBRATION_METHOD = Object.freeze({
  RAW: 'RAW',
  ISOTONIC: 'ISOTONIC',
  PLATT: 'PLATT',
  TEMPERATURE: 'TEMPERATURE',
  CONFORMAL: 'CONFORMAL',
})

function validateRecords(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array.')
  records.forEach((record, index) => {
    if (!record || typeof record !== 'object') throw new TypeError(`record ${index} must be an object.`)
    if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) throw new TypeError(`record ${index} confidence must be between 0 and 1.`)
    if (typeof record.correct !== 'boolean') throw new TypeError(`record ${index} correct must be boolean.`)
  })
}

function reliabilityBins(records, binCount) {
  const bins = Array.from({ length: binCount }, (_, index) => ({ index, count: 0, confidenceSum: 0, correct: 0 }))
  for (const record of records) {
    const index = Math.min(binCount - 1, Math.floor(record.confidence * binCount))
    const bin = bins[index]
    bin.count += 1
    bin.confidenceSum += record.confidence
    if (record.correct) bin.correct += 1
  }
  return Object.freeze(bins.map((bin) => Object.freeze({
    index: bin.index,
    lower: bin.index / binCount,
    upper: (bin.index + 1) / binCount,
    count: bin.count,
    meanConfidence: bin.count ? bin.confidenceSum / bin.count : null,
    empiricalAccuracy: bin.count ? bin.correct / bin.count : null,
  })))
}

export function evaluateConfidenceCalibration(records, options = {}) {
  validateRecords(records)
  const binCount = options.binCount ?? 10
  if (!Number.isInteger(binCount) || binCount < 2 || binCount > 100) throw new TypeError('binCount must be an integer between 2 and 100.')
  const total = records.length
  const brierScore = total
    ? records.reduce((sum, record) => sum + ((record.confidence - (record.correct ? 1 : 0)) ** 2), 0) / total
    : null
  const bins = reliabilityBins(records, binCount)
  const expectedCalibrationError = total
    ? bins.reduce((sum, bin) => {
      if (!bin.count) return sum
      return sum + (bin.count / total) * Math.abs(bin.empiricalAccuracy - bin.meanConfidence)
    }, 0)
    : null
  return Object.freeze({
    sampleCount: total,
    binCount,
    brierScore,
    expectedCalibrationError,
    reliabilityBins: bins,
  })
}

export function compareCalibrationTransform(records, { method, transform, binCount = 10 }) {
  validateRecords(records)
  if (!Object.values(CALIBRATION_METHOD).includes(method) || method === CALIBRATION_METHOD.RAW) throw new TypeError('A named experimental calibration method is required.')
  if (typeof transform !== 'function') throw new TypeError('transform must be a function.')
  const transformed = records.map((record, index) => {
    const confidence = transform(record.confidence, record, index)
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new TypeError('calibration transform must return values between 0 and 1.')
    return Object.freeze({ ...record, confidence })
  })
  return Object.freeze({
    method,
    mode: 'RESEARCH_ONLY',
    before: evaluateConfidenceCalibration(records, { binCount }),
    after: evaluateConfidenceCalibration(transformed, { binCount }),
    transformedRecords: Object.freeze(transformed),
  })
}
