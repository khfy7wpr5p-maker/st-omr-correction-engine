import {
  MIDI_COMPARISON_CODE,
  MIDI_SCORE_PITCH_DOMAIN,
  createMidiReferenceDiagnostic,
} from '../../src/contracts/midiReferenceEvidence.js'
import { analyzeMidiScoreAlignment } from './midiScoreAlignment.js'

export const MIDI_INSTRUMENT_CONTRACT_VERSION = '1.0.0'

const DIRECT_DOMAINS = new Set(['DIRECT', 'SOUNDING', 'CONCERT', 'MIDI'])
const UNKNOWN_DOMAINS = new Set(['UNKNOWN', 'WRITTEN_UNKNOWN'])

function freezeTrackMap(input = {}) {
  if (input == null) return Object.freeze({})
  if (typeof input !== 'object' || Array.isArray(input)) throw new TypeError('partToTrackMap must be an object when provided.')
  const normalized = {}
  for (const [partId, raw] of Object.entries(input)) {
    if (!partId.trim()) throw new TypeError('partToTrackMap part ids must be non-empty strings.')
    const values = Array.isArray(raw) ? raw : [raw]
    if (!values.length || values.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new TypeError(`partToTrackMap.${partId} must contain non-negative integer track indices.`)
    }
    normalized[partId] = Object.freeze([...new Set(values)].sort((a, b) => a - b))
  }
  return Object.freeze(normalized)
}

function canonicalPitchDomain(value, fallback = MIDI_SCORE_PITCH_DOMAIN.SOUNDING) {
  if (value == null) return fallback
  const text = String(value).toUpperCase()
  if (DIRECT_DOMAINS.has(text)) return MIDI_SCORE_PITCH_DOMAIN.SOUNDING
  if (text === 'WRITTEN') return MIDI_SCORE_PITCH_DOMAIN.WRITTEN
  if (UNKNOWN_DOMAINS.has(text)) return MIDI_SCORE_PITCH_DOMAIN.UNKNOWN
  throw new TypeError(`Unsupported score pitch domain: ${value}`)
}

function normalizeProfile(profile, fallbackDomain = MIDI_SCORE_PITCH_DOMAIN.SOUNDING, fallbackSemitones = null) {
  if (profile == null) profile = {}
  if (typeof profile !== 'object' || Array.isArray(profile)) throw new TypeError('part pitch profiles must be objects.')
  const scorePitchDomain = canonicalPitchDomain(profile.scorePitchDomain ?? profile.pitchDomain, fallbackDomain)
  const semitoneValue = profile.writtenToSoundingSemitones ?? profile.transpositionSemitones ?? fallbackSemitones
  const writtenToSoundingSemitones = semitoneValue == null ? null : semitoneValue
  if (writtenToSoundingSemitones != null && (!Number.isInteger(writtenToSoundingSemitones) || writtenToSoundingSemitones < -48 || writtenToSoundingSemitones > 48)) {
    throw new TypeError('writtenToSoundingSemitones must be an integer between -48 and 48 when provided.')
  }
  if (scorePitchDomain === MIDI_SCORE_PITCH_DOMAIN.SOUNDING && writtenToSoundingSemitones != null && writtenToSoundingSemitones !== 0) {
    throw new TypeError('SOUNDING pitch profiles cannot declare a non-zero written-to-sounding transposition.')
  }
  return Object.freeze({
    scorePitchDomain,
    writtenToSoundingSemitones,
    instrumentId: typeof profile.instrumentId === 'string' && profile.instrumentId.trim() ? profile.instrumentId.trim() : null,
    instrumentName: typeof profile.instrumentName === 'string' && profile.instrumentName.trim() ? profile.instrumentName.trim() : null,
  })
}

function legacyDefaultProfile(context) {
  const explicitDomain = context.scorePitchDomain ?? context.pitchDomain
  const fallback = explicitDomain == null && context.transposingInstrument === true
    ? MIDI_SCORE_PITCH_DOMAIN.UNKNOWN
    : MIDI_SCORE_PITCH_DOMAIN.SOUNDING
  const domain = canonicalPitchDomain(explicitDomain, fallback)
  const semitones = context.writtenToSoundingSemitones ?? context.transpositionSemitones ?? null
  return normalizeProfile({
    scorePitchDomain: domain,
    writtenToSoundingSemitones: semitones,
    instrumentId: context.instrumentId,
    instrumentName: context.instrumentName,
  })
}

export function createMidiInstrumentContract(context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) throw new TypeError('MIDI instrument context must be an object.')
  const source = context.instrumentContract && typeof context.instrumentContract === 'object'
    ? { ...context, ...context.instrumentContract }
    : context
  const defaultProfile = legacyDefaultProfile(source)
  const rawProfiles = source.partPitchProfiles ?? {}
  if (rawProfiles == null || typeof rawProfiles !== 'object' || Array.isArray(rawProfiles)) throw new TypeError('partPitchProfiles must be an object when provided.')
  const partPitchProfiles = {}
  for (const [partId, profile] of Object.entries(rawProfiles)) {
    if (!partId.trim()) throw new TypeError('partPitchProfiles part ids must be non-empty strings.')
    partPitchProfiles[partId] = normalizeProfile(profile, defaultProfile.scorePitchDomain, defaultProfile.writtenToSoundingSemitones)
  }
  const partToTrackMap = freezeTrackMap(source.partToTrackMap)
  const strictTrackOwnership = source.strictTrackOwnership === true
  if (strictTrackOwnership) {
    const owner = new Map()
    for (const [partId, tracks] of Object.entries(partToTrackMap)) {
      for (const track of tracks) {
        if (owner.has(track)) throw new TypeError(`Track ${track} is mapped to multiple parts under strictTrackOwnership.`)
        owner.set(track, partId)
      }
    }
  }
  return Object.freeze({
    schema: 'st_omr_midi_instrument_contract',
    version: MIDI_INSTRUMENT_CONTRACT_VERSION,
    partToTrackMap,
    partPitchProfiles: Object.freeze(partPitchProfiles),
    defaultProfile,
    requirePartTrackMapping: source.requirePartTrackMapping === true,
    strictTrackOwnership,
    authority: 'EXPLICIT_HOST_CONTEXT_ONLY',
    automaticInstrumentInference: false,
  })
}

function scorePartId(event) {
  const value = event?.partId ?? event?.metadata?.partId ?? null
  return value == null ? null : String(value)
}

function failPreparation(reason, details = {}) {
  return Object.freeze({ ok: false, reason, details: Object.freeze({ ...details }) })
}

export function prepareScoreGraphForMidiInstrumentContract(scoreGraph, alignmentContext = {}) {
  if (!scoreGraph || !Array.isArray(scoreGraph.events) || !Array.isArray(scoreGraph.measures)) {
    return failPreparation('SCORE_GRAPH_REQUIRED')
  }
  let contract
  try {
    contract = createMidiInstrumentContract(alignmentContext)
  } catch (error) {
    return failPreparation('INVALID_INSTRUMENT_CONTRACT', { message: error?.message ?? String(error) })
  }

  const partIds = new Set()
  for (const event of scoreGraph.events) {
    if (event?.isRest) continue
    const partId = scorePartId(event)
    if (partId != null) partIds.add(partId)
  }
  if (contract.requirePartTrackMapping) {
    for (const partId of partIds) {
      if (!Object.hasOwn(contract.partToTrackMap, partId)) return failPreparation('PART_TRACK_MAPPING_REQUIRED', { partId })
    }
  }

  const eventPitchContext = new Map()
  let pitchChanged = false
  const events = []
  for (const event of scoreGraph.events) {
    if (event?.isRest || !Number.isInteger(event?.pitch)) {
      events.push(event)
      continue
    }
    const partId = scorePartId(event)
    const profile = partId != null && Object.hasOwn(contract.partPitchProfiles, partId)
      ? contract.partPitchProfiles[partId]
      : contract.defaultProfile
    if (profile.scorePitchDomain === MIDI_SCORE_PITCH_DOMAIN.UNKNOWN) {
      return failPreparation('UNRESOLVED_PITCH_DOMAIN', { eventId: event.id ?? null, partId })
    }
    let comparisonPitch = event.pitch
    if (profile.scorePitchDomain === MIDI_SCORE_PITCH_DOMAIN.WRITTEN) {
      if (!Number.isInteger(profile.writtenToSoundingSemitones)) {
        return failPreparation('UNRESOLVED_TRANSPOSITION', { eventId: event.id ?? null, partId })
      }
      comparisonPitch += profile.writtenToSoundingSemitones
      if (comparisonPitch < 0 || comparisonPitch > 127) {
        return failPreparation('TRANSPOSITION_OUT_OF_MIDI_RANGE', { eventId: event.id ?? null, partId, comparisonPitch })
      }
    }
    eventPitchContext.set(event.id, Object.freeze({
      eventId: event.id,
      partId,
      originalPitch: event.pitch,
      comparisonPitch,
      scorePitchDomain: profile.scorePitchDomain,
      writtenToSoundingSemitones: profile.scorePitchDomain === MIDI_SCORE_PITCH_DOMAIN.WRITTEN ? profile.writtenToSoundingSemitones : 0,
      instrumentId: profile.instrumentId,
      instrumentName: profile.instrumentName,
    }))
    if (comparisonPitch !== event.pitch) {
      pitchChanged = true
      events.push(Object.freeze({ ...event, pitch: comparisonPitch }))
    } else {
      events.push(event)
    }
  }

  const comparisonGraph = pitchChanged
    ? Object.freeze({ ...scoreGraph, events: Object.freeze(events) })
    : scoreGraph
  return Object.freeze({ ok: true, contract, comparisonGraph, eventPitchContext })
}

function emptyMetrics() {
  return Object.freeze({
    alignment_success_rate: 0,
    event_match_coverage: 0,
    pitch_agreement_rate: 0,
    onset_agreement_rate: 0,
    duration_agreement_rate: 0,
    ambiguous_match_rate: 0,
    unaligned_rate: 1,
    extra_note_diagnostic_rate: 0,
    missing_note_diagnostic_rate: 0,
  })
}

function unsupportedResult(preparation) {
  const details = preparation.details ?? {}
  const diagnostic = createMidiReferenceDiagnostic({
    code: MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT,
    details: {
      scoreEventId: details.eventId ?? null,
      midiEventId: null,
      pitchDeltaSemitones: null,
      onsetDeltaBeats: null,
      durationDeltaBeats: null,
      trackIndex: null,
      instrumentName: null,
      ambiguityReason: preparation.reason,
      partId: details.partId ?? null,
    },
  })
  return Object.freeze({
    alignment: Object.freeze({ status: 'UNSUPPORTED', reason: preparation.reason, confidence: 0 }),
    scoreEvents: Object.freeze([]),
    midiEvents: Object.freeze([]),
    matches: Object.freeze([]),
    diagnostics: Object.freeze([diagnostic]),
    metrics: emptyMetrics(),
    instrumentMapping: null,
  })
}

function decorateDetails(raw, info) {
  if (!info) return raw
  return {
    ...raw,
    scorePitch: info.originalPitch,
    scoreComparisonPitch: info.comparisonPitch,
    scorePitchDomain: info.scorePitchDomain,
    writtenToSoundingSemitones: info.writtenToSoundingSemitones,
    scorePartId: info.partId,
    scoreInstrumentId: info.instrumentId,
    scoreInstrumentName: info.instrumentName,
  }
}

function decorateDiagnostic(diagnostic, eventPitchContext) {
  const eventId = diagnostic?.location?.eventId ?? diagnostic?.details?.scoreEventId ?? null
  const info = eventId == null ? null : eventPitchContext.get(eventId)
  if (!info) return diagnostic
  return createMidiReferenceDiagnostic({
    code: diagnostic.code,
    location: diagnostic.location,
    details: decorateDetails(diagnostic.details ?? {}, info),
  })
}

function decorateScoreEvent(event, eventPitchContext) {
  const info = eventPitchContext.get(event.eventId)
  if (!info) return event
  return Object.freeze({
    ...event,
    pitch: info.originalPitch,
    comparisonPitch: info.comparisonPitch,
    scorePitchDomain: info.scorePitchDomain,
    writtenToSoundingSemitones: info.writtenToSoundingSemitones,
  })
}

export function analyzeMidiScoreAlignmentWithInstrumentContract(scoreGraph, midiReference, alignmentContext = {}, optionOverrides = {}) {
  const preparation = prepareScoreGraphForMidiInstrumentContract(scoreGraph, alignmentContext)
  if (!preparation.ok) return unsupportedResult(preparation)

  const safeContext = {
    ...alignmentContext,
    pitchDomain: 'SOUNDING',
    scorePitchDomain: 'SOUNDING',
    transposingInstrument: false,
    partToTrackMap: preparation.contract.partToTrackMap,
  }
  const analysis = analyzeMidiScoreAlignment(preparation.comparisonGraph, midiReference, safeContext, optionOverrides)
  const diagnostics = Object.freeze(analysis.diagnostics.map((item) => decorateDiagnostic(item, preparation.eventPitchContext)))
  const scoreEvents = Object.freeze((analysis.scoreEvents ?? []).map((event) => decorateScoreEvent(event, preparation.eventPitchContext)))
  const matches = Object.freeze((analysis.matches ?? []).map((match) => Object.freeze({
    ...match,
    score: decorateScoreEvent(match.score, preparation.eventPitchContext),
  })))
  return Object.freeze({
    ...analysis,
    scoreEvents,
    matches,
    diagnostics,
    instrumentMapping: preparation.contract,
  })
}
