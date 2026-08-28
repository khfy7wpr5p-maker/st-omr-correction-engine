export const CONSTRAINT_STATUS = Object.freeze({ PASS: 'PASS', WARNING: 'WARNING', FAIL: 'FAIL' })

export function evaluateMeterConstraint(measure, events, options = {}) {
  const tolerance = options.tolerance ?? 0.01
  if (!measure || !Number.isFinite(measure.expectedQuarterBeats)) throw new TypeError('valid measure is required.')
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be non-negative.')

  const relevant = events.filter((event) => event.measureKey === measure.key && !event.isChordTone)
  const byVoice = new Map()
  for (const event of relevant) {
    const key = `${event.staff}:${event.voice}`
    if (!byVoice.has(key)) byVoice.set(key, [])
    byVoice.get(key).push(event)
  }

  const voices = []
  let hardFailure = false
  for (const [voiceKey, voiceEvents] of byVoice) {
    const maxEnd = voiceEvents.reduce((max, event) => Math.max(max, event.end), 0)
    const difference = maxEnd - measure.expectedQuarterBeats
    let status = CONSTRAINT_STATUS.PASS
    if (difference > tolerance) { status = CONSTRAINT_STATUS.FAIL; hardFailure = true }
    else if (difference < -tolerance && !measure.implicit && !measure.pickup) status = CONSTRAINT_STATUS.WARNING
    voices.push(Object.freeze({ voiceKey, actualQuarterBeats: maxEnd, expectedQuarterBeats: measure.expectedQuarterBeats, difference, status }))
  }

  if (voices.length === 0) return Object.freeze({ code: 'METER_EMPTY', status: CONSTRAINT_STATUS.WARNING, hardFailure: false, voices: Object.freeze([]) })
  const status = hardFailure ? CONSTRAINT_STATUS.FAIL : voices.some((v) => v.status === CONSTRAINT_STATUS.WARNING) ? CONSTRAINT_STATUS.WARNING : CONSTRAINT_STATUS.PASS
  return Object.freeze({ code: 'METER_DURATION', status, hardFailure, voices: Object.freeze(voices) })
}
