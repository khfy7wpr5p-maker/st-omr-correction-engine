import { MIDI_COMPARISON_CODE, createMidiReferenceDiagnostic } from '../../src/contracts/midiReferenceEvidence.js'

export const DEFAULT_MIDI_ALIGNMENT_OPTIONS = Object.freeze({
  onsetWindowBeats: 0.35,
  onsetToleranceBeats: 0.08,
  durationToleranceBeats: 0.12,
  ambiguityMargin: 0.04,
  maxCandidateEdges: 4096,
  maxScaleDrift: 0.05,
  maxAlignmentResidualBeats: 0.16,
  minimumInferredCoverage: 0.4,
})

const clamp01 = (value) => Math.max(0, Math.min(1, value))
const round = (value, digits = 9) => Number(value.toFixed(digits))

function expectedQuarterBeats(measure) {
  if (Number.isFinite(measure?.expectedQuarterBeats) && measure.expectedQuarterBeats > 0) return measure.expectedQuarterBeats
  if (Number.isFinite(measure?.beats) && measure.beats > 0 && Number.isFinite(measure?.beatType) && measure.beatType > 0) {
    return measure.beats * (4 / measure.beatType)
  }
  return null
}

export function extractScoreReferenceEvents(scoreGraph) {
  if (!scoreGraph || !Array.isArray(scoreGraph.measures) || !Array.isArray(scoreGraph.events)) {
    return Object.freeze({ ok: false, reason: 'SCORE_GRAPH_REQUIRED', events: Object.freeze([]) })
  }
  const measureStarts = new Map()
  let cursor = 0
  for (const measure of scoreGraph.measures) {
    if (typeof measure?.key !== 'string' || !measure.key || measureStarts.has(measure.key)) {
      return Object.freeze({ ok: false, reason: 'INVALID_MEASURE_IDENTITY', events: Object.freeze([]) })
    }
    const length = expectedQuarterBeats(measure)
    if (!Number.isFinite(length)) return Object.freeze({ ok: false, reason: 'MEASURE_TIMING_CONTEXT_MISSING', events: Object.freeze([]) })
    measureStarts.set(measure.key, cursor)
    cursor += length
  }

  const ids = new Set()
  const events = []
  for (const event of scoreGraph.events) {
    if (!event?.id || ids.has(event.id)) return Object.freeze({ ok: false, reason: 'INVALID_SCORE_EVENT_IDENTITY', events: Object.freeze([]) })
    ids.add(event.id)
    if (event.isRest) continue
    const measureStart = measureStarts.get(event.measureKey)
    if (!Number.isFinite(measureStart)) return Object.freeze({ ok: false, reason: 'UNKNOWN_SCORE_MEASURE', events: Object.freeze([]) })
    if (!Number.isInteger(event.pitch) || event.pitch < 0 || event.pitch > 127) {
      return Object.freeze({ ok: false, reason: 'SCORE_PITCH_DOMAIN_UNSUPPORTED', eventId: event.id, events: Object.freeze([]) })
    }
    if (!Number.isFinite(event.onset) || event.onset < 0 || !Number.isFinite(event.duration) || event.duration < 0) {
      return Object.freeze({ ok: false, reason: 'SCORE_TIMING_CONTEXT_MISSING', eventId: event.id, events: Object.freeze([]) })
    }
    events.push(Object.freeze({
      eventId: event.id,
      measureKey: event.measureKey,
      partId: event.partId ?? event.metadata?.partId ?? null,
      voice: event.voice ?? null,
      staff: event.staff ?? null,
      pitch: event.pitch,
      onsetBeats: event.onset,
      durationBeats: event.duration,
      globalOnsetBeats: measureStart + event.onset,
      isChordTone: !!event.isChordTone,
    }))
  }
  return Object.freeze({ ok: true, events: Object.freeze(events), totalQuarterBeats: cursor })
}

function validatePitchDomain(context) {
  const pitchDomain = String(context.pitchDomain ?? 'DIRECT').toUpperCase()
  if (pitchDomain === 'UNKNOWN' || pitchDomain === 'WRITTEN_UNKNOWN') return 'UNRESOLVED_PITCH_DOMAIN'
  if (context.transposingInstrument === true && !['SOUNDING', 'CONCERT', 'MIDI'].includes(pitchDomain)) return 'UNRESOLVED_TRANSPOSITION'
  return null
}

function filterMidiEvents(midiReference, context) {
  if (!midiReference?.ok || !Array.isArray(midiReference.events)) return { ok: false, reason: 'NORMALIZED_MIDI_REQUIRED', events: [] }
  const selectedTracks = Array.isArray(context.trackSelection)
    ? new Set(context.trackSelection)
    : Array.isArray(context.trackIndices) ? new Set(context.trackIndices) : null
  const events = midiReference.events.filter((event) => !event.percussion && (!selectedTracks || selectedTracks.has(event.trackIndex)))
  if (events.some((event) => !Number.isFinite(event.startBeats) || !Number.isFinite(event.durationBeats))) {
    return { ok: false, reason: 'MIDI_TIMING_CONTEXT_MISSING', events: [] }
  }
  if (!events.length) return { ok: false, reason: 'NO_COMPARABLE_PITCHED_MIDI_EVENTS', events: [] }
  return { ok: true, events }
}

function affineFit(pairs, options, method, confidenceBase = 1) {
  if (!pairs.length) return null
  if (pairs.length === 1) {
    const offsetBeats = pairs[0].scoreBeat - pairs[0].midiBeat
    return Object.freeze({ status: 'ALIGNED', method, scale: 1, offsetBeats: round(offsetBeats), residualBeats: 0, confidence: clamp01(confidenceBase * 0.7), anchorCount: 1 })
  }
  const meanX = pairs.reduce((sum, pair) => sum + pair.midiBeat, 0) / pairs.length
  const meanY = pairs.reduce((sum, pair) => sum + pair.scoreBeat, 0) / pairs.length
  let variance = 0
  let covariance = 0
  for (const pair of pairs) {
    variance += (pair.midiBeat - meanX) ** 2
    covariance += (pair.midiBeat - meanX) * (pair.scoreBeat - meanY)
  }
  if (variance <= 1e-12) return null
  const scale = covariance / variance
  if (!Number.isFinite(scale) || Math.abs(scale - 1) > options.maxScaleDrift) return null
  const offsetBeats = meanY - scale * meanX
  const residualBeats = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair.scoreBeat - (scale * pair.midiBeat + offsetBeats)) ** 2, 0) / pairs.length)
  if (!Number.isFinite(residualBeats) || residualBeats > options.maxAlignmentResidualBeats) return null
  const support = Math.min(1, pairs.length / 4)
  const residualFactor = 1 - Math.min(1, residualBeats / Math.max(options.maxAlignmentResidualBeats, 1e-9))
  return Object.freeze({
    status: 'ALIGNED', method, scale: round(scale), offsetBeats: round(offsetBeats), residualBeats: round(residualBeats),
    confidence: clamp01(confidenceBase * (0.65 + 0.2 * support + 0.15 * residualFactor)), anchorCount: pairs.length,
  })
}

function hostAnchorPairs(scoreEvents, context) {
  const pairs = []
  for (const anchor of context.anchors ?? []) {
    if (Number.isFinite(anchor?.scoreBeat) && Number.isFinite(anchor?.midiBeat)) pairs.push({ scoreBeat: anchor.scoreBeat, midiBeat: anchor.midiBeat })
  }
  if (Array.isArray(context.measureAnchors)) {
    const byMeasure = new Map(scoreEvents.map((event) => [event.measureKey, event.globalOnsetBeats - event.onsetBeats]))
    for (const anchor of context.measureAnchors) {
      const measureStart = byMeasure.get(anchor?.measureKey)
      if (Number.isFinite(measureStart) && Number.isFinite(anchor?.midiBeat)) {
        pairs.push({ scoreBeat: measureStart + (Number.isFinite(anchor.scoreBeatInMeasure) ? anchor.scoreBeatInMeasure : 0), midiBeat: anchor.midiBeat })
      }
    }
  }
  return pairs
}

function uniquePitchPairs(scoreEvents, midiEvents) {
  const scoreByPitch = new Map()
  const midiByPitch = new Map()
  for (const event of scoreEvents) scoreByPitch.set(event.pitch, [...(scoreByPitch.get(event.pitch) ?? []), event])
  for (const event of midiEvents) midiByPitch.set(event.midiPitch, [...(midiByPitch.get(event.midiPitch) ?? []), event])
  const pairs = []
  for (const [pitch, scoreMatches] of scoreByPitch) {
    const midiMatches = midiByPitch.get(pitch)
    if (scoreMatches.length === 1 && midiMatches?.length === 1) pairs.push({ scoreBeat: scoreMatches[0].globalOnsetBeats, midiBeat: midiMatches[0].startBeats })
  }
  return pairs
}

function offsetVoteAlignment(scoreEvents, midiEvents) {
  const votes = new Map()
  let pairCount = 0
  for (const score of scoreEvents) {
    for (const midi of midiEvents) {
      if (score.pitch !== midi.midiPitch) continue
      pairCount += 1
      const delta = Math.round((score.globalOnsetBeats - midi.startBeats) * 16) / 16
      votes.set(delta, (votes.get(delta) ?? 0) + 1)
    }
  }
  if (!pairCount) return null
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1] || Math.abs(a[0]) - Math.abs(b[0]) || a[0] - b[0])
  const [offsetBeats, support] = ranked[0]
  const dominance = support / pairCount
  const minimumSupport = Math.min(scoreEvents.length, midiEvents.length) === 1 ? 1 : 2
  if (support < minimumSupport || dominance < 0.3) return null
  return Object.freeze({
    status: 'ALIGNED', method: 'pitch_offset_vote', scale: 1, offsetBeats: round(offsetBeats), residualBeats: null,
    confidence: clamp01(0.45 + 0.4 * dominance), anchorCount: support,
  })
}

export function estimateMidiScoreAlignment(scoreEvents, midiEvents, context = {}, options = DEFAULT_MIDI_ALIGNMENT_OPTIONS) {
  const explicitOffset = context.globalBeatOffset ?? context.knownGlobalBeatOffset ?? context.pickupOffsetBeats ?? context.knownPickupOffsetBeats
  if (Number.isFinite(explicitOffset)) {
    const scale = Number.isFinite(context.globalBeatScale) ? context.globalBeatScale : 1
    if (Math.abs(scale - 1) > options.maxScaleDrift) return Object.freeze({ status: 'UNALIGNED', reason: 'HOST_SCALE_OUT_OF_BOUNDS', confidence: 0 })
    return Object.freeze({ status: 'ALIGNED', method: 'host_offset', scale: round(scale), offsetBeats: round(explicitOffset), residualBeats: 0, confidence: 1, anchorCount: 1 })
  }
  const hostPairs = hostAnchorPairs(scoreEvents, context)
  if (hostPairs.length) {
    const fit = affineFit(hostPairs, options, 'host_anchors', 1)
    return fit ?? Object.freeze({ status: 'UNALIGNED', reason: 'HOST_ANCHORS_INCONSISTENT', confidence: 0 })
  }
  const uniquePairs = uniquePitchPairs(scoreEvents, midiEvents)
  if (uniquePairs.length >= 2) {
    const fit = affineFit(uniquePairs, options, 'unique_pitch_affine', 0.9)
    if (fit) return fit
  }
  if (uniquePairs.length === 1 && scoreEvents.length === 1 && midiEvents.length === 1) {
    return affineFit(uniquePairs, options, 'single_pitch_anchor', 0.8)
  }
  const voted = offsetVoteAlignment(scoreEvents, midiEvents)
  if (voted) return voted
  return Object.freeze({ status: 'UNALIGNED', reason: 'INSUFFICIENT_ALIGNMENT_EVIDENCE', confidence: 0 })
}

function partTrackCompatible(score, midi, context) {
  const map = context.partToTrackMap
  if (!map || score.partId == null) return true
  const expected = map[score.partId]
  if (expected == null) return true
  return Array.isArray(expected) ? expected.includes(midi.trackIndex) : expected === midi.trackIndex
}

function edgeCost(score, midi, alignedMidiBeat, options) {
  const onsetDistance = Math.abs(alignedMidiBeat - score.globalOnsetBeats)
  const pitchDistance = Math.abs(midi.midiPitch - score.pitch)
  const durationDistance = Math.abs(midi.durationBeats - score.durationBeats)
  const durationScale = Math.max(0.25, score.durationBeats, midi.durationBeats)
  return (onsetDistance / options.onsetWindowBeats) * 0.6 + (Math.min(pitchDistance, 12) / 12) * 0.3 + Math.min(1, durationDistance / durationScale) * 0.1
}

function locationFor(score) {
  return Object.freeze({ eventId: score.eventId, measureKey: score.measureKey, partId: score.partId, voice: score.voice, staff: score.staff })
}

function pairDetails(score, midi, alignment) {
  const alignedMidiBeat = alignment.scale * midi.startBeats + alignment.offsetBeats
  return {
    scoreEventId: score.eventId,
    midiEventId: midi.eventId,
    scorePitch: score.pitch,
    midiPitch: midi.midiPitch,
    pitchDeltaSemitones: midi.midiPitch - score.pitch,
    onsetDeltaBeats: round(alignedMidiBeat - score.globalOnsetBeats),
    durationDeltaBeats: round(midi.durationBeats - score.durationBeats),
    trackIndex: midi.trackIndex,
    instrumentName: midi.instrumentName ?? null,
    sustainContext: midi.sustainContext ?? null,
  }
}

function matchedDiagnostics(score, midi, alignment, options) {
  const details = pairDetails(score, midi, alignment)
  const pitchMatches = details.pitchDeltaSemitones === 0
  const onsetMatches = Math.abs(details.onsetDeltaBeats) <= options.onsetToleranceBeats
  const durationMatches = Math.abs(details.durationDeltaBeats) <= options.durationToleranceBeats
  if (pitchMatches && onsetMatches && durationMatches) {
    return [createMidiReferenceDiagnostic({ code: MIDI_COMPARISON_CODE.EXACT_MATCH, location: locationFor(score), details })]
  }
  const diagnostics = [createMidiReferenceDiagnostic({
    code: pitchMatches ? MIDI_COMPARISON_CODE.PITCH_MATCH : MIDI_COMPARISON_CODE.PITCH_CONFLICT,
    location: locationFor(score), details,
  })]
  if (!onsetMatches) diagnostics.push(createMidiReferenceDiagnostic({ code: MIDI_COMPARISON_CODE.ONSET_CONFLICT, location: locationFor(score), details }))
  if (!durationMatches) diagnostics.push(createMidiReferenceDiagnostic({ code: MIDI_COMPARISON_CODE.DURATION_CONFLICT, location: locationFor(score), details }))
  return diagnostics
}

function metricsFor({ scoreEvents, midiEvents, matched, ambiguousCount, missingCount, extraCount, alignment, options }) {
  const matchedCount = matched.length
  let pitchOk = 0
  let onsetOk = 0
  let durationOk = 0
  for (const pair of matched) {
    const details = pairDetails(pair.score, pair.midi, alignment)
    if (details.pitchDeltaSemitones === 0) pitchOk += 1
    if (Math.abs(details.onsetDeltaBeats) <= options.onsetToleranceBeats) onsetOk += 1
    if (Math.abs(details.durationDeltaBeats) <= options.durationToleranceBeats) durationOk += 1
  }
  const ratio = (numerator, denominator) => denominator ? numerator / denominator : 0
  return Object.freeze({
    alignment_success_rate: alignment.status === 'ALIGNED' ? 1 : 0,
    event_match_coverage: ratio(matchedCount, scoreEvents.length),
    pitch_agreement_rate: ratio(pitchOk, matchedCount),
    onset_agreement_rate: ratio(onsetOk, matchedCount),
    duration_agreement_rate: ratio(durationOk, matchedCount),
    ambiguous_match_rate: ratio(ambiguousCount, scoreEvents.length),
    unaligned_rate: alignment.status === 'ALIGNED' ? 0 : 1,
    extra_note_diagnostic_rate: ratio(extraCount, midiEvents.length),
    missing_note_diagnostic_rate: ratio(missingCount, scoreEvents.length),
  })
}

function failClosedResult(code, reason, scoreEvents = [], midiEvents = []) {
  const alignment = Object.freeze({ status: code === MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT ? 'UNSUPPORTED' : 'UNALIGNED', reason, confidence: 0 })
  const diagnostic = createMidiReferenceDiagnostic({
    code,
    details: { scoreEventId: null, midiEventId: null, pitchDeltaSemitones: null, onsetDeltaBeats: null, durationDeltaBeats: null, trackIndex: null, instrumentName: null, ambiguityReason: reason },
  })
  return Object.freeze({
    alignment,
    scoreEvents: Object.freeze(scoreEvents),
    midiEvents: Object.freeze(midiEvents),
    matches: Object.freeze([]),
    diagnostics: Object.freeze([diagnostic]),
    metrics: Object.freeze({
      alignment_success_rate: 0, event_match_coverage: 0, pitch_agreement_rate: 0, onset_agreement_rate: 0, duration_agreement_rate: 0,
      ambiguous_match_rate: 0, unaligned_rate: 1, extra_note_diagnostic_rate: 0, missing_note_diagnostic_rate: 0,
    }),
  })
}

export function analyzeMidiScoreAlignment(scoreGraph, midiReference, alignmentContext = {}, optionOverrides = {}) {
  const options = Object.freeze({ ...DEFAULT_MIDI_ALIGNMENT_OPTIONS, ...optionOverrides })
  const pitchDomainFailure = validatePitchDomain(alignmentContext)
  if (pitchDomainFailure) return failClosedResult(MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT, pitchDomainFailure)
  const scoreView = extractScoreReferenceEvents(scoreGraph)
  if (!scoreView.ok) return failClosedResult(MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT, scoreView.reason)
  const midiView = filterMidiEvents(midiReference, alignmentContext)
  if (!midiView.ok) return failClosedResult(MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT, midiView.reason, scoreView.events)
  const scoreEvents = scoreView.events
  const midiEvents = Object.freeze([...midiView.events])
  if (!scoreEvents.length) return failClosedResult(MIDI_COMPARISON_CODE.UNSUPPORTED_CONTEXT, 'NO_COMPARABLE_SCORE_EVENTS', scoreEvents, midiEvents)

  const alignment = estimateMidiScoreAlignment(scoreEvents, midiEvents, alignmentContext, options)
  if (alignment.status !== 'ALIGNED') return failClosedResult(MIDI_COMPARISON_CODE.UNALIGNED, alignment.reason, scoreEvents, midiEvents)

  const candidatesByScore = new Map(scoreEvents.map((score) => [score.eventId, []]))
  let edgeCount = 0
  for (const score of scoreEvents) {
    for (const midi of midiEvents) {
      if (!partTrackCompatible(score, midi, alignmentContext)) continue
      const alignedMidiBeat = alignment.scale * midi.startBeats + alignment.offsetBeats
      const onsetDistance = Math.abs(alignedMidiBeat - score.globalOnsetBeats)
      if (onsetDistance > options.onsetWindowBeats) continue
      edgeCount += 1
      if (edgeCount > options.maxCandidateEdges) return failClosedResult(MIDI_COMPARISON_CODE.UNALIGNED, 'MATCH_EDGE_LIMIT_EXCEEDED', scoreEvents, midiEvents)
      candidatesByScore.get(score.eventId).push({ score, midi, alignedMidiBeat, cost: edgeCost(score, midi, alignedMidiBeat, options) })
    }
  }

  const ambiguousScoreIds = new Set()
  const reservedAmbiguousMidiIds = new Set()
  for (const score of scoreEvents) {
    const candidates = candidatesByScore.get(score.eventId).sort((a, b) => a.cost - b.cost || a.midi.eventId.localeCompare(b.midi.eventId))
    if (candidates.length >= 2 && Math.abs(candidates[1].cost - candidates[0].cost) <= options.ambiguityMargin) {
      ambiguousScoreIds.add(score.eventId)
      reservedAmbiguousMidiIds.add(candidates[0].midi.eventId)
      reservedAmbiguousMidiIds.add(candidates[1].midi.eventId)
    }
  }

  const edges = []
  for (const score of scoreEvents) {
    if (ambiguousScoreIds.has(score.eventId)) continue
    for (const edge of candidatesByScore.get(score.eventId)) edges.push(edge)
  }
  edges.sort((a, b) => a.cost - b.cost || a.score.eventId.localeCompare(b.score.eventId) || a.midi.eventId.localeCompare(b.midi.eventId))

  const usedScore = new Set()
  const usedMidi = new Set()
  const matched = []
  for (const edge of edges) {
    if (usedScore.has(edge.score.eventId) || usedMidi.has(edge.midi.eventId) || reservedAmbiguousMidiIds.has(edge.midi.eventId)) continue
    usedScore.add(edge.score.eventId)
    usedMidi.add(edge.midi.eventId)
    matched.push(Object.freeze({ score: edge.score, midi: edge.midi, cost: round(edge.cost) }))
  }

  const inferred = !alignment.method.startsWith('host_')
  const inferredCoverage = matched.length / Math.max(1, Math.min(scoreEvents.length, midiEvents.length))
  if (inferred && inferredCoverage < options.minimumInferredCoverage) {
    return failClosedResult(MIDI_COMPARISON_CODE.UNALIGNED, 'INFERRED_ALIGNMENT_COVERAGE_TOO_LOW', scoreEvents, midiEvents)
  }

  const diagnostics = []
  for (const score of scoreEvents) {
    if (ambiguousScoreIds.has(score.eventId)) {
      const candidates = candidatesByScore.get(score.eventId).slice(0, 2)
      diagnostics.push(createMidiReferenceDiagnostic({
        code: MIDI_COMPARISON_CODE.AMBIGUOUS_MATCH,
        location: locationFor(score),
        details: {
          scoreEventId: score.eventId,
          midiEventId: null,
          candidateMidiEventIds: Object.freeze(candidates.map((candidate) => candidate.midi.eventId)),
          pitchDeltaSemitones: null,
          onsetDeltaBeats: null,
          durationDeltaBeats: null,
          trackIndex: null,
          instrumentName: null,
          ambiguityReason: 'NEAR_TIED_MATCH_COST',
        },
      }))
      continue
    }
    const pair = matched.find((item) => item.score.eventId === score.eventId)
    if (pair) diagnostics.push(...matchedDiagnostics(pair.score, pair.midi, alignment, options))
    else diagnostics.push(createMidiReferenceDiagnostic({
      code: MIDI_COMPARISON_CODE.SCORE_NOTE_MISSING,
      location: locationFor(score),
      details: { scoreEventId: score.eventId, midiEventId: null, pitchDeltaSemitones: null, onsetDeltaBeats: null, durationDeltaBeats: null, trackIndex: null, instrumentName: null, ambiguityReason: null },
    }))
  }
  for (const midi of midiEvents) {
    if (usedMidi.has(midi.eventId) || reservedAmbiguousMidiIds.has(midi.eventId)) continue
    diagnostics.push(createMidiReferenceDiagnostic({
      code: MIDI_COMPARISON_CODE.EXTRA_NOTE,
      details: {
        scoreEventId: null, midiEventId: midi.eventId, pitchDeltaSemitones: null, onsetDeltaBeats: null, durationDeltaBeats: null,
        trackIndex: midi.trackIndex, instrumentName: midi.instrumentName ?? null, midiPitch: midi.midiPitch, ambiguityReason: null,
      },
    }))
  }

  const missingCount = scoreEvents.filter((score) => !usedScore.has(score.eventId) && !ambiguousScoreIds.has(score.eventId)).length
  const extraCount = midiEvents.filter((midi) => !usedMidi.has(midi.eventId) && !reservedAmbiguousMidiIds.has(midi.eventId)).length
  const metrics = metricsFor({ scoreEvents, midiEvents, matched, ambiguousCount: ambiguousScoreIds.size, missingCount, extraCount, alignment, options })
  return Object.freeze({ alignment, scoreEvents, midiEvents, matches: Object.freeze(matched), diagnostics: Object.freeze(diagnostics), metrics })
}
