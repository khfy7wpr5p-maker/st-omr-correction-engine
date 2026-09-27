import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { analyzeSemanticConsistency } from '../adapters/semantic/semanticConsistencyBridge.js'

const fixtureDir = new URL('./fixtures/sem-05-semantic-consistency/', import.meta.url)
const semanticDir = new URL('../adapters/semantic/', import.meta.url)
const json = async (name) => JSON.parse(await readFile(new URL(name, fixtureDir), 'utf8'))

function graph() {
  const measures = [
    createMeasure({ key: 'm1', beats: 4, beatType: 4 }),
    createMeasure({ key: 'm2', beats: 4, beatType: 4 }),
  ]
  const rows = [
    ['n1','m1',0,2,60,1,1,{}],
    ['n2','m1',2,2,62,1,1,{ tieStart: true }],
    ['n3','m1',0,4,55,2,1,{}],
    ['n4','m2',0,1,62,1,1,{ tieStop: true }],
    ['n5','m2',1,3,64,1,1,{}],
    ['n6','m2',0,4,57,2,1,{}],
  ]
  const events = rows.map(([id,measureKey,onset,duration,pitch,voice,staff,metadata]) =>
    createScoreEvent({ id, measureKey, onset, duration, pitch, voice, staff, metadata })
  )
  return createScoreGraph({ sourceId: 'sem05-baseline', measures, events })
}

async function inputs(scoreGraph = graph()) {
  const provenance = await json('provenance.json')
  return {
    scoreGraph,
    provenance,
    semanticSnapshot: await json('semantic-baseline.semantic-snapshot.json'),
    observedSourceSha256: provenance.sourceSha256,
    observedSourceId: provenance.sourceId,
  }
}

test('SEM-05 bridge returns a frozen shadow-only non-authoritative packet', async () => {
  const input = await inputs()
  const before = JSON.stringify(input.scoreGraph)
  const first = analyzeSemanticConsistency(input)
  const second = analyzeSemanticConsistency(input)

  assert.equal(first.status, 'PASS')
  assert.equal(first.mode, 'SHADOW_ONLY')
  assert.equal(first.authority, 'SEMANTIC_CONSISTENCY_ONLY')
  assert.equal(first.effectiveWeight, 0)
  assert.equal(first.resolverEligible, false)
  assert.equal(first.candidateEvidenceEligible, false)
  assert.equal(first.automaticCorrectionAuthority, false)
  assert.equal(first.teacherGoldAuthority, false)
  assert.equal(first.readinessPromotionAuthority, false)
  assert.equal(first.sourceGraph, input.scoreGraph)
  assert.equal(JSON.stringify(input.scoreGraph), before)
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.invariants), true)
  assert.deepEqual(first.invariants, {
    scoreUnchanged: true,
    sourceMutation: false,
    correctionPatchesProduced: false,
    automaticCorrectionAuthority: false,
    resolverEligible: false,
  })
  for (const forbidden of ['patches','apply','accept','correctedScore','musicXml','evidence']) {
    assert.equal(forbidden in first, false)
  }
  assert.equal(JSON.stringify(first), JSON.stringify(second))
})

test('SEM-05 semantic adapter source has no resolver/evidence/apply authority imports', async () => {
  const names = (await readdir(semanticDir)).filter((name) => name.endsWith('.js'))
  const source = (await Promise.all(names.map((name) => readFile(new URL(name, semanticDir), 'utf8')))).join('\n')

  for (const forbidden of [
    'createEvidence',
    'EVIDENCE_SOURCE',
    '/src/resolver/',
    '/src/candidates/',
    'patchProjection',
    'patchReverter',
    'productionReadiness',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden)
  }

  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.deepEqual(pkg.dependencies, { '@tonejs/midi': '2.0.28' })
})
