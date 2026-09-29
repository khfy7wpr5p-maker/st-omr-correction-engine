import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

export const CE_STRUCT_BROWSER_CONTRACT = 'ST_OMR_CORRECTION_ENGINE_CE_STRUCT_BROWSER'
export const CE_STRUCT_BROWSER_CONTRACT_VERSION = '1.0.0'
export const CE_STRUCT_BROWSER_RUNTIME_VERSION = '1.0.0'
export const CE_STRUCT_BROWSER_GLOBAL = 'STOmrCorrectionCeStructRuntime'
export const CE_STRUCT_BROWSER_ARTIFACT = 'ce-struct-browser-runtime.js'
export const CE_STRUCT_BROWSER_MANIFEST = 'ce-struct-browser-runtime.manifest.json'

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = path.join(repoRoot, 'dist', 'browser')
const entryPath = path.join(repoRoot, 'browser', 'ceStructBrowserEntry.js')
const cryptoShimPath = path.join(repoRoot, 'browser', 'nodeCryptoSha256Shim.js')
const artifactPath = path.join(outDir, CE_STRUCT_BROWSER_ARTIFACT)
const manifestPath = path.join(outDir, CE_STRUCT_BROWSER_MANIFEST)

const FORBIDDEN_TOKENS = Object.freeze([
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
])

const FORBIDDEN_FLAGS = Object.freeze([
  'networkCapable',
  'persistenceCapable',
  'authenticationAuthority',
  'automaticApplyAuthority',
  'finalTeacherApprovalAuthority',
  'studentShareAuthority',
  'learningAuthority',
  'musicXmlWriteBackAuthority',
])

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function exactHeadRevision() {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()
}

function requiredObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(message)
  }
  return value
}

export function verifyCeStructBrowserManifest(manifest) {
  requiredObject(manifest, 'CE-STRUCT browser runtime manifest is invalid.')

  if (manifest.contract !== CE_STRUCT_BROWSER_CONTRACT) {
    throw new Error('CE-STRUCT browser contract mismatch.')
  }
  if (
    manifest.contractVersion !== CE_STRUCT_BROWSER_CONTRACT_VERSION
    || manifest.runtimeVersion !== CE_STRUCT_BROWSER_RUNTIME_VERSION
  ) {
    throw new Error('CE-STRUCT browser runtime version mismatch.')
  }
  if (
    manifest.artifact !== CE_STRUCT_BROWSER_ARTIFACT
    || manifest.format !== 'iife'
    || manifest.target !== 'es2022'
    || manifest.global !== CE_STRUCT_BROWSER_GLOBAL
  ) {
    throw new Error('CE-STRUCT browser runtime export surface mismatch.')
  }
  if (!/^[0-9a-f]{40}$/.test(manifest.engineSourceRevision ?? '')) {
    throw new Error('CE-STRUCT browser engine revision is invalid.')
  }
  if (manifest.engineSourceRevision !== exactHeadRevision()) {
    throw new Error('CE-STRUCT browser engine revision mismatch.')
  }
  if (manifest.externalImports !== 0) {
    throw new Error('CE-STRUCT browser runtime contains external imports.')
  }
  if (
    manifest.bundler?.package !== 'esbuild'
    || manifest.bundler?.version !== '0.28.2'
    || manifest.hashProvider?.package !== '@noble/hashes'
    || manifest.hashProvider?.version !== '2.4.0'
  ) {
    throw new Error('CE-STRUCT browser build provenance mismatch.')
  }
  for (const field of FORBIDDEN_FLAGS) {
    if (manifest[field] !== false) {
      throw new Error(`CE-STRUCT browser forbidden authority/capability enabled: ${field}.`)
    }
  }
  if (!Number.isInteger(manifest.bytes) || manifest.bytes <= 0) {
    throw new Error('CE-STRUCT browser runtime byte size is invalid.')
  }
  if (typeof manifest.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.sha256)) {
    throw new Error('CE-STRUCT browser runtime digest is invalid.')
  }
  return manifest
}

export function verifyCeStructBrowserArtifact(manifest, artifact) {
  const verified = verifyCeStructBrowserManifest(manifest)
  const bytes = Buffer.isBuffer(artifact) ? artifact : Buffer.from(artifact ?? '')
  if (bytes.byteLength !== verified.bytes) {
    throw new Error('CE-STRUCT browser runtime byte size does not match manifest.')
  }
  if (sha256(bytes) !== verified.sha256) {
    throw new Error('CE-STRUCT browser runtime digest does not match manifest.')
  }

  const text = bytes.toString('utf8')
  for (const token of FORBIDDEN_TOKENS) {
    if (text.includes(token)) {
      throw new Error(`CE-STRUCT browser runtime contains forbidden capability token: ${token}`)
    }
  }
  if (!text.includes(CE_STRUCT_BROWSER_GLOBAL)) {
    throw new Error('CE-STRUCT browser runtime global export is missing.')
  }
  return true
}

export async function buildCeStructBrowserRuntime() {
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const result = await build({
    entryPoints: [entryPath],
    outfile: artifactPath,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    globalName: CE_STRUCT_BROWSER_GLOBAL,
    minify: true,
    sourcemap: false,
    legalComments: 'eof',
    metafile: true,
    logLevel: 'warning',
    plugins: [{
      name: 'ce-struct-browser-node-crypto-shim',
      setup(esbuild) {
        esbuild.onResolve({ filter: /^node:crypto$/ }, () => ({ path: cryptoShimPath }))
      },
    }],
  })

  const externalImports = Object.values(result.metafile.outputs)
    .flatMap((output) => output.imports)
    .filter((entry) => entry.external === true)
  if (externalImports.length !== 0) {
    throw new Error(`CE-STRUCT browser runtime contains external imports: ${JSON.stringify(externalImports)}`)
  }

  const artifact = await readFile(artifactPath)
  const artifactText = artifact.toString('utf8')
  for (const token of FORBIDDEN_TOKENS) {
    if (artifactText.includes(token)) {
      throw new Error(`CE-STRUCT browser runtime contains forbidden capability token: ${token}`)
    }
  }

  const manifest = Object.freeze({
    contract: CE_STRUCT_BROWSER_CONTRACT,
    contractVersion: CE_STRUCT_BROWSER_CONTRACT_VERSION,
    runtimeVersion: CE_STRUCT_BROWSER_RUNTIME_VERSION,
    engineSourceRevision: exactHeadRevision(),
    bundler: Object.freeze({ package: 'esbuild', version: '0.28.2', license: 'MIT' }),
    hashProvider: Object.freeze({ package: '@noble/hashes', version: '2.4.0', license: 'MIT' }),
    artifact: CE_STRUCT_BROWSER_ARTIFACT,
    format: 'iife',
    target: 'es2022',
    global: CE_STRUCT_BROWSER_GLOBAL,
    externalImports: 0,
    networkCapable: false,
    persistenceCapable: false,
    authenticationAuthority: false,
    automaticApplyAuthority: false,
    finalTeacherApprovalAuthority: false,
    studentShareAuthority: false,
    learningAuthority: false,
    musicXmlWriteBackAuthority: false,
    bytes: artifact.byteLength,
    sha256: sha256(artifact),
  })

  verifyCeStructBrowserArtifact(manifest, artifact)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  return Object.freeze({
    destination: outDir,
    engineSourceRevision: manifest.engineSourceRevision,
    artifactSha256: manifest.sha256,
    runtimeVersion: manifest.runtimeVersion,
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildCeStructBrowserRuntime()
  console.log(`CE-STRUCT browser runtime prepared: ${path.relative(repoRoot, result.destination)}`)
  console.log(`Engine revision: ${result.engineSourceRevision}`)
  console.log(`Runtime: ${result.runtimeVersion}`)
  console.log(`Artifact SHA-256: ${result.artifactSha256}`)
}
