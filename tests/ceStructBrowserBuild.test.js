import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const builderUrl = new URL('../scripts/buildCeStructBrowserRuntime.mjs', import.meta.url)
const artifactUrl = new URL('../dist/browser/ce-struct-browser-runtime.js', import.meta.url)
const manifestUrl = new URL('../dist/browser/ce-struct-browser-runtime.manifest.json', import.meta.url)

test('CE-STRUCT browser runtime builder exists', () => {
  assert.equal(existsSync(builderUrl), true)
})

test('CE-STRUCT browser runtime manifest binds exact source and forbidden authorities', async () => {
  assert.equal(existsSync(builderUrl), true)
  assert.equal(existsSync(artifactUrl), true)
  assert.equal(existsSync(manifestUrl), true)

  const { verifyCeStructBrowserManifest, verifyCeStructBrowserArtifact } = await import(builderUrl)
  const manifestBytes = await readFile(manifestUrl)
  const artifact = await readFile(artifactUrl)
  const manifest = JSON.parse(manifestBytes.toString('utf8'))

  assert.equal(verifyCeStructBrowserManifest(manifest), manifest)
  assert.equal(verifyCeStructBrowserArtifact(manifest, artifact), true)

  assert.equal(manifest.contract, 'ST_OMR_CORRECTION_ENGINE_CE_STRUCT_BROWSER')
  assert.equal(manifest.contractVersion, '1.0.0')
  assert.equal(manifest.runtimeVersion, '1.0.0')
  assert.equal(manifest.artifact, 'ce-struct-browser-runtime.js')
  assert.equal(manifest.format, 'iife')
  assert.equal(manifest.target, 'es2022')
  assert.equal(manifest.global, 'STOmrCorrectionCeStructRuntime')
  assert.equal(manifest.externalImports, 0)
  assert.equal(manifest.engineSourceRevision, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim())
  assert.equal(manifest.bundler.package, 'esbuild')
  assert.equal(manifest.bundler.version, '0.28.2')
  assert.equal(manifest.hashProvider.package, '@noble/hashes')
  assert.equal(manifest.hashProvider.version, '2.4.0')

  for (const field of [
    'networkCapable',
    'persistenceCapable',
    'authenticationAuthority',
    'automaticApplyAuthority',
    'finalTeacherApprovalAuthority',
    'studentShareAuthority',
    'learningAuthority',
    'musicXmlWriteBackAuthority',
  ]) {
    assert.equal(manifest[field], false)
  }

  assert.equal(manifest.bytes, artifact.byteLength)
  assert.equal(manifest.sha256, createHash('sha256').update(artifact).digest('hex'))
})

test('CE-STRUCT browser bundle contains no forbidden capability tokens', async () => {
  assert.equal(existsSync(artifactUrl), true)
  const text = await readFile(artifactUrl, 'utf8')
  for (const token of [
    'node:',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'navigator.sendBeacon',
    'fetch(',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'document.cookie',
    'process.env',
    'node:fs',
  ]) {
    assert.equal(text.includes(token), false, `forbidden token present: ${token}`)
  }
})

test('CE-STRUCT runtime verifier rejects authority or digest drift', async () => {
  assert.equal(existsSync(builderUrl), true)
  const { verifyCeStructBrowserManifest, verifyCeStructBrowserArtifact } = await import(builderUrl)
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const artifact = await readFile(artifactUrl)

  assert.throws(
    () => verifyCeStructBrowserManifest({ ...manifest, automaticApplyAuthority: true }),
    /authority|capability/i,
  )
  assert.throws(
    () => verifyCeStructBrowserManifest({ ...manifest, engineSourceRevision: '0'.repeat(40) }),
    /revision/i,
  )
  assert.throws(
    () => verifyCeStructBrowserArtifact({ ...manifest, sha256: '0'.repeat(64) }, artifact),
    /digest/i,
  )
})
