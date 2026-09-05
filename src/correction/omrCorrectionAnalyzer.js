import { detectPitchAnomalies } from '../constraints/pitchAnomalyDetector.js'
import { detectDurationAnomalies } from '../constraints/durationConstraint.js'
import { detectOnsetAnomalies } from '../constraints/onsetAnomalyDetector.js'
import { detectStaffAnomalies } from '../constraints/staffAnomalyDetector.js'
import { detectTieAnomalies } from '../constraints/tieConstraint.js'
import { detectTupletAnomalies } from '../constraints/tupletConstraint.js'
import { analyzeCrossStaffContext } from '../solver/crossStaffAnalyzer.js'
import { generateVoiceCandidates } from '../solver/polyphonicVoiceSolver.js'
import { resolveCandidates } from '../resolver/candidateResolver.js'
import { buildStructuralCorrectionSuggestions } from './structuralSuggestionBuilder.js'

function inferredVoiceEventIds(validatorFindings) {
  const ids = new Set()
  for (const finding of validatorFindings) {
    if (finding?.code !== 'VOICE_OVERLAP') continue
    const candidates = [finding.eventId, finding.location?.eventId, finding.details?.eventId, finding.details?.targetEventId]
    for (const value of candidates) if (typeof value === 'string' && value.trim()) ids.add(value)
  }
  return [...ids]
}

function taggedFindings(errorClass, result) {
  return (result?.findings ?? []).map((finding) => Object.freeze({ errorClass, ...finding }))
}

function shadowVoiceSuggestion(candidate) {
  return Object.freeze({
    ...candidate,
    mode: 'SHADOW_ONLY',
    applyEnabled: false,
    automationEligible: false,
    errorClass: 'VOICE',
    operation: candidate.patches?.[0]?.operation ?? null,
    proposedPatches: candidate.patches,
  })
}

export function analyzeOmrCorrections({
  scoreGraph,
  validatorFindings = [],
  ambiguousVoiceEventIds = null,
  instrumentProfile = 'generic',
  expectedPitches = null,
  expectedStaffs = null,
  tolerance = 0.01,
  structuralSuggestionConfidence = 0,
  resolverOptions = {},
} = {}) {
  if (!scoreGraph || !Array.isArray(scoreGraph.measures) || !Array.isArray(scoreGraph.events)) throw new TypeError('scoreGraph with measures and events is required.')
  if (!Array.isArray(validatorFindings)) throw new TypeError('validatorFindings must be an array.')
  if (ambiguousVoiceEventIds != null && !Array.isArray(ambiguousVoiceEventIds)) throw new TypeError('ambiguousVoiceEventIds must be an array or null.')
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be finite and non-negative.')

  const analyses = Object.freeze({
    pitch: detectPitchAnomalies(scoreGraph.events, { expectedPitches }),
    duration: detectDurationAnomalies(scoreGraph.measures, scoreGraph.events, { tolerance }),
    onset: detectOnsetAnomalies(scoreGraph.measures, scoreGraph.events, { tolerance }),
    staff: detectStaffAnomalies(scoreGraph.events, { expectedStaffs }),
    tie: detectTieAnomalies(scoreGraph.events, { tolerance }),
    tuplet: detectTupletAnomalies(scoreGraph.events),
    crossStaff: analyzeCrossStaffContext(scoreGraph.events),
  })

  const structural = buildStructuralCorrectionSuggestions({
    scoreGraph,
    analyses,
    confidence: structuralSuggestionConfidence,
  })

  const voiceIds = ambiguousVoiceEventIds ?? inferredVoiceEventIds(validatorFindings)
  const generatedVoice = generateVoiceCandidates({
    events: scoreGraph.events,
    ambiguousEventIds: voiceIds,
    instrumentProfile,
    validatorFindings,
  })
  const voiceResolution = generatedVoice.exhausted
    ? Object.freeze({ status: 'AMBIGUOUS', abstainReason: generatedVoice.reason })
    : resolveCandidates(generatedVoice.candidates, resolverOptions)
  const voiceSuggestions = generatedVoice.candidates.map(shadowVoiceSuggestion)

  const findings = Object.freeze([
    ...taggedFindings('PITCH', analyses.pitch),
    ...taggedFindings('DURATION', analyses.duration),
    ...taggedFindings('ONSET', analyses.onset),
    ...taggedFindings('STAFF', analyses.staff),
    ...taggedFindings('TIE', analyses.tie),
    ...taggedFindings('TUPLET', analyses.tuplet),
  ])

  return Object.freeze({
    mode: 'SHADOW_ONLY',
    sourceGraph: scoreGraph,
    sourceGraphMutated: false,
    applyEnabled: false,
    analyses,
    findings,
    suggestions: Object.freeze([...structural.suggestions, ...voiceSuggestions]),
    abstentions: structural.abstentions,
    voice: Object.freeze({ generated: generatedVoice, resolution: voiceResolution }),
  })
}
