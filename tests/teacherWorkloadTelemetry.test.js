import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeacherWorkloadTelemetry, aggregateTeacherWorkloadTelemetry } from '../src/index.js'

test('teacher workload telemetry reports review burden without UI authority', () => {
  const report = createTeacherWorkloadTelemetry({
    pageCount: 2,
    teacherAcceptedCorrections: 8,
    teacherRejectedCorrections: 2,
    teacherOverrides: 1,
    correctionCandidates: 20,
    falseCorrections: 1,
    manualEditsSaved: 7,
    reviewSeconds: 120,
  })
  assert.equal(report.teacherOverrideRate, 0.1)
  assert.equal(report.correctionCandidatesPerPage, 10)
  assert.equal(report.falseCorrectionsPerPage, 0.5)
  assert.equal(report.reviewSecondsPerPage, 60)
})

test('zero-page telemetry remains defined instead of dividing by zero', () => {
  const report = createTeacherWorkloadTelemetry()
  assert.equal(report.teacherOverrideRate, 0)
  assert.equal(report.correctionCandidatesPerPage, 0)
  assert.equal(report.reviewSecondsPerPage, 0)
})

test('telemetry aggregation recomputes rates from summed counts', () => {
  const report = aggregateTeacherWorkloadTelemetry([
    { pageCount: 1, teacherAcceptedCorrections: 3, teacherRejectedCorrections: 1, teacherOverrides: 1, correctionCandidates: 4, reviewSeconds: 30 },
    { pageCount: 3, teacherAcceptedCorrections: 5, teacherRejectedCorrections: 1, teacherOverrides: 0, correctionCandidates: 8, reviewSeconds: 90 },
  ])
  assert.equal(report.pageCount, 4)
  assert.equal(report.teacherOverrideRate, 0.1)
  assert.equal(report.correctionCandidatesPerPage, 3)
  assert.equal(report.reviewSecondsPerPage, 30)
})
