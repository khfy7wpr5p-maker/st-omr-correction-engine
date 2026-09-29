class BrowserBuffer extends Uint8Array {
  toString(encoding = 'utf8') {
    if (encoding !== 'utf8' && encoding !== 'utf-8') throw new TypeError('Browser Buffer shim supports utf8 only.')
    return new TextDecoder().decode(this)
  }
}

export const Buffer = Object.freeze({
  from(value) {
    if (typeof value === 'string') return new BrowserBuffer(new TextEncoder().encode(value))
    if (value instanceof Uint8Array) return new BrowserBuffer(value)
    throw new TypeError('Browser Buffer shim accepts strings or Uint8Array only.')
  },
  isBuffer(value) {
    return value instanceof BrowserBuffer
  },
})
