import { generateVoiceCandidates } from '../../src/solver/polyphonicVoiceSolver.js'
import { resolveCandidates } from '../../src/resolver/candidateResolver.js'
import { analyzeOmrCorrections } from '../../src/correction/omrCorrectionAnalyzer.js'

/**
 * Pure shadow adapter contract for SesliTab-shaped host evidence.
 * It does not invoke Audiveris, network, MusicXML serialization, patch apply,
 * TTS, playback, TAB or any host runtime.
 */
export function analyzeSesliTabShadow({ scoreGraph, validatorFindings = [], ambiguousEventIds = [], instrumentProfile = 'generic', resolverOptions = {} }) {
  if (!scoreGraph || !Array.isArray(scoreGraph.events)) throw new TypeError('scoreGraph with events is required.')

  const generated = generateVoiceCandidates({
    events: scoreGraph.events,
    ambiguousEventIds,
    instrumentProfile,
    validatorFindings,
  })

  if (generated.exhausted) {
    return Object.freeze({ mode: 'shadow', generated, resolution: Object.freeze({ status: 'AMBIGUOUS', abstainReason: generated.reason }), sourceGraph: scoreGraph })
  }

  const resolution = resolveCandidates(generated.candidates, resolverOptions)
  return Object.freeze({ mode: 'shadow', generated, resolution, sourceGraph: scoreGraph })
}

/**
 * Expanded SesliTab shadow entrypoint. In addition to the legacy voice-only
 * analysis, this returns bounded pitch/duration/onset/staff/tie proposals and
 * research findings for tuplets/cross-staff. It never applies a patch.
 */
export function analyzeSesliTabCorrectionShadow({
  scoreGraph,
  validatorFindings = [],
  ambiguousEventIds = null,
  instrumentProfile = 'generic',
  expectedPitches = null,
  expectedStaffs = null,
  tolerance = 0.01,
  structuralSuggestionConfidence = 0,
  resolverOptions = {},
} = {}) {
  return analyzeOmrCorrections({
    scoreGraph,
    validatorFindings,
    ambiguousVoiceEventIds: ambiguousEventIds,
    instrumentProfile,
    expectedPitches,
    expectedStaffs,
    tolerance,
    structuralSuggestionConfidence,
    resolverOptions,
  })
}
