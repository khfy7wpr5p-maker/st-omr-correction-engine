import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

import { analyzeMusicXmlSuspiciousMeasures as analyzeNode } from '../src/correction/musicXmlSuspiciousMeasureAnalyzer.js'

const artifactUrl = new URL('../dist/browser-analysis/ce-analysis-browser-runtime.js', import.meta.url)
const manifestUrl = new URL('../dist/browser-analysis/ce-analysis-browser-runtime.manifest.json', import.meta.url)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`

async function browserRuntime() {
  const source = await readFile(artifactUrl, 'utf8')
  const context = vm.createContext({ TextEncoder, TextDecoder, Uint8Array })
  vm.runInContext(source, context, { filename: 'ce-analysis-browser-runtime.js' })
  return context.STOmrCorrectionAnalysisRuntime
}

const plain = (value) => JSON.parse(JSON.stringify(value))

test('CE analysis browser runtime artifact and manifest exist', () => {
  assert.equal(existsSync(artifactUrl), true)
  assert.equal(existsSync(manifestUrl), true)
})

test('CE analysis browser manifest is exact-source-bound and read-only', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const artifact = await readFile(artifactUrl)

  assert.equal(manifest.contract, 'ST_OMR_CORRECTION_ENGINE_ANALYSIS_BROWSER')
  assert.equal(manifest.contractVersion, '1.0.0')
  assert.equal(manifest.runtimeVersion, '1.0.0')
  assert.equal(manifest.artifact, 'ce-analysis-browser-runtime.js')
  assert.equal(manifest.global, 'STOmrCorrectionAnalysisRuntime')
  assert.equal(manifest.externalImports, 0)
  assert.match(manifest.engineSourceRevision, /^[0-9a-f]{40}$/)
  assert.equal(manifest.sha256, createHash('sha256').update(artifact).digest('hex'))
  assert.equal(manifest.bytes, artifact.byteLength)

  for (const field of [
    'networkCapable',
    'persistenceCapable',
    'authenticationAuthority',
    'automaticApplyAuthority',
    'learningAuthority',
    'musicXmlWriteBackAuthority',
  ]) assert.equal(manifest[field], false)
})

test('browser analysis exactly matches Node and identifies the overfull second measure', async () => {
  const browser = await browserRuntime()
  const nodeResult = analyzeNode({ musicxml: xml, sourceId: 'fixture-source' })
  const browserResult = browser.analyzeMusicXmlSuspiciousMeasures({ musicxml: xml, sourceId: 'fixture-source' })

  assert.deepEqual(plain(browserResult), plain(nodeResult))
  assert.equal(browserResult.mode, 'SHADOW_ONLY')
  assert.equal(browserResult.partId, 'P1')
  assert.equal(browserResult.automaticApplyAuthority, false)
  assert.equal(browserResult.musicXmlWriteBackAuthority, false)
  assert.deepEqual(plain(browserResult.suspiciousMeasures.map((item) => ({
    measureNumber: item.measureNumber,
    measureIndex: item.measureIndex,
  }))), [{ measureNumber: '2', measureIndex: 1 }])
  assert.equal(browserResult.suspiciousMeasures[0].codes.includes('VOICE_DURATION_EXCEEDS_MEASURE'), true)
  assert.equal(browserResult.suspiciousMeasures[0].codes.includes('EVENT_EXCEEDS_MEASURE'), true)
})

test('browser analysis fails closed for unsupported multi-part MusicXML', async () => {
  const browser = await browserRuntime()
  const invalid = xml.replace('</score-partwise>', '<part id="P2"><measure number="1"/></part></score-partwise>')
  assert.throws(
    () => browser.analyzeMusicXmlSuspiciousMeasures({ musicxml: invalid, sourceId: 'bad' }),
    /EXACTLY_ONE_PART_REQUIRED/,
  )
})
