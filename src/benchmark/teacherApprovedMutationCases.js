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

function pianoMutationInput({ suffix, mutatedVoice, includeStem = true, includeBeam = true }) {
  const eventId = `satie-m3-inner-${suffix}`
  const beamGroup = includeBeam ? `satie-inner-line-${suffix}` : null
  return Object.freeze({
    sourceId: 'piano-openscore-lieder-satie-je-te-veux',
    instrumentProfile: 'piano',
    ambiguousEventIds: Object.freeze([eventId]),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId } }]),
    events: Object.freeze([
      createScoreEvent({ id: eventId, measureKey: '3', onset: 0, duration: 1, voice: mutatedVoice, staff: 2, pitch: 60, metadata: eventMetadata({ stemDirection: includeStem ? 'down' : null, beamGroup }) }),
      createScoreEvent({ id: `${eventId}-peer`, measureKey: '3', onset: 1, duration: 1, voice: 2, staff: 2, pitch: 64, metadata: eventMetadata({ stemDirection: 'down', beamGroup }) }),
    ]),
  })
}

function guitarMutationInput({ suffix, mutatedVoice, includeStem = true, includeBeam = true }) {
  const eventId = `sor-m1-upper-${suffix}`
  const beamGroup = includeBeam ? `sor-upper-line-${suffix}` : null
  return Object.freeze({
    sourceId: 'classical-guitar-sor-op35-no13-study-in-c',
    instrumentProfile: 'classical-guitar',
    ambiguousEventIds: Object.freeze([eventId]),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId } }]),
    events: Object.freeze([
      createScoreEvent({ id: eventId, measureKey: '1', onset: 0, duration: 1, voice: mutatedVoice, staff: 1, pitch: 64, metadata: eventMetadata({ stemDirection: includeStem ? 'up' : null, beamGroup }) }),
      createScoreEvent({ id: `${eventId}-peer`, measureKey: '1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: eventMetadata({ stemDirection: 'up', beamGroup }) }),
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

export const TEACHER_APPROVED_HIGH_EVIDENCE_CASES = Object.freeze([
  createVoiceGoldCase({ id: 'approved-piano-satie-voice-full-001', input: pianoMutationInput({ suffix: 'full-001', mutatedVoice: 1 }), correctVoice: 2, teacherApproval: TEACHER_APPROVALS.piano }),
  createVoiceGoldCase({ id: 'approved-piano-satie-voice-full-002', input: pianoMutationInput({ suffix: 'full-002', mutatedVoice: 3 }), correctVoice: 2, teacherApproval: TEACHER_APPROVALS.piano }),
  createVoiceGoldCase({ id: 'approved-guitar-sor-voice-full-001', input: guitarMutationInput({ suffix: 'full-001', mutatedVoice: 2 }), correctVoice: 1, teacherApproval: TEACHER_APPROVALS.guitar }),
  createVoiceGoldCase({ id: 'approved-guitar-sor-voice-full-002', input: guitarMutationInput({ suffix: 'full-002', mutatedVoice: 4 }), correctVoice: 1, teacherApproval: TEACHER_APPROVALS.guitar }),
])

export const TEACHER_APPROVED_GUARD_CASES = Object.freeze([
  createVoiceGoldCase({ id: 'approved-piano-satie-voice-stem-guard', input: pianoMutationInput({ suffix: 'stem-guard', mutatedVoice: 1, includeBeam: false }), correctVoice: 2, teacherApproval: TEACHER_APPROVALS.piano }),
  createVoiceGoldCase({ id: 'approved-piano-satie-voice-beam-guard', input: pianoMutationInput({ suffix: 'beam-guard', mutatedVoice: 3, includeStem: false }), correctVoice: 2, teacherApproval: TEACHER_APPROVALS.piano }),
  createVoiceGoldCase({ id: 'approved-guitar-sor-voice-stem-guard', input: guitarMutationInput({ suffix: 'stem-guard', mutatedVoice: 4, includeBeam: false }), correctVoice: 1, teacherApproval: TEACHER_APPROVALS.guitar }),
  createVoiceGoldCase({ id: 'approved-guitar-sor-voice-beam-guard', input: guitarMutationInput({ suffix: 'beam-guard', mutatedVoice: 4, includeStem: false }), correctVoice: 1, teacherApproval: TEACHER_APPROVALS.guitar }),
])

export const TEACHER_APPROVED_MUTATION_CASES = Object.freeze([
  ...TEACHER_APPROVED_HIGH_EVIDENCE_CASES,
  ...TEACHER_APPROVED_GUARD_CASES,
])
