import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import ToneMidiPackage from '@tonejs/midi'
import { MIDI_COMPARISON_CODE, isMidiReferenceSourceType } from '../../src/contracts/midiReferenceEvidence.js'
import { normalizeParsedMidiReference } from './midiNormalizer.js'

const { Midi } = ToneMidiPackage

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function readMidiBytes(input) {
  if (typeof input === 'string') {
    const extension = extname(input).toLowerCase()
    if (extension !== '.mid' && extension !== '.midi') throw new TypeError('MIDI path must end in .mid or .midi.')
    return Buffer.from(readFileSync(input))
  }
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) return Buffer.from(input)
  throw new TypeError('MIDI input must be a .mid/.midi path, Buffer, or Uint8Array.')
}

function inspectHeader(bytes) {
  if (bytes.length < 14 || bytes.subarray(0, 4).toString('ascii') !== 'MThd') {
    return { ok: false, reason: 'MALFORMED_MIDI_HEADER' }
  }
  const headerLength = bytes.readUInt32BE(4)
  if (headerLength < 6 || bytes.length < 8 + headerLength) return { ok: false, reason: 'MALFORMED_MIDI_HEADER' }
  const format = bytes.readUInt16BE(8)
  const trackCount = bytes.readUInt16BE(10)
  const division = bytes.readUInt16BE(12)
  if ((division & 0x8000) !== 0) return { ok: false, reason: 'SMPTE_TIMING_UNSUPPORTED', format, trackCount, division }
  if (format === 2) return { ok: false, reason: 'MIDI_TYPE_2_UNSUPPORTED', format, trackCount, division }
  if (format !== 0 && format !== 1) return { ok: false, reason: 'MIDI_FORMAT_UNSUPPORTED', format, trackCount, division }
  if (division <= 0) return { ok: false, reason: 'INVALID_PPQ', format, trackCount, division }
  return { ok: true, format, trackCount, division }
}

export function parseMidiReference(input, { sourceId, sourceType } = {}) {
  if (typeof sourceId !== 'string' || !sourceId.trim()) throw new TypeError('MIDI sourceId is required.')
  if (!isMidiReferenceSourceType(sourceType)) throw new TypeError('Valid MIDI sourceType is required.')
  const bytes = readMidiBytes(input)
  const fingerprint = sha256(bytes)
  const header = inspectHeader(bytes)
  if (!header.ok) {
    return Object.freeze({
      ok: false,
      comparisonCode: MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT,
      reason: header.reason,
      sourceId,
      sourceType,
      sha256: fingerprint,
      header: Object.freeze({ ...header }),
    })
  }
  try {
    const midi = new Midi(bytes)
    return {
      ok: true,
      sourceId,
      sourceType,
      sha256: fingerprint,
      bytes,
      midi,
      header: Object.freeze({ format: header.format, trackCount: header.trackCount, ppq: header.division }),
    }
  } catch (error) {
    return Object.freeze({
      ok: false,
      comparisonCode: MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT,
      reason: 'MALFORMED_MIDI',
      message: error instanceof Error ? error.message : String(error),
      sourceId,
      sourceType,
      sha256: fingerprint,
      header: Object.freeze({ format: header.format, trackCount: header.trackCount, ppq: header.division }),
    })
  }
}

export function loadMidiReference(input, provenance) {
  const parsed = parseMidiReference(input, provenance)
  if (!parsed.ok) return parsed
  return normalizeParsedMidiReference(parsed)
}
