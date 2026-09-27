import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createMeasure, createScoreEvent, createScoreGraph } from '../src/index.js'
import { validateSemanticConsistencyReference } from '../adapters/semantic/semanticReference.js'
import { compareScoreGraphWithSemanticReference } from '../adapters/semantic/semanticConsistencyComparison.js'

const dir = new URL('./fixtures/sem-05-semantic-consistency/', import.meta.url)
const json = async (name) => JSON.parse(await readFile(new URL(name, dir), 'utf8'))

async function reference(overrides = {}) {
  const provenance = await json('provenance.json')
  const semanticSnapshot = structuredClone(await json('semantic-baseline.semantic-snapshot.json'))
  Object.assign(semanticSnapshot, overrides)
  return validateSemanticConsistencyReference({
    provenance,
    semanticSnapshot,
    observedSourceSha256: provenance.sourceSha256,
    observedSourceId: provenance.sourceId,
  })
}

const baseEvents = () => [
  { id: 'n1', measureKey: 'm1', onset: 0, duration: 2, pitch: 60, voice: 1, staff: 1, metadata: {} },
  { id: 'n2', measureKey: 'm1', onset: 2, duration: 2, pitch: 62, voice: 1, staff: 1, metadata: { tieStart: true } },
  { id: 'n3', measureKey: 'm1', onset: 0, duration: 4, pitch: 55, voice: 2, staff: 1, metadata: {} },
  { id: 'n4', measureKey: 'm2', onset: 0, duration: 1, pitch: 62, voice: 1, staff: 1, metadata: { tieStop: true } },
  { id: 'n5', measureKey: 'm2', onset: 1, duration: 3, pitch: 64, voice: 1, staff: 1, metadata: {} },
  { id: 'n6', measureKey: 'm2', onset: 0, duration: 4, pitch: 57, voice: 2, staff: 1, metadata: {} },
]

function graph({ mutateEvent = null, measures = null, extraEvent = null } = {}) {
  const measureDefs = measures ?? [
    { key: 'm1', beats: 4, beatType: 4 },
    { key: 'm2', beats: 4, beatType: 4 },
  ]
  const events = baseEvents()
  if (mutateEvent) mutateEvent(events)
  if (extraEvent) events.push(extraEvent)
  return createScoreGraph({
    sourceId: 'sem05-baseline',
    measures: measureDefs.map(createMeasure),
    events: events.map((item) => createScoreEvent(item)),
  })
}

const codes = (result) => result.diagnostics.map((item) => item.code)

test('SEM-05 comparator PASSes an independently constructed matching ScoreGraph deterministically', async () => {
  const ref = await reference()
  const first = compareScoreGraphWithSemanticReference({ scoreGraph: graph(), reference: ref })
  const second = compareScoreGraphWithSemanticReference({ scoreGraph: graph(), reference: ref })

  assert.deepEqual(first, { status: 'PASS', diagnostics: [] })
  assert.equal(JSON.stringify(first), JSON.stringify(second))
})

for (const [name, mutate, code] of [
  ['measure count', null, 'SEMANTIC_MEASURE_COUNT_MISMATCH'],
  ['pitch', (events) => { events[0].pitch = 61 }, 'SEMANTIC_PITCH_MISMATCH'],
  ['onset', (events) => { events[0].onset = 1 }, 'SEMANTIC_ONSET_MISMATCH'],
  ['duration', (events) => { events[0].duration = 1 }, 'SEMANTIC_DURATION_MISMATCH'],
  ['voice', (events) => { events[0].voice = 3 }, 'SEMANTIC_VOICE_MISMATCH'],
  ['staff', (events) => { events[0].staff = 2 }, 'SEMANTIC_STAFF_MISMATCH'],
  ['tie role', (events) => { events[1].metadata = {} }, 'SEMANTIC_TIE_ROLE_MISMATCH'],
]) {
  test(`SEM-05 comparator reports ${name} mismatch`, async () => {
    const ref = await reference()
    const scoreGraph = name === 'measure count'
      ? graph({ measures: [{ key: 'm1', beats: 4, beatType: 4 }] , mutateEvent: (events) => events.splice(3) })
      : graph({ mutateEvent: mutate })
    const result = compareScoreGraphWithSemanticReference({ scoreGraph, reference: ref })
    assert.equal(result.status, 'MISMATCH')
    assert.equal(codes(result).includes(code), true)
  })
}

test('SEM-05 comparator reports note-count mismatch', async () => {
  const ref = await reference()
  const result = compareScoreGraphWithSemanticReference({
    scoreGraph: graph({ mutateEvent: (events) => events.pop() }),
    reference: ref,
  })
  assert.equal(result.status, 'MISMATCH')
  assert.equal(codes(result).includes('SEMANTIC_NOTE_COUNT_MISMATCH'), true)
})

test('SEM-05 comparator reports meter mismatch', async () => {
  const ref = await reference()
  const result = compareScoreGraphWithSemanticReference({
    scoreGraph: graph({ measures: [
      { key: 'm1', beats: 3, beatType: 4 },
      { key: 'm2', beats: 4, beatType: 4 },
    ] }),
    reference: ref,
  })
  assert.equal(result.status, 'MISMATCH')
  assert.equal(codes(result).includes('SEMANTIC_METER_MISMATCH'), true)
})

test('SEM-05 comparator fails closed on indistinguishable duplicate unison coordinates', async () => {
  const ref = await reference()
  const duplicate = { ...baseEvents()[0], id: 'n1-duplicate' }
  const result = compareScoreGraphWithSemanticReference({
    scoreGraph: graph({ extraEvent: duplicate }),
    reference: ref,
  })
  assert.equal(result.status, 'UNSUPPORTED')
  assert.equal(codes(result).includes('SEMANTIC_PROFILE_UNSUPPORTED'), true)
})

test('SEM-05 comparator preserves reference diagnostics and cannot return unconditional PASS', async () => {
  const raw = await json('semantic-baseline.semantic-snapshot.json')
  raw.diagnostics = [{ code: 'MISSING_STAFF', severity: 'WARNING', source_id: 'n1', message: 'reference warning' }]
  const ref = await reference({ diagnostics: raw.diagnostics })
  const result = compareScoreGraphWithSemanticReference({ scoreGraph: graph(), reference: ref })

  assert.equal(result.status, 'MISMATCH')
  assert.equal(codes(result).includes('SEMANTIC_REFERENCE_DIAGNOSTIC'), true)
})
