import { loadMidiReference, analyzeMidiScoreAlignmentConservatively } from '../adapters/midi/index.js'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'

const midiPath = process.argv[2]
if (!midiPath) throw new Error('Usage: node scripts/runLagrimaMidiReferenceBenchmark.mjs <midi-path>')

const measures = Array.from({ length: 4 }, (_, index) => createMeasure({ key: `m${index + 1}`, beats: 3, beatType: 4 }))
const events = []
let serial = 0
function add(measure, onset, duration, pitch, voice) {
  events.push(createScoreEvent({ id: `lagrima-m${measure}-e${++serial}`, measureKey: `m${measure}`, onset, duration, pitch, voice, staff: 1 }))
}
function seq(measure, voice, values) {
  for (const [onset, duration, pitch] of values) add(measure, onset, duration, pitch, voice)
}

// Pinned yawnoc/guitar Lágrima opening, measures 1-4.
// Pitches are sounding guitar MIDI pitch values.
const high = [
  [[0,1,68],[1,1,69],[2,1,71]],
  [[0,3,66]],
  [[0,1,68],[1,1,69],[2,1,71]],
  [[0,3,66]],
]
const low = [
  [[0,1,52],[1,1,54],[2,1,56]],
  [[0,3,51]],
  [[0,1,52],[1,1,54],[2,1,56]],
  [[0,3,51]],
]
const middle = [
  [52,59,54,59,56,59],
  [51,59,57,59,47,59],
  [52,59,54,59,56,59],
  [51,59,57,59,47,59],
]
for (let i = 0; i < 4; i += 1) {
  seq(i + 1, 1, high[i])
  seq(i + 1, 2, low[i])
  seq(i + 1, 3, middle[i].map((pitch, index) => [index * 0.5, 0.5, pitch]))
}

const scoreGraph = createScoreGraph({ sourceId: 'pinned-yawnoc-lagrima-m1-4', measures, events })
const midi = loadMidiReference(midiPath, { sourceId: 'musiclab-tarrega-lagrima-midi', sourceType: 'TRUSTED_REFERENCE' })
if (!midi.ok) throw new Error(JSON.stringify(midi))
const openingMidi = Object.freeze({ ...midi, events: Object.freeze(midi.events.filter((event) => event.startBeats < 12)) })
const result = analyzeMidiScoreAlignmentConservatively(scoreGraph, openingMidi, { pitchDomain: 'MIDI', trackSelection: [1], knownGlobalBeatOffset: 0 })
const counts = {}
for (const diagnostic of result.diagnostics ?? []) counts[diagnostic.code] = (counts[diagnostic.code] ?? 0) + 1
console.log(JSON.stringify({
  schema: 'st_omr_lagrima_midi_reference_benchmark_v1',
  scoreEvents: scoreGraph.events.length,
  midiEvents: openingMidi.events.length,
  midiSha256: midi.sha256,
  alignment: result.alignment,
  diagnosticCounts: counts,
  metrics: result.metrics,
  diagnostics: (result.diagnostics ?? []).map((item) => ({ code: item.code, scoreEventId: item.details?.scoreEventId ?? item.location?.eventId ?? null, midiEventId: item.details?.midiEventId ?? null, ambiguityReason: item.details?.ambiguityReason ?? null })),
  authority: 'EVALUATION_ONLY',
  automaticCorrectionAuthority: false,
}, null, 2))
