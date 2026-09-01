import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure } from '../src/model/measure.js'
import { createScoreEvent } from '../src/model/scoreEvent.js'
import { createScoreGraph } from '../src/model/scoreGraph.js'
import {
  REAL_MIDI_PAIR_CANDIDATES,
  REAL_MIDI_PAIR_STATUS,
  REAL_MIDI_SCOREGRAPH_ORIGIN,
  USER_PROVIDED_REAL_OMR_MANIFESTS,
  evaluateRealMidiPairReadiness,
  getRealMidiPairCandidate,
} from '../src/benchmark/realMidiPairReadiness.js'

test('uploaded Audiveris MusicXML identities are pinned without claiming manual-edit status', () => {
  assert.equal(USER_PROVIDED_REAL_OMR_MANIFESTS.length, 2)
  const sor = USER_PROVIDED_REAL_OMR_MANIFESTS.find((item) => item.id.includes('sor'))
  const bach = USER_PROVIDED_REAL_OMR_MANIFESTS.find((item) => item.id.includes('bach'))
  assert.equal(sor.sourceSha256, '8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b')
  assert.equal(sor.sourceBytes, 70470)
  assert.deepEqual(sor.software, ['Audiveris 5.11.0', 'ProxyMusic 4.0.3'])
  assert.deepEqual(sor.observedStructure, { measureCount: 32, pitchedNoteCount: 175, restCount: 0, voices: [1, 2], staves: [1] })
  assert.equal(sor.manualEditStatus, 'UNKNOWN')
  assert.equal(bach.sourceSha256, '684250fb632299a0df3664623a851ec149cf3952c76956f1d1ad9d4572779fdd')
  assert.equal(bach.sourceBytes, 265350)
  assert.deepEqual(bach.observedStructure, { measureCount: 35, pitchedNoteCount: 577, restCount: 132, voices: [1, 2, 3, 4, 5, 6, 7], staves: [1, 2] })
  assert.equal(bach.manualEditStatus, 'UNKNOWN')
})

test('real MIDI pair candidates fail closed until exact canonical ScoreGraph is materialized', () => {
  for (const candidate of REAL_MIDI_PAIR_CANDIDATES) {
    const report = evaluateRealMidiPairReadiness(candidate)
    assert.equal(report.status, REAL_MIDI_PAIR_STATUS.NEEDS_CANONICAL_SCOREGRAPH)
    assert.equal(report.readyForOracleReview, false)
    assert.equal(report.blockers.includes('CANONICAL_SCOREGRAPH_REQUIRED'), true)
    assert.equal(report.automaticCorrectionAuthority, false)
  }
})

test('controlled mutation cannot masquerade as a real canonical pair', () => {
  const candidate = getRealMidiPairCandidate('mutopia-sor-op35-no13-real-pair')
  const scoreGraph = createScoreGraph({
    sourceId: 'controlled-sor',
    measures: [createMeasure({ key: '1', beats: 2, beatType: 4 })],
    events: [createScoreEvent({ id: 'n1', measureKey: '1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 64 })],
  })
  const report = evaluateRealMidiPairReadiness({
    ...candidate,
    scoreGraph,
    scoreGraphIdentity: {
      origin: REAL_MIDI_SCOREGRAPH_ORIGIN.CONTROLLED_MUTATION,
      sourceId: scoreGraph.sourceId,
      revisionId: 'fixture-1',
      sha256: 'a'.repeat(64),
      provenanceVerified: true,
    },
    benchmarkInput: { scoreGraph },
  })
  assert.equal(report.status, REAL_MIDI_PAIR_STATUS.NEEDS_CANONICAL_SCOREGRAPH)
  assert.equal(report.blockers.includes('CONTROLLED_OR_RECONSTRUCTED_SCOREGRAPH_NOT_REAL_PAIR'), true)
})

test('exact canonical OMR ScoreGraph can become oracle-review ready without gaining authority', () => {
  const candidate = getRealMidiPairCandidate('mutopia-sor-op35-no13-real-pair')
  const sourceId = 'user-omr-sor-op35-no13-2026-09-01'
  const scoreGraph = createScoreGraph({
    sourceId,
    measures: [createMeasure({ key: '1', beats: 2, beatType: 4 })],
    events: [createScoreEvent({ id: 'n1', measureKey: '1', onset: 0, duration: 1, voice: 1, staff: 1, pitch: 76 })],
  })
  const report = evaluateRealMidiPairReadiness({
    ...candidate,
    scoreGraph,
    scoreGraphIdentity: {
      origin: REAL_MIDI_SCOREGRAPH_ORIGIN.OMR_CANONICAL,
      sourceId,
      revisionId: 'audiveris-musicxml-import-v1',
      sha256: 'b'.repeat(64),
      provenanceVerified: true,
    },
    benchmarkInput: { scoreGraph },
  })
  assert.equal(report.status, REAL_MIDI_PAIR_STATUS.READY_FOR_ORACLE_REVIEW)
  assert.equal(report.readyForOracleReview, true)
  assert.deepEqual(report.blockers, [])
  assert.equal(report.automaticCorrectionAuthority, false)
})
