import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  SemanticConsistencyReferenceError,
  analyzeSemanticConsistencyProfile,
  validateSemanticConsistencyReference,
} from '../adapters/semantic/semanticReference.js'

const dir = new URL('./fixtures/sem-05-semantic-consistency/', import.meta.url)
const json = async (name) => JSON.parse(await readFile(new URL(name, dir), 'utf8'))

async function bundle() {
  return {
    provenance: await json('provenance.json'),
    semanticSnapshot: await json('semantic-baseline.semantic-snapshot.json'),
    observedSourceSha256: '943708ecae3d291f32f8c42472b12a300f2719a1c46fc74ab2aba9456a847dd6',
    observedSourceId: 'sem05-baseline',
  }
}

function reject(input) {
  assert.throws(
    () => validateSemanticConsistencyReference(input),
    (error) => error instanceof SemanticConsistencyReferenceError
      && error.code === 'INVALID_SEMANTIC_REFERENCE'
  )
}

test('SEM-05 accepts and deeply freezes the exact pinned semantic reference', async () => {
  const input = await bundle()
  const result = validateSemanticConsistencyReference(input)

  assert.equal(result.provenance.sourceSha256, input.observedSourceSha256)
  assert.equal(result.provenance.sourceId, input.observedSourceId)
  assert.equal(result.provenance.semanticEngineCommit, 'ffc997b242fa862e180e698385cc0afb52de47a1')
  assert.equal(result.provenance.partituraVersion, '1.9.0')
  assert.equal(result.semanticSnapshot.schema_version, 'st-semantic-snapshot-v1')
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.provenance), true)
  assert.equal(Object.isFrozen(result.semanticSnapshot), true)
  assert.equal(Object.isFrozen(result.semanticSnapshot.notes), true)
  assert.equal(Object.isFrozen(result.semanticSnapshot.notes[0]), true)
  assert.equal(Object.isFrozen(result.semanticSnapshot.diagnostics), true)
})

test('SEM-05 rejects provenance drift', async () => {
  const input = await bundle()
  reject({ ...input, observedSourceSha256: '0'.repeat(64) })
  reject({ ...input, observedSourceId: 'wrong-source' })
  reject({ ...input, provenance: { ...input.provenance, semanticEngineCommit: '1'.repeat(40) } })
  reject({ ...input, provenance: { ...input.provenance, semanticSnapshotSchema: 'wrong' } })
  reject({ ...input, provenance: { ...input.provenance, partituraVersion: '9.9.9' } })
  reject({ ...input, provenance: { ...input.provenance, divisionsPerQuarter: 0 } })
  reject({ ...input, provenance: { ...input.provenance, divisionsPerQuarter: 4.5 } })
})

test('SEM-05 rejects snapshot header drift', async () => {
  const input = await bundle()
  reject({ ...input, semanticSnapshot: { ...input.semanticSnapshot, schema_version: 'wrong' } })
  reject({ ...input, semanticSnapshot: { ...input.semanticSnapshot, source_kind: 'other' } })
})

test('SEM-05 preserves reference diagnostics', async () => {
  const input = await bundle()
  const semanticSnapshot = {
    ...input.semanticSnapshot,
    diagnostics: [{ code: 'MISSING_STAFF', severity: 'WARNING', source_id: 'n1', message: 'missing' }],
  }
  const result = validateSemanticConsistencyReference({ ...input, semanticSnapshot })

  assert.deepEqual(result.semanticSnapshot.diagnostics, semanticSnapshot.diagnostics)
  assert.equal(Object.isFrozen(result.semanticSnapshot.diagnostics[0]), true)
})

test('SEM-05 profile admits baseline and fails closed on unsupported semantic structures', async () => {
  const input = await bundle()
  const reference = validateSemanticConsistencyReference(input)
  assert.deepEqual(analyzeSemanticConsistencyProfile(reference), { status: 'PASS' })

  const grace = structuredClone(input.semanticSnapshot)
  grace.notes[0].is_grace = true
  const graceReference = validateSemanticConsistencyReference({ ...input, semanticSnapshot: grace })
  assert.equal(analyzeSemanticConsistencyProfile(graceReference).status, 'UNSUPPORTED')

  const unsupported = structuredClone(input.semanticSnapshot)
  unsupported.diagnostics = [{ code: 'UNSUPPORTED_STRUCTURE', severity: 'ERROR', source_id: null, message: 'unsupported' }]
  const unsupportedReference = validateSemanticConsistencyReference({ ...input, semanticSnapshot: unsupported })
  assert.equal(analyzeSemanticConsistencyProfile(unsupportedReference).status, 'UNSUPPORTED')
})
