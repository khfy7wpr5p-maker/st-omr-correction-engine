export const MIDI_CORPUS_REQUIRED_SCENARIOS = Object.freeze([
  'PICKUP_OFFSET',
  'AFFINE_TEMPO_DRIFT',
  'POLYPHONY',
  'REPEATED_PITCH',
  'PART_TRACK_MAPPING',
  'AMBIGUITY',
  'MISSING_NOTE',
  'EXTRA_NOTE',
  'WRONG_PIECE_NEGATIVE_CONTROL',
])

export function evaluateMidiCorpusCoverage(cases) {
  if (!Array.isArray(cases)) throw new TypeError('cases must be an array.')
  const covered = new Set()
  for (const item of cases) {
    if (!item || typeof item !== 'object') throw new TypeError('Invalid corpus case.')
    if (!Array.isArray(item.scenarios)) throw new TypeError('Corpus case scenarios must be an array.')
    for (const scenario of item.scenarios) {
      if (MIDI_CORPUS_REQUIRED_SCENARIOS.includes(scenario)) covered.add(scenario)
    }
  }
  const missing = MIDI_CORPUS_REQUIRED_SCENARIOS.filter((scenario) => !covered.has(scenario))
  return Object.freeze({
    totalCases: cases.length,
    requiredScenarioCount: MIDI_CORPUS_REQUIRED_SCENARIOS.length,
    coveredScenarioCount: covered.size,
    coverage: MIDI_CORPUS_REQUIRED_SCENARIOS.length ? covered.size / MIDI_CORPUS_REQUIRED_SCENARIOS.length : 1,
    missing: Object.freeze(missing),
    gatePassed: missing.length === 0,
  })
}
