import { POLYPHONIC_ERROR_CLASS } from '../contracts/errorTaxonomy.js'
import { createMeasure } from '../model/measure.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { CORRECTION_EVENT_ORIGIN, TEACHER_DECISION, createTeacherGoldCorrectionEvent } from './teacherGoldCorrectionEvent.js'

export const APPROVED_REAL_OMR_SEED = Object.freeze({
  id: 'seslitab-plan0-owner-approved-3-8',
  repository: 'khfy7wpr5p-maker/seslitab-guitar-reader',
  commitSha: '7cdf08f784a38b9e50cfb465eab87cb65a6622a1',
  license: 'CC0-1.0',
  rights: Object.freeze({ benchmarkUse: true, commercialUse: true, trainingUse: true, redistribution: true }),
  engineId: 'audiveris',
  engineVersion: '5.11.0',
  sourcePdf: Object.freeze({
    path: 'tests/fixtures/golden-reference/plan0-owner-approved-3-8/source.pdf',
    sha256: 'df4b8ea20b6420ebdf6b3e1d625016090105fed0c2f60a4e03874d3c3be2b9b9',
  }),
  musicXml: Object.freeze({
    path: 'tests/fixtures/golden-reference/plan0-owner-approved-3-8/expected.musicxml',
    sha256: '009dd2fd4439a4138ed62cd0e0945a5611add8db38c58c7b0f90429ccd9970f6',
  }),
  omrArtifact: Object.freeze({
    path: 'tests/fixtures/golden-reference/plan0-owner-approved-3-8/project.omr',
    sha256: '7424e684825b51e8fd31596c94acd5ef008a84fbaecb5c0524222aaec8f8a21a',
  }),
  approval: Object.freeze({
    evidenceId: 'seslitab-plan0-owner-approved-3-8-approval-2026-08-09',
    path: 'tests/fixtures/golden-reference/plan0-owner-approved-3-8/APPROVAL.md',
    sha256: '4cda4b23b71c738e0b7117d84a4d1256656e010359c5a4b9f1f1db474ad8dfc3',
    date: '2026-08-09',
    authority: 'repository owner/user',
    fullScoreMusicalEquivalenceApproved: true,
    tieRecognitionExplicitlyApproved: true,
  }),
})

const NOTE_SNAPSHOT = Object.freeze([
  { measure: '0', onset: 0, duration: 0.5, pitch: 'E4' },
  { measure: '1', onset: 0, duration: 1.5, pitch: 'E4', tieStart: true },
  { measure: '2', onset: 0, duration: 0.5, pitch: 'E4', tieStop: true },
  { measure: '2', onset: 0.5, duration: 0.5, pitch: 'G#4' },
  { measure: '2', onset: 1, duration: 0.5, pitch: 'A4' },
  { measure: '3', onset: 0, duration: 1.5, pitch: 'B4', tieStart: true },
  { measure: '4', onset: 0, duration: 0.5, pitch: 'B4', tieStop: true },
  { measure: '4', onset: 0.5, duration: 0.5, pitch: 'G#4' },
  { measure: '4', onset: 1, duration: 0.5, pitch: 'E4' },
  { measure: '5', onset: 0, duration: 1.5, pitch: 'C5', tieStart: true },
  { measure: '6', onset: 0, duration: 0.5, pitch: 'C5', tieStop: true },
  { measure: '6', onset: 0.5, duration: 0.5, pitch: 'B4' },
  { measure: '6', onset: 1, duration: 0.5, pitch: 'A4' },
  { measure: '7', onset: 0, duration: 1.5, pitch: 'E5', tieStart: true },
  { measure: '8', onset: 0, duration: 0.5, pitch: 'E5', tieStop: true },
  { measure: '8', onset: 0.5, duration: 0.5, pitch: 'D5' },
  { measure: '8', onset: 1, duration: 0.5, pitch: 'E5' },
  { measure: '9', onset: 0, duration: 1.5, pitch: 'F5', tieStart: true },
  { measure: '10', onset: 0, duration: 0.5, pitch: 'F5', tieStop: true },
  { measure: '10', onset: 0.5, duration: 0.5, pitch: 'E5' },
  { measure: '10', onset: 1, duration: 0.5, pitch: 'D5' },
  { measure: '11', onset: 0, duration: 1.5, pitch: 'E5' },
])

function measureKey(number) {
  return `plan0:m${number}`
}

export function createApprovedRealOmrSeedFixture() {
  const measures = Object.freeze(Array.from({ length: 12 }, (_, index) => createMeasure({
    key: measureKey(index),
    beats: 3,
    beatType: 8,
    implicit: index === 0,
    pickup: index === 0,
  })))

  const perMeasureIndex = new Map()
  const events = Object.freeze(NOTE_SNAPSHOT.map((note) => {
    const current = perMeasureIndex.get(note.measure) ?? 0
    perMeasureIndex.set(note.measure, current + 1)
    const ties = []
    if (note.tieStart) ties.push('start')
    if (note.tieStop) ties.push('stop')
    return createScoreEvent({
      id: `plan0:m${note.measure}:n${current}`,
      measureKey: measureKey(note.measure),
      onset: note.onset,
      duration: note.duration,
      voice: 1,
      staff: 1,
      pitch: note.pitch,
      metadata: Object.freeze({
        expectedOnsetQuarterBeats: note.onset,
        ties: Object.freeze(ties),
        source: Object.freeze({
          repository: APPROVED_REAL_OMR_SEED.repository,
          commitSha: APPROVED_REAL_OMR_SEED.commitSha,
          musicXmlSha256: APPROVED_REAL_OMR_SEED.musicXml.sha256,
        }),
      }),
    })
  }))

  return Object.freeze({ seed: APPROVED_REAL_OMR_SEED, measures, events })
}

function provenance() {
  return Object.freeze({
    teacherApprovalId: APPROVED_REAL_OMR_SEED.approval.evidenceId,
    sourceRevisionId: APPROVED_REAL_OMR_SEED.commitSha,
    sourceHash: APPROVED_REAL_OMR_SEED.sourcePdf.sha256,
    engineVersion: APPROVED_REAL_OMR_SEED.engineVersion,
    musicXmlHash: APPROVED_REAL_OMR_SEED.musicXml.sha256,
    omrArtifactHash: APPROVED_REAL_OMR_SEED.omrArtifact.sha256,
    approvalHash: APPROVED_REAL_OMR_SEED.approval.sha256,
  })
}

function goldEvent({ scoreEvent, suffix, errorClass, value }) {
  const measure = scoreEvent.measureKey.split(':m')[1]
  return createTeacherGoldCorrectionEvent({
    eventId: `${scoreEvent.id}:${suffix}`,
    sourceId: APPROVED_REAL_OMR_SEED.id,
    engineId: APPROVED_REAL_OMR_SEED.engineId,
    origin: CORRECTION_EVENT_ORIGIN.REAL_OMR,
    page: 0,
    system: 0,
    measure,
    staff: scoreEvent.staff,
    voice: scoreEvent.voice,
    errorClass,
    originalValue: value,
    teacherGoldValue: value,
    candidateValue: value,
    correctionNeeded: false,
    correctionSafe: false,
    evidenceAvailable: true,
    teacherDecision: TEACHER_DECISION.NO_CORRECTION_NEEDED,
    provenance: provenance(),
  })
}

export function projectApprovedRealOmrNoCorrectionGold() {
  if (!APPROVED_REAL_OMR_SEED.approval.fullScoreMusicalEquivalenceApproved) {
    throw new TypeError('Full-score musical equivalence approval is required.')
  }

  const { events } = createApprovedRealOmrSeedFixture()
  const gold = []
  for (const event of events) {
    gold.push(goldEvent({ scoreEvent: event, suffix: 'pitch', errorClass: POLYPHONIC_ERROR_CLASS.PITCH, value: event.pitch }))
    gold.push(goldEvent({ scoreEvent: event, suffix: 'duration', errorClass: POLYPHONIC_ERROR_CLASS.DURATION, value: event.duration }))

    const ties = event.metadata?.ties ?? []
    if (ties.length) {
      if (!APPROVED_REAL_OMR_SEED.approval.tieRecognitionExplicitlyApproved) {
        throw new TypeError('Explicit tie-recognition approval is required for tie projection.')
      }
      gold.push(goldEvent({
        scoreEvent: event,
        suffix: 'tie',
        errorClass: POLYPHONIC_ERROR_CLASS.TIE,
        value: Object.freeze({ start: ties.includes('start'), stop: ties.includes('stop') }),
      }))
    }
  }
  return Object.freeze(gold)
}

export function summarizeApprovedRealOmrSeedGold() {
  const events = projectApprovedRealOmrNoCorrectionGold()
  const byClass = {}
  for (const event of events) byClass[event.errorClass] = (byClass[event.errorClass] ?? 0) + 1
  return Object.freeze({
    independentSourceCount: 1,
    scoreEventCount: NOTE_SNAPSHOT.length,
    goldLabelCount: events.length,
    byClass: Object.freeze({ ...byClass }),
    correctionNeededCount: 0,
    scope: 'BOUNDED_APPROVED_REAL_OMR_SEED',
    productionReadinessClaim: false,
  })
}
