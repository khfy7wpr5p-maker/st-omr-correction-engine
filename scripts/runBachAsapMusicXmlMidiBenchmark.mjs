import { createScoreGraph, parseBoundedMusicXmlScoreGraph } from '../src/index.js'
import { loadMidiReference, analyzeMidiScoreAlignmentConservatively } from '../adapters/midi/index.js'

const [xmlPath, midiPath] = process.argv.slice(2)
if (!xmlPath || !midiPath) throw new Error('Usage: node scripts/runBachAsapMusicXmlMidiBenchmark.mjs <musicxml> <midi>')

const xml = parseBoundedMusicXmlScoreGraph(xmlPath, { sourceId: 'asap-v1.1-bach-bwv846-musicxml', includeRests: false })
const selectedMeasures = xml.scoreGraph.measures.slice(0, 8)
const selectedKeys = new Set(selectedMeasures.map((measure) => measure.key))
const scoreGraph = createScoreGraph({
  sourceId: xml.scoreGraph.sourceId,
  measures: selectedMeasures,
  events: xml.scoreGraph.events.filter((event) => selectedKeys.has(event.measureKey)),
})

const midi = loadMidiReference(midiPath, { sourceId: 'asap-v1.1-bach-bwv846-score-midi', sourceType: 'TRUSTED_REFERENCE' })
if (!midi.ok) throw new Error(JSON.stringify(midi))
const measureWindowQuarterBeats = selectedMeasures.reduce((sum, measure) => sum + measure.expectedQuarterBeats, 0)
const midiWindow = Object.freeze({ ...midi, events: Object.freeze(midi.events.filter((event) => event.startBeats < measureWindowQuarterBeats)) })
const noteTracks = [...new Set(midiWindow.events.map((event) => event.trackIndex))]
const result = analyzeMidiScoreAlignmentConservatively(scoreGraph, midiWindow, {
  pitchDomain: 'MIDI',
  trackSelection: noteTracks,
  knownGlobalBeatOffset: 0,
})
const diagnosticCounts = {}
for (const diagnostic of result.diagnostics ?? []) diagnosticCounts[diagnostic.code] = (diagnosticCounts[diagnostic.code] ?? 0) + 1

console.log(JSON.stringify({
  schema: 'st_omr_bach_asap_musicxml_midi_benchmark_v1',
  source: {
    dataset: 'ASAP v1.1',
    work: 'J.S. Bach BWV 846 Prelude No.1',
    musicXmlSha256: xml.sha256,
    midiSha256: midi.sha256,
    relationship: 'UPSTREAM_SAME_SCORE_REPRESENTATIONS',
    independenceVerified: false,
    teacherVerification: null,
  },
  window: { measures: selectedMeasures.length, quarterBeats: measureWindowQuarterBeats },
  musicXmlSummary: xml.summary,
  scoreEvents: scoreGraph.events.length,
  midiEvents: midiWindow.events.length,
  noteTracks,
  alignment: result.alignment,
  diagnosticCounts,
  metrics: result.metrics,
  authority: 'EVALUATION_ONLY',
  measuredReliabilityEligible: false,
  automaticCorrectionAuthority: false,
}, null, 2))
