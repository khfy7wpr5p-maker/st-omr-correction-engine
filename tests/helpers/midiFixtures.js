function u32(value) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
}

function u16(value) {
  return [(value >>> 8) & 0xff, value & 0xff]
}

export function vlq(value) {
  if (!Number.isInteger(value) || value < 0) throw new RangeError('VLQ value must be a non-negative integer.')
  let buffer = value & 0x7f
  const bytes = []
  while ((value >>= 7)) {
    buffer <<= 8
    buffer |= ((value & 0x7f) | 0x80)
  }
  while (true) {
    bytes.push(buffer & 0xff)
    if (buffer & 0x80) buffer >>= 8
    else break
  }
  return bytes
}

export function event(delta, bytes) {
  return [...vlq(delta), ...bytes]
}

export const endOfTrack = () => event(0, [0xff, 0x2f, 0x00])
export const tempo = (microsecondsPerQuarter = 500000, delta = 0) => event(delta, [0xff, 0x51, 0x03, (microsecondsPerQuarter >>> 16) & 0xff, (microsecondsPerQuarter >>> 8) & 0xff, microsecondsPerQuarter & 0xff])
export const timeSignature = (numerator = 4, denominator = 4, delta = 0) => event(delta, [0xff, 0x58, 0x04, numerator, Math.log2(denominator), 24, 8])
export const programChange = (program = 0, channel = 0, delta = 0) => event(delta, [0xc0 | channel, program])
export const noteOn = (note, velocity = 96, channel = 0, delta = 0) => event(delta, [0x90 | channel, note, velocity])
export const noteOff = (note, velocity = 64, channel = 0, delta = 0) => event(delta, [0x80 | channel, note, velocity])
export const controlChange = (number, value, channel = 0, delta = 0) => event(delta, [0xb0 | channel, number, value])
export const pitchBend = (value14 = 8192, channel = 0, delta = 0) => event(delta, [0xe0 | channel, value14 & 0x7f, (value14 >>> 7) & 0x7f])

function trackChunk(events) {
  const data = events.flat()
  return [0x4d, 0x54, 0x72, 0x6b, ...u32(data.length), ...data]
}

export function buildMidiFile({ format = 1, ppq = 480, trackEventGroups = [] } = {}) {
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, ...u16(format), ...u16(trackEventGroups.length), ...u16(ppq)]
  return Buffer.from([...header, ...trackEventGroups.flatMap(trackChunk)])
}

export function simpleScaleMidi({ format = 1, offsetTicks = 0, channel = 0, program = 0 } = {}) {
  const notes = [60, 62, 64]
  const noteEvents = [programChange(program, channel, offsetTicks)]
  for (const note of notes) {
    noteEvents.push(noteOn(note, 96, channel, 0), noteOff(note, 64, channel, 480))
  }
  noteEvents.push(endOfTrack())
  if (format === 0) {
    return buildMidiFile({ format: 0, trackEventGroups: [[tempo(), timeSignature(), ...noteEvents]] })
  }
  return buildMidiFile({ format: 1, trackEventGroups: [[tempo(), timeSignature(), endOfTrack()], noteEvents] })
}
