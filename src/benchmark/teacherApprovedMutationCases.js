import { createCorrectionPatch, PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createGoldCase } from './goldCase.js'
import { TEACHER_APPROVALS } from './approvedReferenceRegistry.js'

function eventMetadata({ stemDirection = null, beamGroup = null, sourceAnchor = null } = {}) {
  const metadata = {}
  if (stemDirection) metadata.stemDirection = stemDirection
  if (beamGroup) metadata.beamGroup = beamGroup
  if (sourceAnchor) metadata.sourceAnchor = sourceAnchor
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

function tarregaLagrimaMutationInput({ suffix, mutatedVoice, includeStem = true, includeBeam = true }) {
  const eventId = `tarrega-lagrima-m6-high-cis-${suffix}`
  const beamGroup = includeBeam ? `tarrega-lagrima-m6-high-explicit-beam-${suffix}` : null
  return Object.freeze({
    sourceId: 'classical-guitar-tarrega-lagrima',
    instrumentProfile: 'classical-guitar',
    ambiguousEventIds: Object.freeze([eventId]),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId } }]),
    events: Object.freeze([
      createScoreEvent({
        id: eventId,
        measureKey: '6',
        onset: 1,
        duration: 0.5,
        voice: mutatedVoice,
        staff: 1,
        metadata: eventMetadata({ stemDirection: includeStem ? 'up' : null, beamGroup, sourceAnchor: 'highVoiceMusic:m6:cis,8[' }),
      }),
      createScoreEvent({
        id: `${eventId}-peer`,
        measureKey: '6',
        onset: 1.5,
        duration: 0.5,
        voice: 1,
        staff: 1,
        metadata: eventMetadata({ stemDirection: 'up', beamGroup, sourceAnchor: 'highVoiceMusic:m6:<e-0>' }),
      }),
      createScoreEvent({
        id: `${eventId}-bass-overlap`,
        measureKey: '6',
        onset: 1,
        duration: 2,
        voice: 2,
        staff: 1,
        metadata: eventMetadata({ stemDirection: 'down', sourceAnchor: 'lowVoiceMusic:m6:<cis-3 \\4>2' }),
      }),
      createScoreEvent({
        id: `${eventId}-middle-adjacent`,
        measureKey: '6',
        onset: 0.5,
        duration: 0.5,
        voice: 3,
        staff: 1,
        metadata: eventMetadata({ sourceAnchor: "middleVoiceMusic:m6:<gis'-4>" }),
      }),
    ]),
  })
}

function dowlandFantasiaMutationInput({ suffix, mutatedVoice, includeStem = true, includeBeam = true }) {
  const eventId = `dowland-fantasia7-m7-high-e-${suffix}`
  const beamGroup = includeBeam ? `dowland-fantasia7-m7-high-quaver-pair-${suffix}` : null
  return Object.freeze({
    sourceId: 'classical-guitar-dowland-fantasia-7',
    instrumentProfile: 'classical-guitar',
    ambiguousEventIds: Object.freeze([eventId]),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId } }]),
    events: Object.freeze([
      createScoreEvent({
        id: eventId,
        measureKey: '7',
        onset: 2,
        duration: 0.5,
        voice: mutatedVoice,
        staff: 1,
        metadata: eventMetadata({ stemDirection: includeStem ? 'up' : null, beamGroup, sourceAnchor: 'highVoiceMusic:m7:e8' }),
      }),
      createScoreEvent({
        id: `${eventId}-peer`,
        measureKey: '7',
        onset: 1.5,
        duration: 0.5,
        voice: 1,
        staff: 1,
        metadata: eventMetadata({ stemDirection: 'up', beamGroup, sourceAnchor: 'highVoiceMusic:m7:fis8' }),
      }),
      createScoreEvent({
        id: `${eventId}-low-overlap`,
        measureKey: '7',
        onset: 2,
        duration: 1,
        voice: 2,
        staff: 1,
        metadata: eventMetadata({ stemDirection: 'down', sourceAnchor: 'lowVoiceMusic:m7:<gis-3>4' }),
      }),
      createScoreEvent({
        id: `${eventId}-upper-middle-adjacent`,
        measureKey: '7',
        onset: 0,
        duration: 2,
        voice: 3,
        staff: 1,
        metadata: eventMetadata({ sourceAnchor: 'upperMiddleVoiceMusic:m7:<b-0>2' }),
      }),
      createScoreEvent({
        id: `${eventId}-lower-middle-overlap`,
        measureKey: '7',
        onset: 2,
        duration: 1,
        voice: 4,
        staff: 1,
        metadata: eventMetadata({ sourceAnchor: 'lowerMiddleVoiceMusic:m7:<e-1>4' }),
      }),
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

function makeTarregaCase({ suffix, mutatedVoice, includeStem = true, includeBeam = true }) {
  return createVoiceGoldCase({
    id: `approved-guitar-tarrega-lagrima-voice-${suffix}`,
    input: tarregaLagrimaMutationInput({ suffix, mutatedVoice, includeStem, includeBeam }),
    correctVoice: 1,
    teacherApproval: TEACHER_APPROVALS.lagrima,
  })
}

function makeDowlandCase({ suffix, mutatedVoice, includeStem = true, includeBeam = true }) {
  return createVoiceGoldCase({
    id: `approved-guitar-dowland-fantasia7-voice-${suffix}`,
    input: dowlandFantasiaMutationInput({ suffix, mutatedVoice, includeStem, includeBeam }),
    correctVoice: 1,
    teacherApproval: TEACHER_APPROVALS.dowland,
  })
}

export const TEACHER_APPROVED_SOURCE_SPECIFIC_HIGH_EVIDENCE_CASES = Object.freeze([
  makeTarregaCase({ suffix: 'm6-explicit-beam-full', mutatedVoice: 3 }),
  makeDowlandCase({ suffix: 'm7-four-layer-full', mutatedVoice: 3 }),
])

export const TEACHER_APPROVED_SOURCE_SPECIFIC_GUARD_CASES = Object.freeze([
  makeTarregaCase({ suffix: 'm6-explicit-beam-no-stem', mutatedVoice: 3, includeStem: false }),
  makeDowlandCase({ suffix: 'm7-four-layer-no-beam', mutatedVoice: 3, includeBeam: false }),
])

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
  ...TEACHER_APPROVED_SOURCE_SPECIFIC_HIGH_EVIDENCE_CASES,
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
  ...TEACHER_APPROVED_SOURCE_SPECIFIC_GUARD_CASES,
])

export const TEACHER_APPROVED_MUTATION_CASES = Object.freeze([
  ...TEACHER_APPROVED_HIGH_EVIDENCE_CASES,
  ...TEACHER_APPROVED_GUARD_CASES,
])
