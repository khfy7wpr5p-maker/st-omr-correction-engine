import { loadMidiReference, analyzeMidiScoreAlignment } from '../adapters/midi/index.js'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'

const midiPath = process.argv[2]
if (!midiPath) throw new Error('Usage: node scripts/runSorMidiReferenceBenchmark.mjs <midi-path>')

const measures = Array.from({ length: 8 }, (_, index) => createMeasure({ key: `m${index + 1}`, beats: 2, beatType: 4 }))
const events = []
let serial = 0
function add(measure, onset, duration, pitch, voice) {
  events.push(createScoreEvent({ id: `sor-m${measure}-e${++serial}`, measureKey: `m${measure}`, onset, duration, pitch, voice, staff: 1 }))
}
function seq(measure, voice, values) {
  for (const [onset, duration, pitch] of values) add(measure, onset, duration, pitch, voice)
}

// Teacher-approved yawnoc/guitar Sor Op.35 No.13, measures 1-8.
// Pitch values are sounding MIDI pitch; the source uses treble_8.
const high = [
  [[0,1,64],[1,1,60]],
  [[0,1,67],[1,0.5,64],[1.5,0.5,60]],
  [[0,1,62],[1,0.5,64],[1.5,0.5,62]],
  [[0,1,62],[1,1,60]],
  [[0,1,64],[1,1,60]],
  [[0,1,67],[1,0.5,64],[1.5,0.5,60]],
  [[0,1,59],[1,0.5,60],[1.5,0.5,64]],
  [[0,2,62]],
]
const low = [
  [[0,2,48]],[[0,2,48]],[[0,2,48]],[[0,2,48]],[[0,2,48]],[[0,2,48]],
  [[0,0.5,50],[0.5,0.5,53],[1,0.5,52],[1.5,0.5,48]],
  [[0,0.5,47],[0.5,0.5,43],[1,0.5,45],[1.5,0.5,47]],
]
const middlePitches = [
  [48,55,52,55,52,55,52,55],
  [48,55,52,55,52,55,52,55],
  [48,55,53,55,53,55,53,55],
  [48,55,52,55,52,55,52,55],
  [48,55,52,55,52,55,52,55],
  [48,55,52,55,52,55,52,55],
  [50,55,53,55,52,55,48,55],
  [47,55,43,55,45,55,47,55],
]
for (let i = 0; i < 8; i += 1) {
  seq(i + 1, 1, high[i])
  seq(i + 1, 2, low[i])
  seq(i + 1, 3, middlePitches[i].map((pitch, index) => [index * 0.25, 0.25, pitch]))
}

const scoreGraph = createScoreGraph({ sourceId: 'teacher-approved-yawnoc-sor-op35-no13-m1-8', measures, events })
const midi = loadMidiReference(midiPath, { sourceId: 'mutopia-sor-op35-no13-midi', sourceType: 'TRUSTED_REFERENCE' })
if (!midi.ok) throw new Error(JSON.stringify(midi))
const firstEightMidi = Object.freeze({ ...midi, events: Object.freeze(midi.events.filter((event) => event.startBeats < 16)) })
const result = analyzeMidiScoreAlignment(scoreGraph, firstEightMidi, { pitchDomain: 'MIDI', trackSelection: [1], knownGlobalBeatOffset: 0 })
const counts = {}
for (const diagnostic of result.diagnostics ?? []) counts[diagnostic.code] = (counts[diagnostic.code] ?? 0) + 1
const summary = {
  schema: 'st_omr_sor_midi_reference_benchmark_v1',
  scoreEvents: scoreGraph.events.length,
  midiEvents: firstEightMidi.events.length,
  midiSha256: midi.sha256,
  alignment: result.alignment,
  diagnosticCounts: counts,
  diagnostics: (result.diagnostics ?? []).map((item) => ({ code: item.code, scoreEventId: item.details?.scoreEventId ?? item.location?.eventId ?? null, midiEventId: item.details?.midiEventId ?? null })),
  authority: 'EVALUATION_ONLY',
  automaticCorrectionAuthority: false,
}
console.log(JSON.stringify(summary, null, 2))
