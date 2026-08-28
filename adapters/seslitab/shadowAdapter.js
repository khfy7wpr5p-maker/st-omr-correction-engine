import { generateVoiceCandidates } from '../../src/solver/polyphonicVoiceSolver.js'
import { resolveCandidates } from '../../src/resolver/candidateResolver.js'

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
