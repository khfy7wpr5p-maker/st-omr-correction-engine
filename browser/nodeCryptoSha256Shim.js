import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils.js'

function toBytes(value) {
  if (typeof value === 'string') return utf8ToBytes(value)
  if (value instanceof Uint8Array) return new Uint8Array(value)
  throw new TypeError('sha256 update value must be a string or Uint8Array.')
}

export function createHash(algorithm) {
  if (algorithm !== 'sha256') {
    throw new TypeError('Only sha256 is supported by the CE-STRUCT browser crypto shim.')
  }

  const chunks = []
  let finalized = false

  const api = {
    update(value) {
      if (finalized) throw new Error('sha256 hash is already finalized.')
      chunks.push(toBytes(value))
      return api
    },
    digest(encoding) {
      if (encoding !== 'hex') {
        throw new TypeError('CE-STRUCT browser sha256 digest encoding must be hex.')
      }
      if (finalized) throw new Error('sha256 hash is already finalized.')
      finalized = true
      const bytes = chunks.length === 0
        ? new Uint8Array()
        : concatBytes(...chunks)
      return bytesToHex(sha256(bytes))
    },
  }

  return Object.freeze(api)
}
