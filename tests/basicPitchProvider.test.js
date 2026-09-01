import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { EVIDENCE_SOURCE, createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { MIDI_REFERENCE_SOURCE_TYPE } from '../src/contracts/midiReferenceEvidence.js'
import {
  BASIC_PITCH_FRESH_READ_SHA,
  BASIC_PITCH_PACKAGE_VERSION,
  BASIC_PITCH_PROVIDER_ID,
  createAudioDerivedMidiReference,
  deriveMidiReferenceFromAudio,
} from '../providers/basic-pitch/basicPitchProvider.js'
import { analyzeAudioDerivedMidiEvidence } from '../providers/basic-pitch/audioDerivedMidiEvidence.js'
import { simpleScaleMidi } from './helpers/midiFixtures.js'

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function scaleGraph() {
  const measure = createMeasure({ key: 'P1:0', beats: 4, beatType: 4 })
  return createScoreGraph({ sourceId: 'score-source', measures: [measure], events: [
    createScoreEvent({ id: 's0', measureKey: 'P1:0', onset: 0, duration: 1, pitch: 60 }),
    createScoreEvent({ id: 's1', measureKey: 'P1:0', onset: 1, duration: 1, pitch: 62 }),
    createScoreEvent({ id: 's2', measureKey: 'P1:0', onset: 2, duration: 1, pitch: 64 }),
  ] })
}

function successfulRunner() {
  const midi = simpleScaleMidi()
  const response = {
    ok: true,
    providerId: BASIC_PITCH_PROVIDER_ID,
    packageVersion: BASIC_PITCH_PACKAGE_VERSION,
    modelSerialization: '/provider/basic_pitch/saved_models/icassp_2022/nmp.tflite',
    modelSha256: 'model-sha-256',
    runtime: { python: '3.11.9', platform: 'test', executable: '/usr/bin/python3' },
    config: { onset_threshold: 0.5 },
    noteEvents: [
      { pitchMidi: 60, startTimeSeconds: 0, endTimeSeconds: 0.5, amplitude: 0.9, pitchBends: null },
      { pitchMidi: 62, startTimeSeconds: 0.5, endTimeSeconds: 1, amplitude: 0.8, pitchBends: null },
      { pitchMidi: 64, startTimeSeconds: 1, endTimeSeconds: 1.5, amplitude: 0.85, pitchBends: [0, 1] },
    ],
    generatedMidiBase64: midi.toString('base64'),
    generatedMidiSha256: sha256(midi),
    modelOutputSummary: { note: { shape: [3, 88], dtype: 'float32', sha256: 'note-output-sha' } },
    artifacts: null,
  }
  return { status: 0, stdout: JSON.stringify(response), stderr: '' }
}

test('Basic Pitch provider marks every successful artifact AUDIO_DERIVED with pinned provenance', () => {
  const audio = Buffer.from('synthetic-wav-fixture')
  const before = Buffer.from(audio)
  const result = deriveMidiReferenceFromAudio(audio, {
    sourceId: 'audio-001', fileName: 'fixture.wav', providerConfig: { onset_threshold: 0.5 }, runner: successfulRunner,
  })
  assert.equal(result.ok, true)
  assert.equal(result.sourceType, MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED)
  assert.equal(result.authority, 'SHADOW_EVIDENCE_ONLY')
  assert.equal(result.audioSha256, sha256(audio))
  assert.equal(result.provider.packageVersion, BASIC_PITCH_PACKAGE_VERSION)
  assert.equal(result.provider.freshReadRepositorySha, BASIC_PITCH_FRESH_READ_SHA)
  assert.equal(result.provider.modelSha256, 'model-sha-256')
  assert.deepEqual(audio, before)
})

test('same audio and provider response produce deterministic source and MIDI fingerprints', () => {
  const audio = Buffer.from('deterministic-audio')
  const options = { sourceId: 'audio-det', fileName: 'fixture.flac', runner: successfulRunner }
  const first = deriveMidiReferenceFromAudio(audio, options)
  const second = deriveMidiReferenceFromAudio(audio, options)
  assert.equal(first.audioSha256, second.audioSha256)
  assert.equal(first.generatedMidiSha256, second.generatedMidiSha256)
  assert.deepEqual(first.noteEvents, second.noteEvents)
})

test('provider unavailable fails closed without creating reference authority', () => {
  const unavailableRunner = () => ({ error: Object.assign(new Error('spawn python3 ENOENT'), { code: 'ENOENT' }) })
  const result = deriveMidiReferenceFromAudio(Buffer.from('audio'), { sourceId: 'audio-unavailable', fileName: 'fixture.ogg', runner: unavailableRunner })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'PROVIDER_UNAVAILABLE')
  assert.equal(result.reason, 'PYTHON_EXECUTABLE_UNAVAILABLE')
  assert.equal(result.sourceType, MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED)
  assert.equal(result.metrics.audio_provider_success_rate, 0)
})

test('unsupported audio extension is rejected before provider execution', () => {
  let called = false
  const result = deriveMidiReferenceFromAudio(Buffer.from('audio'), {
    sourceId: 'audio-bad-extension', fileName: 'fixture.aac', runner: () => { called = true; return successfulRunner() },
  })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'INPUT_ERROR')
  assert.equal(called, false)
})

test('generated MIDI is forced to AUDIO_DERIVED provenance and fingerprint checked', () => {
  const result = deriveMidiReferenceFromAudio(Buffer.from('audio'), { sourceId: 'audio-ref', fileName: 'fixture.m4a', runner: successfulRunner })
  const reference = createAudioDerivedMidiReference(result)
  assert.equal(reference.provenance.sourceType, MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED)
  assert.equal(sha256(reference.midiInput), result.generatedMidiSha256)
})

test('audio-derived MIDI flows into symbolic shadow evidence without automatic correction authority', () => {
  const audio = Buffer.from('synthetic-audio-source')
  const before = Buffer.from(audio)
  const result = analyzeAudioDerivedMidiEvidence({
    scoreGraph: scaleGraph(),
    audioInput: audio,
    sourceId: 'audio-e2e',
    fileName: 'fixture.mp3',
    providerOptions: { runner: successfulRunner },
  })
  assert.equal(result.mode, 'SHADOW_ONLY')
  assert.equal(result.sourceType, MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED)
  assert.ok(result.evidence.length > 0)
  assert.ok(result.evidence.every((item) => item.source === EVIDENCE_SOURCE.SYMBOLIC))
  assert.ok(result.evidence.every((item) => item.weight === 0))
  assert.ok(result.evidence.every((item) => item.details.midiSourceType === MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED))
  assert.equal(result.invariants.automaticCorrectionAuthority, false)
  assert.equal(result.invariants.correctionPatchesProduced, false)
  assert.equal(result.invariants.audioBytesUnchanged, true)
  assert.deepEqual(audio, before)
})

test('audio provider failure produces no diagnostic pretending transcription succeeded', () => {
  const failedRunner = () => ({ status: 2, stdout: JSON.stringify({ ok: false, status: 'PROVIDER_FAILED', reason: 'BASIC_PITCH_TRANSCRIPTION_FAILED' }), stderr: '' })
  const result = analyzeAudioDerivedMidiEvidence({
    scoreGraph: scaleGraph(), audioInput: Buffer.from('bad-audio'), sourceId: 'audio-fail', fileName: 'fixture.wav', providerOptions: { runner: failedRunner },
  })
  assert.equal(result.providerResult.ok, false)
  assert.deepEqual(result.evidence, [])
  assert.equal(result.invariants.automaticCorrectionAuthority, false)
  assert.equal(result.metrics.audio_provider_success_rate, 0)
})
