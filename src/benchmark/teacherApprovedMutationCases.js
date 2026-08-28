import { createCorrectionPatch, PATCH_OPERATION } from '../contracts/correctionPatch.js'
import { createScoreEvent } from '../model/scoreEvent.js'
import { createGoldCase } from './goldCase.js'
import { TEACHER_APPROVALS } from './approvedReferenceRegistry.js'

function pianoMutationInput() {
  return Object.freeze({
    sourceId: 'piano-openscore-lieder-satie-je-te-veux',
    instrumentProfile: 'piano',
    ambiguousEventIds: Object.freeze(['satie-m3-inner']),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId: 'satie-m3-inner' } }]),
    events: Object.freeze([
      createScoreEvent({ id: 'satie-m3-inner', measureKey: '3', onset: 0, duration: 1, voice: 1, staff: 2, pitch: 60, metadata: { stemDirection: 'down', beamGroup: 'satie-inner-line' } }),
      createScoreEvent({ id: 'satie-m3-inner-peer', measureKey: '3', onset: 1, duration: 1, voice: 2, staff: 2, pitch: 64, metadata: { stemDirection: 'down', beamGroup: 'satie-inner-line' } }),
    ]),
  })
}

function guitarMutationInput() {
  return Object.freeze({
    sourceId: 'classical-guitar-sor-op35-no13-study-in-c',
    instrumentProfile: 'classical-guitar',
    ambiguousEventIds: Object.freeze(['sor-m1-upper']),
    validatorFindings: Object.freeze([{ code: 'VOICE_ASSIGNMENT_SUSPECT', weight: 0.8, location: { eventId: 'sor-m1-upper' } }]),
    events: Object.freeze([
      createScoreEvent({ id: 'sor-m1-upper', measureKey: '1', onset: 0, duration: 1, voice: 2, staff: 1, pitch: 64, metadata: { stemDirection: 'up', beamGroup: 'sor-upper-line' } }),
      createScoreEvent({ id: 'sor-m1-upper-peer', measureKey: '1', onset: 1, duration: 1, voice: 1, staff: 1, pitch: 60, metadata: { stemDirection: 'up', beamGroup: 'sor-upper-line' } }),
      createScoreEvent({ id: 'sor-m1-bass', measureKey: '1', onset: 0, duration: 2, voice: 2, staff: 1, pitch: 48, metadata: { stemDirection: 'down' } }),
      createScoreEvent({ id: 'sor-m1-middle', measureKey: '1', onset: 0.5, duration: 0.25, voice: 3, staff: 1, pitch: 55, metadata: { beamGroup: 'sor-middle-arpeggio' } }),
    ]),
  })
}

export const TEACHER_APPROVED_MUTATION_CASES = Object.freeze([
  createGoldCase({
    id: 'approved-piano-satie-voice-mutation-001',
    input: pianoMutationInput(),
    expectedPatches: [createCorrectionPatch({ eventId: 'satie-m3-inner', measureKey: '3', operation: PATCH_OPERATION.CHANGE_VOICE, before: 1, after: 2, confidence: 0.75, solverVersion: 'E5-shadow' })],
    teacherApproval: TEACHER_APPROVALS.piano,
  }),
  createGoldCase({
    id: 'approved-guitar-sor-voice-mutation-001',
    input: guitarMutationInput(),
    expectedPatches: [createCorrectionPatch({ eventId: 'sor-m1-upper', measureKey: '1', operation: PATCH_OPERATION.CHANGE_VOICE, before: 2, after: 1, confidence: 0.75, solverVersion: 'E5-shadow' })],
    teacherApproval: TEACHER_APPROVALS.guitar,
  }),
])
