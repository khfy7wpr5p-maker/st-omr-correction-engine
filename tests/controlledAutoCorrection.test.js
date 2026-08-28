import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CONTROLLED_CORRECTION_DECISION,
  CORRECTION_STATUS,
  E11A_CONTROLLED_POLICY,
  PATCH_OPERATION,
  TEACHER_APPROVED_GUARD_CASES,
  TEACHER_APPROVED_HIGH_EVIDENCE_CASES,
  applyControlledVoiceCorrection,
  createCorrectionPatch,
  createCorrectionResult,
  createMeasure,
  createScoreGraph,
  generateVoiceCandidates,
  resolveCandidates,
} from '../src/index.js'

function solveVoiceMutation(input) {
  const generated = generateVoiceCandidates({
    events: input.events,
    ambiguousEventIds: input.ambiguousEventIds,
    instrumentProfile: input.instrumentProfile,
    validatorFindings: input.validatorFindings,
  })
  return resolveCandidates(generated.candidates)
}

function graphFor(input) {
  const measureKeys = [...new Set(input.events.map((event) => event.measureKey))]
  const measures = measureKeys.map((key) => createMeasure({ key, beats: 4, beatType: 4 }))
  return createScoreGraph({ sourceId: input.sourceId, measures, events: input.events })
}

function expectedPatchFor(gold) {
  return gold.expectedPatches[0]
}

test('E11A policy preserves the 0.90 threshold and one-patch voice-only boundary', () => {
  assert.equal(E11A_CONTROLLED_POLICY.minConfidence, 0.9)
  assert.equal(E11A_CONTROLLED_POLICY.minIndependentEvidenceSources, 2)
  assert.equal(E11A_CONTROLLED_POLICY.maxPatches, 1)
  assert.deepEqual(E11A_CONTROLLED_POLICY.allowedOperations, [PATCH_OPERATION.CHANGE_VOICE])
})

test('all 16 high-evidence teacher-approved cases apply only after ACCEPT revalidation', async () => {
  assert.equal(TEACHER_APPROVED_HIGH_EVIDENCE_CASES.length, 16)

  for (const gold of TEACHER_APPROVED_HIGH_EVIDENCE_CASES) {
    const source = graphFor(gold.input)
    const resolved = solveVoiceMutation(gold.input)
    const expected = expectedPatchFor(gold)
    const sourceEvent = source.events.find((event) => event.id === expected.eventId)
    const beforeVoice = sourceEvent.voice

    const outcome = await applyControlledVoiceCorrection({
      scoreGraph: source,
      correctionResult: resolved,
      revalidate: ({ projectedGraph }) => {
        const projectedEvent = projectedGraph.events.find((event) => event.id === expected.eventId)
        return {
          decision: projectedEvent?.voice === expected.after
            ? CONTROLLED_CORRECTION_DECISION.ACCEPT
            : CONTROLLED_CORRECTION_DECISION.BLOCK,
          findings: [],
        }
      },
    })

    assert.equal(resolved.status, CORRECTION_STATUS.RESOLVED)
    assert.equal(outcome.decision, CONTROLLED_CORRECTION_DECISION.ACCEPT)
    assert.equal(outcome.applied, true)
    assert.equal(outcome.code, 'E11A_ACCEPTED')
    assert.notEqual(outcome.graph, source)
    assert.equal(source.events.find((event) => event.id === expected.eventId).voice, beforeVoice)
    assert.equal(outcome.graph.events.find((event) => event.id === expected.eventId).voice, expected.after)
  }
})

test('all 16 partial-evidence guard cases remain unapplied and never call revalidation', async () => {
  assert.equal(TEACHER_APPROVED_GUARD_CASES.length, 16)

  for (const gold of TEACHER_APPROVED_GUARD_CASES) {
    const source = graphFor(gold.input)
    const resolved = solveVoiceMutation(gold.input)
    let revalidationCalled = false

    const outcome = await applyControlledVoiceCorrection({
      scoreGraph: source,
      correctionResult: resolved,
      revalidate: () => {
        revalidationCalled = true
        return { decision: CONTROLLED_CORRECTION_DECISION.ACCEPT }
      },
    })

    assert.equal(resolved.status, CORRECTION_STATUS.AMBIGUOUS)
    assert.equal(outcome.decision, CONTROLLED_CORRECTION_DECISION.REVIEW)
    assert.equal(outcome.applied, false)
    assert.equal(outcome.graph, source)
    assert.equal(revalidationCalled, false)
  }
})

test('E11A rejects non-voice operations before revalidation', async () => {
  const gold = TEACHER_APPROVED_HIGH_EVIDENCE_CASES[0]
  const source = graphFor(gold.input)
  const resolved = solveVoiceMutation(gold.input)
  const voicePatch = resolved.proposedPatches[0]
  const target = source.events.find((event) => event.id === voicePatch.eventId)
  const durationPatch = createCorrectionPatch({
    eventId: voicePatch.eventId,
    measureKey: voicePatch.measureKey,
    operation: PATCH_OPERATION.CHANGE_DURATION,
    before: target.duration,
    after: target.duration + 1,
    evidence: voicePatch.evidence,
    confidence: voicePatch.confidence,
    solverVersion: 'e11a-negative-test',
  })
  const result = createCorrectionResult({
    status: CORRECTION_STATUS.RESOLVED,
    proposedPatches: [durationPatch],
    confidence: resolved.confidence,
    evidence: resolved.evidence,
  })
  let revalidationCalled = false

  const outcome = await applyControlledVoiceCorrection({
    scoreGraph: source,
    correctionResult: result,
    revalidate: () => {
      revalidationCalled = true
      return { decision: CONTROLLED_CORRECTION_DECISION.ACCEPT }
    },
  })

  assert.equal(outcome.decision, CONTROLLED_CORRECTION_DECISION.REVIEW)
  assert.equal(outcome.code, 'E11A_OPERATION_NOT_ALLOWED')
  assert.equal(outcome.graph, source)
  assert.equal(revalidationCalled, false)
})

test('eligible correction is BLOCKED when mandatory revalidation is absent', async () => {
  const gold = TEACHER_APPROVED_HIGH_EVIDENCE_CASES[0]
  const source = graphFor(gold.input)
  const resolved = solveVoiceMutation(gold.input)

  const outcome = await applyControlledVoiceCorrection({ scoreGraph: source, correctionResult: resolved })

  assert.equal(outcome.decision, CONTROLLED_CORRECTION_DECISION.BLOCK)
  assert.equal(outcome.code, 'REVALIDATION_REQUIRED')
  assert.equal(outcome.applied, false)
  assert.equal(outcome.graph, source)
})

test('REVIEW or BLOCK revalidation retains the exact source graph', async () => {
  const gold = TEACHER_APPROVED_HIGH_EVIDENCE_CASES[0]
  const source = graphFor(gold.input)
  const resolved = solveVoiceMutation(gold.input)

  for (const decision of [CONTROLLED_CORRECTION_DECISION.REVIEW, CONTROLLED_CORRECTION_DECISION.BLOCK]) {
    const outcome = await applyControlledVoiceCorrection({
      scoreGraph: source,
      correctionResult: resolved,
      revalidate: () => ({ decision, reason: 'host-quality-gate' }),
    })
    assert.equal(outcome.decision, decision)
    assert.equal(outcome.applied, false)
    assert.equal(outcome.graph, source)
  }
})

test('revalidation errors fail closed to BLOCK and retain source identity', async () => {
  const gold = TEACHER_APPROVED_HIGH_EVIDENCE_CASES[0]
  const source = graphFor(gold.input)
  const resolved = solveVoiceMutation(gold.input)

  const outcome = await applyControlledVoiceCorrection({
    scoreGraph: source,
    correctionResult: resolved,
    revalidate: () => {
      throw new Error('validator unavailable')
    },
  })

  assert.equal(outcome.decision, CONTROLLED_CORRECTION_DECISION.BLOCK)
  assert.equal(outcome.code, 'REVALIDATION_ERROR')
  assert.equal(outcome.applied, false)
  assert.equal(outcome.graph, source)
})
