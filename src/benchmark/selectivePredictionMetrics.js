function validateRecord(record, index) {
  if (!record || typeof record !== 'object') throw new TypeError(`record ${index} must be an object.`)
  if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) throw new TypeError(`record ${index} confidence must be between 0 and 1.`)
  if (typeof record.correct !== 'boolean') throw new TypeError(`record ${index} correct must be boolean.`)
}

function normalizeThresholds(records, thresholds) {
  if (thresholds != null) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) throw new TypeError('thresholds must be a non-empty array when provided.')
    for (const threshold of thresholds) {
      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new TypeError('thresholds must be between 0 and 1.')
    }
    return [...new Set(thresholds)].sort((a, b) => b - a)
  }
  return [...new Set([1, ...records.map((record) => record.confidence), 0])].sort((a, b) => b - a)
}

function pointAtThreshold(records, threshold) {
  const selected = records.filter((record) => record.confidence >= threshold)
  const correct = selected.filter((record) => record.correct).length
  const incorrect = selected.length - correct
  const total = records.length
  const totalCorrect = records.filter((record) => record.correct).length
  const coverage = total ? selected.length / total : 0
  const precision = selected.length ? correct / selected.length : null
  const recall = totalCorrect ? correct / totalCorrect : null
  const risk = precision == null ? null : 1 - precision
  return Object.freeze({
    threshold,
    selected: selected.length,
    correct,
    incorrect,
    coverage,
    precision,
    recall,
    risk,
    abstentionRate: 1 - coverage,
    falseCorrectionRate: selected.length ? incorrect / selected.length : 0,
    falseCorrectionsPer1000Candidates: total ? (incorrect / total) * 1000 : 0,
  })
}

function riskCoverageAuc(points) {
  const usable = points
    .filter((point) => point.risk != null)
    .sort((a, b) => a.coverage - b.coverage || b.threshold - a.threshold)
  if (usable.length < 2) return 0
  let area = 0
  for (let index = 1; index < usable.length; index += 1) {
    const left = usable[index - 1]
    const right = usable[index]
    const width = right.coverage - left.coverage
    area += width * ((left.risk + right.risk) / 2)
  }
  return Number(area.toFixed(12))
}

export function evaluateSelectivePrediction(records, options = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array.')
  records.forEach(validateRecord)
  const thresholds = normalizeThresholds(records, options.thresholds)
  const curve = thresholds.map((threshold) => pointAtThreshold(records, threshold))
  return Object.freeze({
    candidateCount: records.length,
    curve: Object.freeze(curve),
    riskCoverageAUC: riskCoverageAuc(curve),
  })
}

export function selectMetricAtThreshold(report, threshold) {
  if (!report || !Array.isArray(report.curve)) throw new TypeError('selective-prediction report is required.')
  if (!Number.isFinite(threshold)) throw new TypeError('threshold is required.')
  return report.curve.find((point) => point.threshold === threshold) ?? null
}
