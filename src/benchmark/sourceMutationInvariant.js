import { createHash } from 'node:crypto'

function asBytes(value) {
  if (typeof value === 'string') return Buffer.from(value, 'utf8')
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) return Buffer.from(value)
  throw new TypeError('source must be a string, Buffer, or Uint8Array.')
}

export function hashSourceBytes(source) {
  return createHash('sha256').update(asBytes(source)).digest('hex')
}

export function evaluateSourceMutationInvariant(before, after) {
  const beforeHash = hashSourceBytes(before)
  const afterHash = hashSourceBytes(after)
  return Object.freeze({
    ok: beforeHash === afterHash,
    beforeHash,
    afterHash,
    code: beforeHash === afterHash ? 'SOURCE_UNCHANGED' : 'SOURCE_MUTATED',
  })
}
