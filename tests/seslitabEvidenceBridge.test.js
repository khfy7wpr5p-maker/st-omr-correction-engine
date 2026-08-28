import test from 'node:test'
import assert from 'node:assert/strict'
import { CORRECTION_STATUS, DEFAULT_RESOLUTION_POLICY } from '../src/index.js'
import { analyzeSesliTabEvidenceShadow } from '../adapters/seslitab/evidenceBridge.js'

function fixture({ withStem = false, malformedBeam = false, duplicateOverlapTarget = false } = {}) {
  const notes = [
    { measureKey: 'P1:0', measureNumber: 1, measureIndex: 0, partId: 'P1', voice: 2, staff: 1, midi: 60, durationValue: 2, isRest: false, isChordNote: false },
    { measureKey: 'P1:0', measureNumber: 1, measureIndex: 0, partId: 'P1', voice: 1, staff: 1, midi: 62, durationValue: 2, isRest: false, isChordNote: false },
    { measureKey: 'P1:0', measureNumber: 1, measureIndex: 0, partId: 'P1', voice: 2, staff: 1, midi: 64, durationValue: 2, isRest: false, isChordNote: false },
    { measureKey: 'P1:0', measureNumber: 1, measureIndex: 0, partId: 'P1', voice: 1, staff: 1, midi: 55, durationValue: 2, isRest: false, isChordNote: false },
  ]

  const overlapStart = duplicateOverlapTarget ? 2 : 1
  const findings = [
    Object.freeze({
      code: 'VOICE_OVERLAP',
      classification: 'suspected_omr_error',
      severity: 'error',
      partId: 'P1',
      measureKey: 'P1:0',
      measureNumber: 1,
      measureIndex: 0,
      voice: 1,
      staff: 1,
      expected: 0.75,
      actual: 0.5,
      message: 'Non-chord timed events overlap inside the same voice and staff.',
    }),
  ]
  if (malformedBeam) {
    findings.push(Object.freeze({
      code: 'UNCLOSED_BEAM_GROUP',
      classification: 'suspected_omr_error',
      severity: 'warning',
      partId: 'P1',
      measureKey: 'P1:0',
      measureNumber: 1,
      measureIndex: 0,
      voice: 2,
      staff: 1,
      expected: 'beam end',
      actual: 'open group',
      message: 'Beam group is not closed.',
    }))
  }

  const structuralResult = {
    ok: true,
    findings,
    measureReport: {
      measures: [{ measureKey: 'P1:0', expectedBeats: 4 }],
    },
    timeline: {
      measures: [{
        measureKey: 'P1:0',
        measureNumber: 1,
        partId: 'P1',
        partIndex: 0,
        measureIndex: 0,
        divisions: 4,
        events: [
          { type: 'attributes', sequenceIndex: 0, startDivisions: 0, durationDivisions: 0, endDivisions: 0 },
          { type: 'note', sequenceIndex: 1, voice: 2, staff: 1, startDivisions: 0, durationDivisions: 2, endDivisions: 2, isGrace: false, isChordNote: false },
          { type: 'note', sequenceIndex: 2, voice: 1, staff: 1, startDivisions: 2, durationDivisions: 2, endDivisions: 4, isGrace: false, isChordNote: false },
          { type: 'note', sequenceIndex: 3, voice: 2, staff: 1, startDivisions: 4, durationDivisions: 2, endDivisions: 6, isGrace: false, isChordNote: false },
          { type: 'backup', sequenceIndex: 4, startDivisions: 6, durationDivisions: 5, endDivisions: 1 },
          { type: 'note', sequenceIndex: 5, voice: 1, staff: 1, startDivisions: overlapStart, durationDivisions: 2, endDivisions: overlapStart + 2, isGrace: false, isChordNote: false },
        ],
      }],
    },
    evidence: {
      ok: true,
      noteEvidence: [
        { measureKey: 'P1:0', partId: 'P1', measureIndex: 0, noteIndex: 0, beam: [{ number: 1, value: 'begin' }] },
        { measureKey: 'P1:0', partId: 'P1', measureIndex: 0, noteIndex: 1, beam: [{ number: 1, value: 'continue' }], ...(withStem ? { stemDirection: 'down' } : {}) },
        { measureKey: 'P1:0', partId: 'P1', measureIndex: 0, noteIndex: 2, beam: malformedBeam ? null : [{ number: 1, value: 'end' }] },
        { measureKey: 'P1:0', partId: 'P1', measureIndex: 0, noteIndex: 3, beam: null },
      ],
    },
  }

  return { notes, structuralResult }
}

function analyze(options = {}) {
  const source = fixture(options)
  return {
    source,
    result: analyzeSesliTabEvidenceShadow({
      sourceRevisionId: 'seslitab-revision-42',
      notes: source.notes,
      structuralResult: source.structuralResult,
      instrumentProfile: 'classical-guitar',
    }),
  }
}

test('bridge creates deterministic exact-revision event ids and immutable reverse mapping', () => {
  const first = analyze()
  const second = analyze()

  assert.deepEqual(first.result.scoreGraph.events.map((event) => event.id), second.result.scoreGraph.events.map((event) => event.id))
  assert.deepEqual(first.result.reverseMap, second.result.reverseMap)
  assert.equal(Object.isFrozen(first.result.reverseMap), true)
  assert.match(first.result.scoreGraph.events[1].id, /^seslitab:seslitab-revision-42:P1%3A0:seq:2$/)
  assert.deepEqual(first.result.reverseMap[first.result.scoreGraph.events[1].id], {
    sourceRevisionId: 'seslitab-revision-42',
    noteIndex: 1,
    noteOrdinal: 1,
    measureKey: 'P1:0',
    sequenceIndex: 2,
    beforeVoice: 1,
  })
})

test('bridge consumes current SesliTab beam evidence but never fabricates missing stem evidence', () => {
  const { result } = analyze()
  const [first, target, third] = result.scoreGraph.events

  assert.ok(target.metadata.beamGroup)
  assert.equal(first.metadata.beamGroup, target.metadata.beamGroup)
  assert.equal(third.metadata.beamGroup, target.metadata.beamGroup)
  assert.equal(target.metadata.stemDirection, null)
  assert.equal(result.analyses.length, 1)
  assert.equal(result.analyses[0].analysis.resolution.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(result.analyses[0].analysis.resolution.confidence, 0.7)
  assert.equal(DEFAULT_RESOLUTION_POLICY.minConfidence, 0.9)
})

test('valid source-provided stem metadata can complete existing high-evidence shadow resolution without changing threshold', () => {
  const { result } = analyze({ withStem: true })
  const resolution = result.analyses[0].analysis.resolution

  assert.equal(result.status, CORRECTION_STATUS.RESOLVED)
  assert.equal(resolution.status, CORRECTION_STATUS.RESOLVED)
  assert.equal(resolution.confidence, 0.9)
  assert.equal(resolution.proposedPatches.length, 1)
  assert.equal(resolution.proposedPatches[0].before, 1)
  assert.equal(resolution.proposedPatches[0].after, 2)
  assert.equal(DEFAULT_RESOLUTION_POLICY.minConfidence, 0.9)

  const validator = resolution.evidence.find((item) => item.source === 'validator')
  assert.equal(validator.location.eventId, result.analyses[0].eventId)
  assert.equal(validator.details.classification, 'suspected_omr_error')
  assert.equal(validator.details.severity, 'error')
})

test('VOICE_OVERLAP finding maps only by exact unique measure voice staff and actual onset', () => {
  const { result } = analyze()
  const reverse = result.analyses[0].reverse

  assert.equal(reverse.noteIndex, 1)
  assert.equal(reverse.sequenceIndex, 2)
  assert.equal(result.analyses[0].validatorFindings[0].location.measureKey, 'P1:0')
  assert.equal(result.analyses[0].validatorFindings[0].location.voice, 1)
  assert.equal(result.analyses[0].validatorFindings[0].validatorWeight, undefined)
  assert.equal(result.analyses[0].validatorFindings[0].weight, 0.7)
})

test('non-unique voice finding fails closed without generating target analyses', () => {
  const { result } = analyze({ duplicateOverlapTarget: true })

  assert.equal(result.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(result.code, 'VOICE_FINDING_NOT_UNIQUELY_MAPPED')
  assert.equal(result.details.matchCount, 2)
  assert.equal(result.analyses.length, 0)
})

test('non-voice findings do not trigger voice candidates', () => {
  const { notes, structuralResult } = fixture()
  structuralResult.findings = [{
    code: 'MEASURE_UNDERFILLED',
    classification: 'suspected_omr_error',
    severity: 'warning',
    measureKey: 'P1:0',
  }]

  const result = analyzeSesliTabEvidenceShadow({
    sourceRevisionId: 'seslitab-revision-42',
    notes,
    structuralResult,
    instrumentProfile: 'classical-guitar',
  })

  assert.equal(result.status, CORRECTION_STATUS.NO_CHANGE)
  assert.equal(result.code, 'NO_VOICE_RELEVANT_FINDINGS')
  assert.equal(result.analyses.length, 0)
  assert.equal(result.ignoredFindings.length, 1)
})

test('malformed beam evidence is suppressed instead of becoming continuity evidence', () => {
  const { result } = analyze({ withStem: true, malformedBeam: true })
  const target = result.scoreGraph.events[1]

  assert.equal(target.metadata.beamGroup, null)
  assert.equal(result.analyses[0].analysis.resolution.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(result.analyses[0].analysis.resolution.confidence, 0.7)
})

test('note/evidence identity mismatch blocks before candidate generation', () => {
  const { notes, structuralResult } = fixture()
  structuralResult.evidence.noteEvidence = structuralResult.evidence.noteEvidence.slice(0, -1)

  const result = analyzeSesliTabEvidenceShadow({
    sourceRevisionId: 'seslitab-revision-42',
    notes,
    structuralResult,
    instrumentProfile: 'classical-guitar',
  })

  assert.equal(result.status, CORRECTION_STATUS.BLOCKED)
  assert.equal(result.code, 'SESLITAB_NOTE_COUNT_MISMATCH')
  assert.equal(result.analyses.length, 0)
})

test('bridge leaves exact SesliTab source objects unchanged and exposes no apply capability', () => {
  const { notes, structuralResult } = fixture({ withStem: true })
  const notesBefore = structuredClone(notes)
  const structuralBefore = structuredClone(structuralResult)

  const result = analyzeSesliTabEvidenceShadow({
    sourceRevisionId: 'seslitab-revision-42',
    notes,
    structuralResult,
    instrumentProfile: 'classical-guitar',
  })

  assert.equal(result.sourceNotes, notes)
  assert.deepEqual(notes, notesBefore)
  assert.deepEqual(structuralResult, structuralBefore)
  assert.equal('apply' in result, false)
  assert.equal('projectedGraph' in result, false)
})
