import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

export const CE_ANALYSIS_BROWSER_CONTRACT = 'ST_OMR_CORRECTION_ENGINE_ANALYSIS_BROWSER'
export const CE_ANALYSIS_BROWSER_CONTRACT_VERSION = '1.0.0'
export const CE_ANALYSIS_BROWSER_RUNTIME_VERSION = '1.0.0'
export const CE_ANALYSIS_BROWSER_GLOBAL = 'STOmrCorrectionAnalysisRuntime'
export const CE_ANALYSIS_BROWSER_ARTIFACT = 'ce-analysis-browser-runtime.js'
export const CE_ANALYSIS_BROWSER_MANIFEST = 'ce-analysis-browser-runtime.manifest.json'

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = path.join(repoRoot, 'dist', 'browser-analysis')
const entryPath = path.join(repoRoot, 'browser', 'ceAnalysisBrowserEntry.js')
const cryptoShimPath = path.join(repoRoot, 'browser', 'nodeCryptoSha256Shim.js')
const fsShimPath = path.join(repoRoot, 'browser', 'nodeFsUnavailableShim.js')
const bufferShimPath = path.join(repoRoot, 'browser', 'bufferShim.js')
const artifactPath = path.join(outDir, CE_ANALYSIS_BROWSER_ARTIFACT)
const manifestPath = path.join(outDir, CE_ANALYSIS_BROWSER_MANIFEST)

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
])

const FORBIDDEN_FLAGS = Object.freeze([
  'networkCapable',
  'persistenceCapable',
  'authenticationAuthority',
  'automaticApplyAuthority',
  'learningAuthority',
  'musicXmlWriteBackAuthority',
])

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function sourceRevision() {
  const value = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error('CE analysis git HEAD revision is invalid.')
  return value
}

export function verifyCeAnalysisBrowserManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new TypeError('CE analysis manifest is invalid.')
  if (manifest.contract !== CE_ANALYSIS_BROWSER_CONTRACT) throw new Error('CE analysis browser contract mismatch.')
  if (manifest.contractVersion !== CE_ANALYSIS_BROWSER_CONTRACT_VERSION || manifest.runtimeVersion !== CE_ANALYSIS_BROWSER_RUNTIME_VERSION) {
    throw new Error('CE analysis browser runtime version mismatch.')
  }
  if (manifest.artifact !== CE_ANALYSIS_BROWSER_ARTIFACT || manifest.global !== CE_ANALYSIS_BROWSER_GLOBAL || manifest.format !== 'iife' || manifest.target !== 'es2022') {
    throw new Error('CE analysis browser export surface mismatch.')
  }
  if (!/^[0-9a-f]{40}$/.test(manifest.engineSourceRevision ?? '') || manifest.engineSourceRevision !== sourceRevision()) {
    throw new Error('CE analysis browser engine revision mismatch.')
  }
  if (manifest.externalImports !== 0) throw new Error('CE analysis browser runtime contains external imports.')
  for (const field of FORBIDDEN_FLAGS) {
    if (manifest[field] !== false) throw new Error(`CE analysis forbidden authority/capability enabled: ${field}.`)
  }
  if (!Number.isInteger(manifest.bytes) || manifest.bytes <= 0) throw new Error('CE analysis runtime byte size is invalid.')
  if (typeof manifest.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.sha256)) throw new Error('CE analysis runtime digest is invalid.')
  return manifest
}

export function verifyCeAnalysisBrowserArtifact(manifest, artifact) {
  const verified = verifyCeAnalysisBrowserManifest(manifest)
  const bytes = Buffer.isBuffer(artifact) ? artifact : Buffer.from(artifact ?? '')
  if (bytes.byteLength !== verified.bytes) throw new Error('CE analysis runtime byte size does not match manifest.')
  if (sha256(bytes) !== verified.sha256) throw new Error('CE analysis runtime digest does not match manifest.')
  const text = bytes.toString('utf8')
  for (const token of FORBIDDEN_TOKENS) {
    if (text.includes(token)) throw new Error(`CE analysis runtime contains forbidden capability token: ${token}`)
  }
  if (!text.includes(CE_ANALYSIS_BROWSER_GLOBAL)) throw new Error('CE analysis browser runtime global export is missing.')
  return true
}

export async function buildCeAnalysisBrowserRuntime() {
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const result = await build({
    entryPoints: [entryPath],
    outfile: artifactPath,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    globalName: CE_ANALYSIS_BROWSER_GLOBAL,
    minify: true,
    sourcemap: false,
    legalComments: 'eof',
    inject: [bufferShimPath],
    metafile: true,
    logLevel: 'warning',
    plugins: [{
      name: 'ce-analysis-browser-node-shims',
      setup(esbuild) {
        esbuild.onResolve({ filter: /^node:crypto$/ }, () => ({ path: cryptoShimPath }))
        esbuild.onResolve({ filter: /^node:fs$/ }, () => ({ path: fsShimPath }))
      },
    }],
  })

  const externalImports = Object.values(result.metafile.outputs)
    .flatMap((output) => output.imports)
    .filter((entry) => entry.external === true)
  if (externalImports.length !== 0) throw new Error(`CE analysis browser runtime contains external imports: ${JSON.stringify(externalImports)}`)

  const artifact = await readFile(artifactPath)
  const manifest = Object.freeze({
    contract: CE_ANALYSIS_BROWSER_CONTRACT,
    contractVersion: CE_ANALYSIS_BROWSER_CONTRACT_VERSION,
    runtimeVersion: CE_ANALYSIS_BROWSER_RUNTIME_VERSION,
    engineSourceRevision: sourceRevision(),
    bundler: Object.freeze({ package: 'esbuild', version: '0.28.2', license: 'MIT' }),
    hashProvider: Object.freeze({ package: '@noble/hashes', version: '2.4.0', license: 'MIT' }),
    artifact: CE_ANALYSIS_BROWSER_ARTIFACT,
    format: 'iife',
    target: 'es2022',
    global: CE_ANALYSIS_BROWSER_GLOBAL,
    externalImports: 0,
    networkCapable: false,
    persistenceCapable: false,
    authenticationAuthority: false,
    automaticApplyAuthority: false,
    learningAuthority: false,
    musicXmlWriteBackAuthority: false,
    bytes: artifact.byteLength,
    sha256: sha256(artifact),
  })

  verifyCeAnalysisBrowserArtifact(manifest, artifact)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return Object.freeze({ destination: outDir, engineSourceRevision: manifest.engineSourceRevision, artifactSha256: manifest.sha256 })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildCeAnalysisBrowserRuntime()
  console.log(`CE analysis browser runtime prepared: ${path.relative(repoRoot, result.destination)}`)
  console.log(`Engine revision: ${result.engineSourceRevision}`)
  console.log(`Artifact SHA-256: ${result.artifactSha256}`)
}
