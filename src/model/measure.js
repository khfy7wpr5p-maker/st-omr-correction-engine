export function createMeasure({ key, beats, beatType, implicit = false, pickup = false }) {
  if (typeof key !== 'string' || !key.trim()) throw new TypeError('measure key is required.')
  if (!Number.isFinite(beats) || beats <= 0) throw new RangeError('beats must be positive.')
  if (!Number.isFinite(beatType) || beatType <= 0) throw new RangeError('beatType must be positive.')
  const expectedQuarterBeats = beats * (4 / beatType)
  return Object.freeze({ key, beats, beatType, expectedQuarterBeats, implicit: !!implicit, pickup: !!pickup })
}
