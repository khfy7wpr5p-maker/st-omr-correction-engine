import { createCorrectionPatch, PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createGoldCase } from './goldCase.js'
import { TEACHER_APPROVALS } from './approvedReferenceRegistry.js'

function eventMetadata({ stemDirection = null, beamGroup = null } = {}) {
  const metadata = {}
  if (stemDirection) metadata.stemDirection = stemDirection
  if (beamGroup) metadata.beamGroup = beamGroup
  return Object.freeze(metadata)
}

function temporalLayout(placement) {
  if (placement === 'before') return Object.freeze({ eventOnset: 1, peerOnset: 0 })
  if (placement === 'none') return Object.freeze({ eventOnset: 0, peerOnset: 2 })
  return Object.freeze({ eventOnset: 0, peerOnset: 1 })
}

function pianoMutationInput({ suffix, mutatedVoice, includeStem = true, includeBeam = true, temporalPlacement = 'after' }) {
  const eventId = `satie-m3-inner-${suffix}`
  const beamGroup = includeBeam ? `satie-inner-line-${suffix}` : null
  const timing = temporalLayout(temporalPlacement)
  return Object.freeze({
    sourceId: 'piano-openscore-lieder-satie-je-te-veux',
    instrumentProfile: 'piano',
    ambiguousEventIds: Object.freeze([eventId]),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId } }]),
    events: Object.freeze([
      createScoreEvent({ id: eventId, measureKey: '3', onset: timing.eventOnset, duration: 1, voice: mutatedVoice, staff: 2, pitch: 60, metadata: eventMetadata({ stemDirection: includeStem ? 'down' : null, beamGroup }) }),
      createScoreEvent({ id: `${eventId}-peer`, measureKey: '3', onset: timing.peerOnset, duration: 1, voice: 2, staff: 2, pitch: 64, metadata: eventMetadata({ stemDirection: 'down', beamGroup }) }),
    ]),
  })
}

function guitarMutationInput({ suffix, mutatedVoice, includeStem = true, includeBeam = true, temporalPlacement = 'after' }) {
  const eventId = `sor-m1-upper-${suffix}`
  const beamGroup = includeBeam ? `sor-upper-line-${suffix}` : null
  const timing = temporalLayout(temporalPlacement)
  return Object.freeze({
    sourceId: 'classical-guitar-sor-op35-no13-study-in-c',
    instrumentProfile: 'classical-guitar',
    ambiguousEventIds: Object.freeze([eventId]),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId } }]),
    events: Object.freeze([
      createScoreEvent({ id: eventId, measureKey: '1', onset: timing.eventOnset, duration: 1, voice: mutatedVoice, staff: 1, pitch: 64, metadata: eventMetadata({ stemDirection: includeStem ? 'up' : null, beamGroup }) }),
      createScoreEvent({ id: `${eventId}-peer`, measureKey: '1', onset: timing.peerOnset, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: eventMetadata({ stemDirection: 'up', beamGroup }) }),
      createScoreEvent({ id: `${eventId}-bass`, measureKey: '1', onset: 0, duration: 2, voice: 2, staff: 1, pitch: 48, metadata: eventMetadata({ stemDirection: 'down' }) }),
      createScoreEvent({ id: `${eventId}-middle`, measureKey: '1', onset: 0.5, duration: 0.25, voice: 3, staff: 1, pitch: 55, metadata: eventMetadata({ beamGroup: `sor-middle-arpeggio-${suffix}` }) }),
    ]),
  })
}

function createVoiceGoldCase({ id, input, correctVoice, teacherApproval }) {
  const eventId = input.ambiguousEventIds[0]
  const event = input.events.find((entry) => entry.id === eventId)
  return createGoldCase({
    id,
    input,
    expectedPatches: [createCorrectionPatch({ eventId, measureKey: event.measureKey, operation: PATCH_OPERATION.CHANGE_VOICE, before: event.voice, after: correctVoice, confidence: 0, solverVersion: 'teacher-gold' })],
    teacherApproval,
  })
}

function makePianoCase({ suffix, mutatedVoice, includeStem = true, includeBeam = true, temporalPlacement = 'after' }) {
  return createVoiceGoldCase({
    id: `approved-piano-satie-voice-${suffix}`,
    input: pianoMutationInput({ suffix, mutatedVoice, includeStem, includeBeam, temporalPlacement }),
    correctVoice: 2,
    teacherApproval: TEACHER_APPROVALS.piano,
  })
}

function makeGuitarCase({ suffix, mutatedVoice, includeStem = true, includeBeam = true, temporalPlacement = 'after' }) {
  return createVoiceGoldCase({
    id: `approved-guitar-sor-voice-${suffix}`,
    input: guitarMutationInput({ suffix, mutatedVoice, includeStem, includeBeam, temporalPlacement }),
    correctVoice: 1,
    teacherApproval: TEACHER_APPROVALS.guitar,
  })
}

export const TEACHER_APPROVED_HIGH_EVIDENCE_CASES = Object.freeze([
  makePianoCase({ suffix: 'full-after-v1', mutatedVoice: 1 }),
  makePianoCase({ suffix: 'full-after-v3', mutatedVoice: 3 }),
  makePianoCase({ suffix: 'full-after-v4', mutatedVoice: 4 }),
  makePianoCase({ suffix: 'full-before-v1', mutatedVoice: 1, temporalPlacement: 'before' }),
  makePianoCase({ suffix: 'full-before-v3', mutatedVoice: 3, temporalPlacement: 'before' }),
  makePianoCase({ suffix: 'full-before-v4', mutatedVoice: 4, temporalPlacement: 'before' }),
  makeGuitarCase({ suffix: 'full-after-v2', mutatedVoice: 2 }),
  makeGuitarCase({ suffix: 'full-after-v3', mutatedVoice: 3 }),
  makeGuitarCase({ suffix: 'full-after-v4', mutatedVoice: 4 }),
  makeGuitarCase({ suffix: 'full-before-v2', mutatedVoice: 2, temporalPlacement: 'before' }),
  makeGuitarCase({ suffix: 'full-before-v3', mutatedVoice: 3, temporalPlacement: 'before' }),
  makeGuitarCase({ suffix: 'full-before-v4', mutatedVoice: 4, temporalPlacement: 'before' }),
])

export const TEACHER_APPROVED_GUARD_CASES = Object.freeze([
  makePianoCase({ suffix: 'guard-no-beam-v1', mutatedVoice: 1, includeBeam: false }),
  makePianoCase({ suffix: 'guard-no-beam-v3-before', mutatedVoice: 3, includeBeam: false, temporalPlacement: 'before' }),
  makePianoCase({ suffix: 'guard-no-stem-v1-before', mutatedVoice: 1, includeStem: false, temporalPlacement: 'before' }),
  makePianoCase({ suffix: 'guard-no-stem-v4', mutatedVoice: 4, includeStem: false }),
  makePianoCase({ suffix: 'guard-no-temporal-v3', mutatedVoice: 3, temporalPlacement: 'none' }),
  makePianoCase({ suffix: 'guard-no-temporal-v4', mutatedVoice: 4, temporalPlacement: 'none' }),
  makeGuitarCase({ suffix: 'guard-no-beam-v2', mutatedVoice: 2, includeBeam: false }),
  makeGuitarCase({ suffix: 'guard-no-beam-v4-before', mutatedVoice: 4, includeBeam: false, temporalPlacement: 'before' }),
  makeGuitarCase({ suffix: 'guard-no-stem-v2-before', mutatedVoice: 2, includeStem: false, temporalPlacement: 'before' }),
  makeGuitarCase({ suffix: 'guard-no-stem-v4', mutatedVoice: 4, includeStem: false }),
  makeGuitarCase({ suffix: 'guard-no-temporal-v3', mutatedVoice: 3, temporalPlacement: 'none' }),
  makeGuitarCase({ suffix: 'guard-no-temporal-v4', mutatedVoice: 4, temporalPlacement: 'none' }),
])

export const TEACHER_APPROVED_MUTATION_CASES = Object.freeze([
  ...TEACHER_APPROVED_HIGH_EVIDENCE_CASES,
  ...TEACHER_APPROVED_GUARD_CASES,
])
