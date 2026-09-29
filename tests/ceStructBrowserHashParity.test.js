import assert from 'node:assert/strict'
import { createHash as createNodeHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import test from 'node:test'

const shimUrl = new URL('../browser/nodeCryptoSha256Shim.js', import.meta.url)

test('CE-STRUCT browser SHA-256 shim exists', () => {
  assert.equal(existsSync(shimUrl), true)
})

test('CE-STRUCT browser SHA-256 shim matches Node for canonical inputs', async () => {
  assert.equal(existsSync(shimUrl), true)
  const { createHash } = await import(shimUrl)

  const samples = [
    'abc',
    'SesliTab — öğretmen düzeltmesi',
    JSON.stringify({
      sourceId: 'source-1',
      measures: [{ key: 'm1', beats: 4, beatType: 4 }],
      events: [{ id: 'e1', measureKey: 'm1', onset: 0, duration: 1, voice: 1, staff: 1 }],
    }),
  ]

  for (const sample of samples) {
    const expected = createNodeHash('sha256').update(sample).digest('hex')
    const actual = createHash('sha256').update(sample).digest('hex')
    assert.equal(actual, expected)
    assert.match(actual, /^[0-9a-f]{64}$/)
  }
})

test('CE-STRUCT browser SHA-256 shim accepts Uint8Array input', async () => {
  assert.equal(existsSync(shimUrl), true)
  const { createHash } = await import(shimUrl)
  const bytes = new TextEncoder().encode('SesliTab')

  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    createNodeHash('sha256').update(bytes).digest('hex'),
  )
})

test('CE-STRUCT browser SHA-256 shim rejects unsupported algorithms and digest encodings', async () => {
  assert.equal(existsSync(shimUrl), true)
  const { createHash } = await import(shimUrl)

  assert.throws(() => createHash('sha512'), /sha256/i)
  assert.throws(
    () => createHash('sha256').update('abc').digest('base64'),
    /hex/i,
  )
})

