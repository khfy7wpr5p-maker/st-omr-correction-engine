import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseBoundedMusicXmlScoreGraph } from '../src/index.js'
import { analyzeSemanticConsistency } from '../adapters/semantic/semanticConsistencyBridge.js'
import { analyzeSemanticSourceProfile } from '../adapters/semantic/semanticSourceProfile.js'

const dir = new URL('./fixtures/sem-05-semantic-consistency/', import.meta.url)
const json = async (name) => JSON.parse(await readFile(new URL(name, dir), 'utf8'))
const xmlBytes = async () => readFile(new URL('semantic-baseline.musicxml', dir))

test('SEM-05 real bounded MusicXML path produces read-only semantic PASS', async () => {
  const provenance = await json('provenance.json')
  const semanticSnapshot = await json('semantic-baseline.semantic-snapshot.json')
  const bytes = await xmlBytes()
  const parsed = parseBoundedMusicXmlScoreGraph(bytes, {
    sourceId: provenance.sourceId,
    includeRests: false,
  })
  const before = JSON.stringify(parsed.scoreGraph)

  assert.equal(parsed.sha256, provenance.sourceSha256)
  assert.deepEqual(
    analyzeSemanticSourceProfile({
      musicXml: bytes,
      expectedDivisionsPerQuarter: provenance.divisionsPerQuarter,
    }),
    { status: 'PASS', diagnostics: [] }
  )

  const packet = analyzeSemanticConsistency({
    scoreGraph: parsed.scoreGraph,
    provenance,
    semanticSnapshot,
    observedSourceSha256: parsed.sha256,
    observedSourceId: parsed.sourceId,
  })

  assert.equal(packet.status, 'PASS')
  assert.equal(packet.resolverEligible, false)
  assert.equal(packet.automaticCorrectionAuthority, false)
  assert.equal(JSON.stringify(parsed.scoreGraph), before)
  for (const forbidden of ['patches','apply','accept','correctedScore','musicXml','evidence']) {
    assert.equal(forbidden in packet, false)
  }
})

test('SEM-05 source profile fails closed on excluded MusicXML structures', async () => {
  const provenance = await json('provenance.json')
  const base = (await xmlBytes()).toString('utf8')
  const cases = [
    ['mixed divisions', base.replace(
      '<measure number="2">',
      '<measure number="2"><attributes><divisions>8</divisions></attributes>'
    )],
    ['grace', base.replace('<note id="n1">', '<note id="n1"><grace/>')],
    ['transpose', base.replace(
      '<divisions>4</divisions>',
      '<divisions>4</divisions><transpose><chromatic>2</chromatic></transpose>'
    )],
    ['implicit measure', base.replace('<measure number="1">', '<measure number="1" implicit="yes">')],
  ]

  for (const [name, musicXml] of cases) {
    const result = analyzeSemanticSourceProfile({
      musicXml,
      expectedDivisionsPerQuarter: provenance.divisionsPerQuarter,
    })
    assert.equal(result.status, 'UNSUPPORTED', name)
    assert.equal(result.diagnostics[0]?.code, 'SEMANTIC_PROFILE_UNSUPPORTED', name)
  }
})

test('SEM-05 exact source SHA drift prevents PASS even when musical notes are unchanged', async () => {
  const provenance = await json('provenance.json')
  const semanticSnapshot = await json('semantic-baseline.semantic-snapshot.json')
  const base = (await xmlBytes()).toString('utf8')
  const changed = base.replace('Semantic Baseline', 'Semantic Baseline Repacked')
  const parsed = parseBoundedMusicXmlScoreGraph(changed, {
    sourceId: provenance.sourceId,
    includeRests: false,
  })

  assert.notEqual(parsed.sha256, provenance.sourceSha256)
  const packet = analyzeSemanticConsistency({
    scoreGraph: parsed.scoreGraph,
    provenance,
    semanticSnapshot,
    observedSourceSha256: parsed.sha256,
    observedSourceId: parsed.sourceId,
  })

  assert.equal(packet.status, 'UNSUPPORTED')
  assert.equal(packet.diagnostics[0]?.code, 'SEMANTIC_SOURCE_MISMATCH')
  assert.equal(packet.resolverEligible, false)
})
