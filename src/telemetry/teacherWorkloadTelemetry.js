function nonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and non-negative.`)
  return value
}

function count(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer.`)
  return value
}

function rate(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator
}

export function createTeacherWorkloadTelemetry({
  pageCount = 0,
  teacherAcceptedCorrections = 0,
  teacherRejectedCorrections = 0,
  teacherOverrides = 0,
  correctionCandidates = 0,
  falseCorrections = 0,
  manualEditsSaved = 0,
  reviewSeconds = 0,
} = {}) {
  pageCount = count(pageCount, 'pageCount')
  teacherAcceptedCorrections = count(teacherAcceptedCorrections, 'teacherAcceptedCorrections')
  teacherRejectedCorrections = count(teacherRejectedCorrections, 'teacherRejectedCorrections')
  teacherOverrides = count(teacherOverrides, 'teacherOverrides')
  correctionCandidates = count(correctionCandidates, 'correctionCandidates')
  falseCorrections = count(falseCorrections, 'falseCorrections')
  manualEditsSaved = count(manualEditsSaved, 'manualEditsSaved')
  reviewSeconds = nonNegative(reviewSeconds, 'reviewSeconds')

  const reviewedCorrections = teacherAcceptedCorrections + teacherRejectedCorrections
  return Object.freeze({
    schemaVersion: '1.0.0',
    pageCount,
    teacherAcceptedCorrections,
    teacherRejectedCorrections,
    teacherOverrides,
    correctionCandidates,
    falseCorrections,
    manualEditsSaved,
    reviewSeconds,
    teacherOverrideRate: rate(teacherOverrides, reviewedCorrections),
    correctionCandidatesPerPage: rate(correctionCandidates, pageCount),
    falseCorrectionsPerPage: rate(falseCorrections, pageCount),
    reviewSecondsPerPage: rate(reviewSeconds, pageCount),
  })
}

export function aggregateTeacherWorkloadTelemetry(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array.')
  const total = records.reduce((acc, record) => {
    const normalized = createTeacherWorkloadTelemetry(record)
    acc.pageCount += normalized.pageCount
    acc.teacherAcceptedCorrections += normalized.teacherAcceptedCorrections
    acc.teacherRejectedCorrections += normalized.teacherRejectedCorrections
    acc.teacherOverrides += normalized.teacherOverrides
    acc.correctionCandidates += normalized.correctionCandidates
    acc.falseCorrections += normalized.falseCorrections
    acc.manualEditsSaved += normalized.manualEditsSaved
    acc.reviewSeconds += normalized.reviewSeconds
    return acc
  }, {
    pageCount: 0,
    teacherAcceptedCorrections: 0,
    teacherRejectedCorrections: 0,
    teacherOverrides: 0,
    correctionCandidates: 0,
    falseCorrections: 0,
    manualEditsSaved: 0,
    reviewSeconds: 0,
  })
  return createTeacherWorkloadTelemetry(total)
}
