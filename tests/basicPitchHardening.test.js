import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  BASIC_PITCH_PACKAGE_VERSION,
  BASIC_PITCH_PROVIDER_ID,
  deriveMidiReferenceFromAudio,
} from '../providers/basic-pitch/basicPitchProvider.js'
import { analyzeAudioDerivedMidiEvidence } from '../providers/basic-pitch/audioDerivedMidiEvidence.js'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { simpleScaleMidi } from './helpers/midiFixtures.js'

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function graph() {
  return createScoreGraph({
    sourceId: 'hardening-score',
    measures: [createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })],
    events: [createScoreEvent({ id: 's0', measureKey: 'P1:0', onset: 0, duration: 1, pitch: 60 })],
  })
}

function workerResponse(overrides = {}) {
  const midi = simpleScaleMidi()
  return {
    ok: true,
    providerId: BASIC_PITCH_PROVIDER_ID,
    packageVersion: BASIC_PITCH_PACKAGE_VERSION,
    modelSerialization: '/provider/model.tflite',
    modelSha256: 'model-sha',
    runtime: { python: '3.11.16', platform: 'test', executable: '/usr/bin/python3' },
    config: {},
    noteEvents: [{ pitchMidi: 60, startTimeSeconds: 0, endTimeSeconds: 0.5, amplitude: 0.9, pitchBends: null }],
    generatedMidiBase64: midi.toString('base64'),
    generatedMidiSha256: sha256(midi),
    modelOutputSummary: {},
    artifacts: null,
    ...overrides,
  }
}

function runnerFor(response) {
  return () => ({ status: 0, stdout: JSON.stringify(response), stderr: '' })
}

function malformedSmfLikeMidi() {
  const bytes = Buffer.alloc(14)
  bytes.write('MThd', 0, 'ascii')
  return bytes
}

test('Basic Pitch package version mismatch fails closed at the JS provider boundary', () => {
  const result = deriveMidiReferenceFromAudio(Buffer.from('audio'), {
    sourceId: 'version-mismatch',
    fileName: 'fixture.wav',
    runner: runnerFor(workerResponse({ packageVersion: '9.9.9' })),
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 'PROVIDER_FAILED')
  assert.equal(result.reason, 'PROVIDER_VERSION_MISMATCH')
  assert.deepEqual(result.details, {
    expectedPackageVersion: BASIC_PITCH_PACKAGE_VERSION,
    actualPackageVersion: '9.9.9',
  })
})

test('SMF-like but structurally malformed generated MIDI fails closed before symbolic evidence analysis', () => {
  const invalidMidi = malformedSmfLikeMidi()
  const response = workerResponse({
    generatedMidiBase64: invalidMidi.toString('base64'),
    generatedMidiSha256: sha256(invalidMidi),
  })
  const result = deriveMidiReferenceFromAudio(Buffer.from('audio'), {
    sourceId: 'invalid-midi',
    fileName: 'fixture.wav',
    runner: runnerFor(response),
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 'PROVIDER_FAILED')
  assert.equal(result.reason, 'INVALID_GENERATED_MIDI')
  assert.equal(result.details.midiReason, 'MALFORMED_MIDI_HEADER')
})

test('invalid generated MIDI cannot produce diagnostics or correction authority', () => {
  const invalidMidi = Buffer.from('not-midi')
  const response = workerResponse({
    generatedMidiBase64: invalidMidi.toString('base64'),
    generatedMidiSha256: sha256(invalidMidi),
  })
  const audio = Buffer.from('immutable-audio')
  const before = Buffer.from(audio)
  const result = analyzeAudioDerivedMidiEvidence({
    scoreGraph: graph(),
    audioInput: audio,
    sourceId: 'invalid-midi-analysis',
    fileName: 'fixture.mp3',
    providerOptions: { runner: runnerFor(response) },
  })

  assert.equal(result.providerResult.ok, false)
  assert.equal(result.providerResult.reason, 'INVALID_GENERATED_MIDI')
  assert.equal(result.midiEvidence, null)
  assert.deepEqual(result.diagnostics, [])
  assert.deepEqual(result.evidence, [])
  assert.equal(result.invariants.audioBytesUnchanged, true)
  assert.equal(result.invariants.automaticCorrectionAuthority, false)
  assert.equal(result.invariants.correctionPatchesProduced, false)
  assert.deepEqual(audio, before)
})