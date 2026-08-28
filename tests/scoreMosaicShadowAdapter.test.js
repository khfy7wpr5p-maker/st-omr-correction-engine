import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { createScoreMosaicShadowEvidencePacket, SCOREMOSAIC_SHADOW_BOUNDARIES } from '../adapters/scoremosaic/shadowAdapter.js'

function graph() {
  const measure = createMeasure({ key: '1', beats: 4, beatType: 4 })
  return createScoreGraph({ sourceId: 'source', measures: [measure], events: [
    createScoreEvent({ id: 'e1', measureKey: '1', onset: 0, duration: 1, voice: 1, staff: 1 }),
  ] })
}

test('ScoreMosaic bridge is deterministic shadow evidence only', () => {
  const source = graph()
  const packet = createScoreMosaicShadowEvidencePacket({
    scoreGraph: source,
    scoreMosaicRef: '60fcade165cce52097ba38d4e821fabdf589e484',
    canonicalDisagreements: [
      { id: 'b', errorClass: 'VOICE', eventId: 'e1', engineEvidence: [{ engineId: 'B', value: 2 }] },
      { id: 'a', errorClass: 'DURATION', eventId: 'e1', engineEvidence: [{ engineId: 'A', value: 0.5 }] },
    ],
  })
  assert.equal(packet.mode, 'shadow')
  assert.equal(packet.authority, 'evidence-only')
  assert.equal(packet.sourceGraph, source)
  assert.deepEqual(packet.evidence.map((item) => item.id), ['a', 'b'])
  assert.deepEqual(packet.boundaries, SCOREMOSAIC_SHADOW_BOUNDARIES)
  assert.equal('apply' in packet, false)
})

test('ScoreMosaic bridge never invents an unknown taxonomy class', () => {
  const packet = createScoreMosaicShadowEvidencePacket({
    scoreGraph: graph(),
    canonicalDisagreements: [{ id: 'x', errorClass: 'UNKNOWN_ENGINE_CATEGORY' }],
  })
  assert.equal(packet.evidence[0].errorClass, 'OTHER')
})

test('ScoreMosaic bridge rejects duplicate disagreement identity', () => {
  assert.throws(() => createScoreMosaicShadowEvidencePacket({
    scoreGraph: graph(),
    canonicalDisagreements: [{ id: 'x', errorClass: 'VOICE' }, { id: 'x', errorClass: 'VOICE' }],
  }), /unique/)
})
