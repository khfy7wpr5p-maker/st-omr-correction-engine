import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { MIDI_REFERENCE_SOURCE_TYPE } from '../../src/contracts/midiReferenceEvidence.js'

export const BASIC_PITCH_PROVIDER_ID = 'spotify_basic_pitch'
export const BASIC_PITCH_PACKAGE_VERSION = '0.4.0'
export const BASIC_PITCH_FRESH_READ_SHA = 'fa5997af0a8210982619003269994a1be25eddf3'
export const BASIC_PITCH_SUPPORTED_AUDIO_EXTENSIONS = Object.freeze(['.mp3', '.ogg', '.wav', '.flac', '.m4a'])

const DEFAULT_WORKER_PATH = fileURLToPath(new URL('./basic_pitch_worker.py', import.meta.url))

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function freezeFailure({ sourceId, audioSha256 = null, status, reason, message = null, details = null }) {
  return Object.freeze({
    ok: false,
    providerId: BASIC_PITCH_PROVIDER_ID,
    sourceId,
    sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED,
    audioSha256,
    status,
    reason,
    message,
    details: details ? Object.freeze({ ...details }) : null,
    metrics: Object.freeze({ audio_provider_success_rate: 0, audio_to_note_event_output_rate: 0 }),
  })
}

function validateExtension(fileName) {
  const extension = extname(fileName ?? '').toLowerCase()
  if (!BASIC_PITCH_SUPPORTED_AUDIO_EXTENSIONS.includes(extension)) {
    throw new TypeError(`Unsupported audio extension: ${extension || '(missing)'}.`)
  }
  return extension
}

function prepareAudioInput(audioInput, fileName) {
  if (typeof audioInput === 'string') {
    validateExtension(audioInput)
    const bytes = Buffer.from(readFileSync(audioInput))
    return { audioPath: audioInput, audioFileName: basename(audioInput), bytes, cleanup: () => {} }
  }
  if (!Buffer.isBuffer(audioInput) && !(audioInput instanceof Uint8Array)) {
    throw new TypeError('Audio input must be a supported file path, Buffer, or Uint8Array.')
  }
  if (typeof fileName !== 'string' || !fileName.trim()) throw new TypeError('fileName with a supported extension is required for audio bytes.')
  const extension = validateExtension(fileName)
  const bytes = Buffer.from(audioInput)
  const directory = mkdtempSync(join(tmpdir(), 'ce-basic-pitch-'))
  const audioPath = join(directory, `input${extension}`)
  writeFileSync(audioPath, bytes)
  return { audioPath, audioFileName: basename(fileName), bytes, cleanup: () => rmSync(directory, { recursive: true, force: true }) }
}

function parseWorkerJson(stdout) {
  const text = String(stdout ?? '').trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function normalizedNoteEvent(event, index) {
  const pitchMidi = Number(event?.pitchMidi)
  const startTimeSeconds = Number(event?.startTimeSeconds)
  const endTimeSeconds = Number(event?.endTimeSeconds)
  const amplitude = Number(event?.amplitude)
  if (!Number.isInteger(pitchMidi) || pitchMidi < 0 || pitchMidi > 127) throw new TypeError(`Invalid Basic Pitch note pitch at index ${index}.`)
  if (!Number.isFinite(startTimeSeconds) || startTimeSeconds < 0 || !Number.isFinite(endTimeSeconds) || endTimeSeconds < startTimeSeconds) {
    throw new TypeError(`Invalid Basic Pitch note timing at index ${index}.`)
  }
  const pitchBends = event?.pitchBends == null ? null : Object.freeze([...event.pitchBends].map(Number))
  return Object.freeze({
    eventId: `AUDIO:N${index}:${pitchMidi}:${startTimeSeconds.toFixed(6)}`,
    pitchMidi,
    startTimeSeconds,
    endTimeSeconds,
    durationSeconds: endTimeSeconds - startTimeSeconds,
    amplitude: Number.isFinite(amplitude) ? amplitude : null,
    pitchBends,
  })
}

function hasStandardMidiHeader(bytes) {
  return bytes.length >= 14 && bytes.subarray(0, 4).toString('ascii') === 'MThd'
}

export function createAudioDerivedMidiReference(providerResult) {
  if (!providerResult?.ok || providerResult.providerId !== BASIC_PITCH_PROVIDER_ID) throw new TypeError('Successful Basic Pitch provider result is required.')
  const midiInput = Buffer.from(providerResult.generatedMidiBase64, 'base64')
  if (sha256(midiInput) !== providerResult.generatedMidiSha256) throw new Error('Generated MIDI fingerprint mismatch.')
  if (!hasStandardMidiHeader(midiInput)) throw new Error('Generated MIDI is not a standard MIDI file.')
  return Object.freeze({
    midiInput,
    provenance: Object.freeze({ sourceId: providerResult.sourceId, sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED }),
  })
}

export function deriveMidiReferenceFromAudio(audioInput, {
  sourceId,
  fileName = null,
  artifactDirectory = null,
  pythonExecutable = 'python3',
  workerPath = DEFAULT_WORKER_PATH,
  providerConfig = {},
  runner = spawnSync,
} = {}) {
  if (typeof sourceId !== 'string' || !sourceId.trim()) throw new TypeError('Audio sourceId is required.')

  let prepared
  try {
    prepared = prepareAudioInput(audioInput, fileName)
  } catch (error) {
    return freezeFailure({ sourceId, status: 'INPUT_ERROR', reason: 'AUDIO_INPUT_UNREADABLE', message: error instanceof Error ? error.message : String(error) })
  }

  const audioSha256 = sha256(prepared.bytes)
  try {
    const payload = {
      providerId: BASIC_PITCH_PROVIDER_ID,
      sourceId,
      audioPath: prepared.audioPath,
      artifactDirectory,
      config: { ...providerConfig },
      freshReadRepositorySha: BASIC_PITCH_FRESH_READ_SHA,
      expectedPackageVersion: BASIC_PITCH_PACKAGE_VERSION,
    }
    const execution = runner(pythonExecutable, [workerPath], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    })

    if (execution?.error) {
      const unavailable = execution.error.code === 'ENOENT'
      return freezeFailure({
        sourceId,
        audioSha256,
        status: unavailable ? 'PROVIDER_UNAVAILABLE' : 'PROVIDER_FAILED',
        reason: unavailable ? 'PYTHON_EXECUTABLE_UNAVAILABLE' : 'BASIC_PITCH_PROCESS_ERROR',
        message: execution.error.message,
      })
    }

    const worker = parseWorkerJson(execution?.stdout)
    if (!worker) {
      return freezeFailure({
        sourceId,
        audioSha256,
        status: 'PROVIDER_FAILED',
        reason: 'INVALID_PROVIDER_RESPONSE',
        message: String(execution?.stderr ?? '').trim() || null,
        details: { exitStatus: execution?.status ?? null },
      })
    }
    if (execution?.status !== 0 || worker.ok !== true) {
      return freezeFailure({
        sourceId,
        audioSha256,
        status: worker.status ?? (execution?.status === 3 ? 'PROVIDER_UNAVAILABLE' : 'PROVIDER_FAILED'),
        reason: worker.reason ?? 'BASIC_PITCH_TRANSCRIPTION_FAILED',
        message: worker.message ?? (String(execution?.stderr ?? '').trim() || null),
        details: { exitStatus: execution?.status ?? null, runtime: worker.runtime ?? null },
      })
    }
    if (worker.providerId !== BASIC_PITCH_PROVIDER_ID || typeof worker.generatedMidiBase64 !== 'string' || !Array.isArray(worker.noteEvents)) {
      return freezeFailure({ sourceId, audioSha256, status: 'PROVIDER_FAILED', reason: 'INVALID_PROVIDER_CONTRACT' })
    }
    if (worker.packageVersion !== BASIC_PITCH_PACKAGE_VERSION) {
      return freezeFailure({
        sourceId,
        audioSha256,
        status: 'PROVIDER_FAILED',
        reason: 'PROVIDER_VERSION_MISMATCH',
        details: { expectedPackageVersion: BASIC_PITCH_PACKAGE_VERSION, actualPackageVersion: worker.packageVersion ?? null },
      })
    }

    const generatedMidiBytes = Buffer.from(worker.generatedMidiBase64, 'base64')
    if (!generatedMidiBytes.length) return freezeFailure({ sourceId, audioSha256, status: 'PROVIDER_FAILED', reason: 'EMPTY_GENERATED_MIDI' })
    if (!hasStandardMidiHeader(generatedMidiBytes)) return freezeFailure({ sourceId, audioSha256, status: 'PROVIDER_FAILED', reason: 'INVALID_GENERATED_MIDI' })
    const generatedMidiSha256 = sha256(generatedMidiBytes)
    if (worker.generatedMidiSha256 && worker.generatedMidiSha256 !== generatedMidiSha256) {
      return freezeFailure({ sourceId, audioSha256, status: 'PROVIDER_FAILED', reason: 'GENERATED_MIDI_FINGERPRINT_MISMATCH' })
    }

    let noteEvents
    try {
      noteEvents = Object.freeze(worker.noteEvents.map(normalizedNoteEvent))
    } catch (error) {
      return freezeFailure({ sourceId, audioSha256, status: 'PROVIDER_FAILED', reason: 'INVALID_NOTE_EVENT_CONTRACT', message: error instanceof Error ? error.message : String(error) })
    }

    return Object.freeze({
      ok: true,
      providerId: BASIC_PITCH_PROVIDER_ID,
      sourceId,
      sourceType: MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED,
      authority: 'SHADOW_EVIDENCE_ONLY',
      audioFileName: prepared.audioFileName,
      audioSha256,
      generatedMidiBase64: worker.generatedMidiBase64,
      generatedMidiSha256,
      noteEvents,
      provider: Object.freeze({
        packageVersion: worker.packageVersion,
        freshReadRepositorySha: BASIC_PITCH_FRESH_READ_SHA,
        modelSerialization: worker.modelSerialization ?? null,
        modelSha256: worker.modelSha256 ?? null,
        runtime: worker.runtime ? Object.freeze({ ...worker.runtime }) : null,
        config: worker.config ? Object.freeze({ ...worker.config }) : Object.freeze({ ...providerConfig }),
        modelOutputSummary: worker.modelOutputSummary ? Object.freeze({ ...worker.modelOutputSummary }) : null,
        artifacts: worker.artifacts ? Object.freeze({ ...worker.artifacts }) : null,
      }),
      metrics: Object.freeze({
        audio_provider_success_rate: 1,
        audio_to_note_event_output_rate: noteEvents.length > 0 ? 1 : 0,
      }),
    })
  } finally {
    prepared.cleanup()
  }
}