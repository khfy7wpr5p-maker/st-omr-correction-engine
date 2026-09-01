const REQUIRED_METRICS = Object.freeze([
  'alignment_success_rate',
  'event_match_coverage',
  'pitch_agreement_rate',
  'onset_agreement_rate',
  'duration_agreement_rate',
  'ambiguous_match_rate',
  'unaligned_rate',
  'extra_note_diagnostic_rate',
  'missing_note_diagnostic_rate',
])

function finiteRate(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be a finite rate in [0,1].`)
  return value
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer.`)
  return value
}

function normalizeCase(entry, index) {
  if (!entry || typeof entry !== 'object') throw new TypeError(`case ${index} is required.`)
  if (typeof entry.id !== 'string' || !entry.id.trim()) throw new TypeError(`case ${index}.id is required.`)
  const benchmark = entry.benchmark
  if (!benchmark || typeof benchmark !== 'object') throw new TypeError(`${entry.id}.benchmark is required.`)
  if (benchmark.authority !== 'EVALUATION_ONLY') throw new TypeError(`${entry.id} must remain EVALUATION_ONLY.`)
  if (benchmark.automaticCorrectionAuthority !== false) throw new TypeError(`${entry.id} must not have automatic correction authority.`)
  const scoreEvents = positiveInteger(benchmark.scoreEvents, `${entry.id}.scoreEvents`)
  const midiEvents = positiveInteger(benchmark.midiEvents, `${entry.id}.midiEvents`)
  const metrics = {}
  for (const name of REQUIRED_METRICS) metrics[name] = finiteRate(benchmark.metrics?.[name], `${entry.id}.${name}`)
  const diagnosticCounts = {}
  for (const [code, rawCount] of Object.entries(benchmark.diagnosticCounts ?? {})) {
    diagnosticCounts[code] = positiveInteger(rawCount, `${entry.id}.${code}`)
  }
  return Object.freeze({
    id: entry.id,
    instrumentProfile: entry.instrumentProfile ?? null,
    relationship: entry.relationship ?? null,
    independenceVerified: entry.independenceVerified === true,
    teacherVerified: entry.teacherVerified === true,
    scoreEvents,
    midiEvents,
    metrics: Object.freeze(metrics),
    diagnosticCounts: Object.freeze(diagnosticCounts),
  })
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function aggregateRealMidiCorpusMeasurements(cases) {
  if (!Array.isArray(cases) || cases.length === 0) throw new TypeError('At least one real MIDI benchmark case is required.')
  const normalized = cases.map(normalizeCase)
  const ids = new Set()
  for (const item of normalized) {
    if (ids.has(item.id)) throw new TypeError(`Duplicate real MIDI benchmark id: ${item.id}`)
    ids.add(item.id)
  }

  const diagnostics = {}
  for (const item of normalized) {
    for (const [code, count] of Object.entries(item.diagnosticCounts)) diagnostics[code] = (diagnostics[code] ?? 0) + count
  }

  const macroMetrics = {}
  const metricRanges = {}
  for (const name of REQUIRED_METRICS) {
    const values = normalized.map((item) => item.metrics[name])
    macroMetrics[name] = mean(values)
    metricRanges[name] = Object.freeze({ min: Math.min(...values), max: Math.max(...values) })
  }

  return Object.freeze({
    schema: 'st_omr_real_midi_corpus_aggregate_v1',
    workCount: normalized.length,
    scoreEvents: normalized.reduce((sum, item) => sum + item.scoreEvents, 0),
    midiEvents: normalized.reduce((sum, item) => sum + item.midiEvents, 0),
    diagnosticCounts: Object.freeze(diagnostics),
    macroMetrics: Object.freeze(macroMetrics),
    metricRanges: Object.freeze(metricRanges),
    works: Object.freeze(normalized),
    interpretation: Object.freeze({
      descriptiveOnly: true,
      precisionRecallAvailable: false,
      calibrationAvailable: false,
      measuredReliabilityEligible: false,
      automaticCorrectionAuthority: false,
      reason: 'The current real corpus mixes reference-only and same-upstream representation comparisons without complete independent teacher-gold diagnostic labels.',
    }),
  })
}
