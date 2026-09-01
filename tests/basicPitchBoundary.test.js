import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

test('Basic Pitch remains outside npm/core dependency graph', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.dependencies?.['basic-pitch'], undefined)
  assert.equal(pkg.dependencies?.['@spotify/basic-pitch'], undefined)
  const coreIndex = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8')
  assert.equal(coreIndex.includes('basicPitchProvider'), false)
  assert.equal(coreIndex.includes('audioDerivedMidiEvidence'), false)
})

test('isolated Basic Pitch Python worker parses as valid Python when python3 is available', (t) => {
  const workerPath = new URL('../providers/basic-pitch/basic_pitch_worker.py', import.meta.url)
  const result = spawnSync('python3', ['-c', 'import ast,pathlib,sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))', workerPath.pathname], { encoding: 'utf8' })
  if (result.error?.code === 'ENOENT') {
    t.skip('python3 is not installed in this test environment')
    return
  }
  assert.equal(result.status, 0, result.stderr)
})
