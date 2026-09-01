import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIDI_EVALUATION_ORACLE_TYPE,
  MIDI_REFERENCE_SOURCE_TYPE,
  createMidiEvaluationCase,
  createMidiTeacherGoldReliabilityReport,
  runMidiEvidenceBenchmark,
} from '../src/index.js'
import {
  SCOREMOSAIC_MIDI_INTEGRATION_STATUS,
  createScoreMosaicMidiShadowEvidencePacket,
  evaluateMidiHostReliabilityGate,
} from '../adapters/scoremosaic/index.js'

const scoreGraph = Object.freeze({ sourceId: 'score', events: Object.freeze([]), measures: Object.freeze([]) })

function teacherCase(id, sourceType) {
  return createMidiEvaluationCase({
    id,
    sourceType,
    oracleType: MIDI_EVALUATION_ORACLE_TYPE.TEACHER_VERIFIED,
    input: { id },
    expectedDiagnostics: [],
    verification: { approved: true, verifierId: `teacher-${id}`, reviewedAt: '2026-09-01T00:00:00Z' },
  })
}

async function measuredReliability() {
  const cases = [
    teacherCase('trusted', MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE),
    teacherCase('audio', MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED),
  ]
  const report = await runMidiEvidenceBenchmark(cases, async () => ({
    alignment: { status: 'ALIGNED', confidence: 0.9 },
    diagnostics: [],
  }))
  return createMidiTeacherGoldReliabilityReport({ benchmarkCases: cases, benchmarkReport: report })
}

function midiResult(sourceType = MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE) {
  return Object.freeze({
    mode: 'SHADOW_ONLY',
    authority: 'SHADOW_EVIDENCE_ONLY',
    sourceGraph: scoreGraph,
    midiReference: Object.freeze({ sourceType }),
    diagnostics: Object.freeze([{ code: 'MIDI_PITCH_CONFLICT' }]),
    evidence: Object.freeze([{ source: 'symbolic', code: 'MIDI_PITCH_CONFLICT', weight: 0 }]),
    invariants: Object.freeze({
      scoreUnchanged: true,
      midiBytesUnchanged: true,
      automaticCorrectionAuthority: false,
      correctionPatchesProduced: false,
    }),
  })
}

test('ScoreMosaic MIDI integration is blocked without a measured reliability report', () => {
  const packet = createScoreMosaicMidiShadowEvidencePacket({
    scoreGraph,
    midiEvidenceResult: midiResult(),
    midiReliabilityReport: null,
  })
  assert.equal(packet.midiIntegration.status, SCOREMOSAIC_MIDI_INTEGRATION_STATUS.BLOCKED)
  assert.equal(packet.midiIntegration.reason, 'MIDI_RELIABILITY_REPORT_REQUIRED')
  assert.deepEqual(packet.midiEvidence, [])
  assert.deepEqual(packet.midiDiagnostics, [])
})

test('insufficient teacher-gold reliability keeps downstream MIDI integration blocked', () => {
  const report = {
    schema: 'st_omr_midi_teacher_gold_reliability',
    status: 'INSUFFICIENT_TEACHER_GOLD',
    teacherGoldOnly: true,
    measuredReliabilityAvailable: false,
  }
  const gate = evaluateMidiHostReliabilityGate(report)
  assert.equal(gate.allowed, false)
  assert.equal(gate.reason, 'MIDI_RELIABILITY_NOT_MEASURED')
})

test('measured trusted-vs-audio teacher-gold reliability enables only a separate shadow MIDI channel', async () => {
  const reliability = await measuredReliability()
  const packet = createScoreMosaicMidiShadowEvidencePacket({
    scoreGraph,
    canonicalDisagreements: [{ id: 'scoremosaic-only', errorClass: 'OTHER' }],
    scoreMosaicRef: 'sm:test',
    midiEvidenceResult: midiResult(MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE),
    midiReliabilityReport: reliability,
  })

  assert.equal(packet.midiIntegration.status, SCOREMOSAIC_MIDI_INTEGRATION_STATUS.SHADOW_ENABLED)
  assert.equal(packet.midiIntegration.sourceType, MIDI_REFERENCE_SOURCE_TYPE.TRUSTED_REFERENCE)
  assert.equal(packet.evidence.length, 1)
  assert.equal(packet.evidence[0].id, 'scoremosaic-only')
  assert.equal(packet.midiEvidence.length, 1)
  assert.equal(packet.midiEvidence[0].weight, 0)
  assert.equal(packet.sourceGraph, scoreGraph)
  assert.equal(packet.boundaries.winnerSelection, false)
  assert.equal(packet.midiBoundaries.midiWinnerSelection, false)
  assert.equal(packet.midiBoundaries.midiCorrectionAuthority, false)
  assert.equal(packet.midiBoundaries.midiEvidenceWeightOverride, false)
})

test('measured reliability also permits AUDIO_DERIVED only as weight-zero shadow evidence', async () => {
  const reliability = await measuredReliability()
  const packet = createScoreMosaicMidiShadowEvidencePacket({
    scoreGraph,
    midiEvidenceResult: midiResult(MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED),
    midiReliabilityReport: reliability,
  })
  assert.equal(packet.midiIntegration.status, SCOREMOSAIC_MIDI_INTEGRATION_STATUS.SHADOW_ENABLED)
  assert.equal(packet.midiIntegration.sourceType, MIDI_REFERENCE_SOURCE_TYPE.AUDIO_DERIVED)
  assert.ok(packet.midiEvidence.every((item) => item.weight === 0))
})

test('tampered measured report cannot bypass the authority boundary', async () => {
  const reliability = await measuredReliability()
  const gate = evaluateMidiHostReliabilityGate({ ...reliability, recommendedEvidenceWeight: 0.5 })
  assert.equal(gate.allowed, false)
  assert.equal(gate.reason, 'MIDI_RELIABILITY_AUTHORITY_VIOLATION')
})

test('missing measured source stratum cannot bypass the downstream gate', async () => {
  const reliability = await measuredReliability()
  const altered = {
    ...reliability,
    bySourceType: {
      ...reliability.bySourceType,
      AUDIO_DERIVED: { ...reliability.bySourceType.AUDIO_DERIVED, teacherGoldCases: 0 },
    },
  }
  const gate = evaluateMidiHostReliabilityGate(altered)
  assert.equal(gate.allowed, false)
  assert.equal(gate.reason, 'MIDI_RELIABILITY_REQUIRED_STRATA_MISSING')
})

test('non-shadow or non-zero-weight MIDI evidence is rejected even after reliability is measured', async () => {
  const reliability = await measuredReliability()
  assert.throws(() => createScoreMosaicMidiShadowEvidencePacket({
    scoreGraph,
    midiEvidenceResult: { ...midiResult(), evidence: [{ weight: 0.2 }] },
    midiReliabilityReport: reliability,
  }), /weight-zero/)
  assert.throws(() => createScoreMosaicMidiShadowEvidencePacket({
    scoreGraph,
    midiEvidenceResult: { ...midiResult(), authority: 'CORRECTION' },
    midiReliabilityReport: reliability,
  }), /shadow-only/)
})

test('MIDI host packet requires exact ScoreGraph identity to preserve source provenance', async () => {
  const reliability = await measuredReliability()
  assert.throws(() => createScoreMosaicMidiShadowEvidencePacket({
    scoreGraph,
    midiEvidenceResult: { ...midiResult(), sourceGraph: { ...scoreGraph } },
    midiReliabilityReport: reliability,
  }), /exact ScoreGraph identity/)
})
