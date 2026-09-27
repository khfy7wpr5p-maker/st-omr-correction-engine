import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  CORRECTION_STATUS,
  EVIDENCE_SOURCE,
  createCandidate,
  createEvidence,
  createMeasure,
  createScoreEvent,
  createScoreGraph,
  resolveCandidates,
} from '../src/index.js'
import { analyzeSemanticConsistency } from '../adapters/semantic/semanticConsistencyBridge.js'

const fixtureDir = new URL('./fixtures/sem-05-semantic-consistency/', import.meta.url)
const json = async (name) => JSON.parse(await readFile(new URL(name, fixtureDir), 'utf8'))

function graph() {
  const measures = [
    createMeasure({ key: 'm1', beats: 4, beatType: 4 }),
    createMeasure({ key: 'm2', beats: 4, beatType: 4 }),
  ]
  const rows = [
    ['n1','m1',0,2,60,1,1,{}], ['n2','m1',2,2,62,1,1,{ tieStart: true }],
    ['n3','m1',0,4,55,2,1,{}], ['n4','m2',0,1,62,1,1,{ tieStop: true }],
    ['n5','m2',1,3,64,1,1,{}], ['n6','m2',0,4,57,2,1,{}],
  ]
  return createScoreGraph({
    sourceId: 'sem05-baseline',
    measures,
    events: rows.map(([id,measureKey,onset,duration,pitch,voice,staff,metadata]) =>
      createScoreEvent({ id, measureKey, onset, duration, pitch, voice, staff, metadata })
    ),
  })
}

test('SEM-05 packet cannot turn one-source AMBIGUOUS resolution into RESOLVED', async () => {
  const validator = createEvidence({
    source: EVIDENCE_SOURCE.VALIDATOR,
    code: 'VOICE_OVERLAP',
    weight: 1,
  })
  const candidate = createCandidate({
    id: 'single-source',
    confidence: 0.99,
    evidence: [validator],
  })

  const before = resolveCandidates([candidate])
  assert.equal(before.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.equal(before.abstainReason, 'insufficient-independent-evidence')

  const provenance = await json('provenance.json')
  const packet = analyzeSemanticConsistency({
    scoreGraph: graph(),
    provenance,
    semanticSnapshot: await json('semantic-baseline.semantic-snapshot.json'),
    observedSourceSha256: provenance.sourceSha256,
    observedSourceId: provenance.sourceId,
  })

  assert.equal(packet.resolverEligible, false)
  assert.equal(packet.candidateEvidenceEligible, false)
  assert.deepEqual(candidate.evidence, [validator])

  const after = resolveCandidates([candidate])
  assert.equal(JSON.stringify(after), JSON.stringify(before))
  assert.equal(after.status, CORRECTION_STATUS.AMBIGUOUS)
  assert.deepEqual(EVIDENCE_SOURCE, {
    VALIDATOR: 'validator',
    SYMBOLIC: 'symbolic',
    VISUAL: 'visual',
    TEACHER: 'teacher',
  })
})
