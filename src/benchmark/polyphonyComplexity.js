function round(value) {
  return Number(value.toFixed(6))
}

function overlaps(a, b) {
  return a.onset < b.end && b.onset < a.end
}

export function describePolyphonyComplexity(events) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const voices = new Set()
  const staves = new Set()
  const notes = events.filter((event) => event && !event.isRest)
  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')
    if (Number.isInteger(event.voice)) voices.add(event.voice)
    if (Number.isInteger(event.staff)) staves.add(event.staff)
  }

  const onsets = [...new Set(notes.map((event) => event.onset).filter(Number.isFinite))]
  const simultaneousNoteDensity = onsets.length
    ? onsets.reduce((sum, onset) => sum + notes.filter((event) => event.onset <= onset && (event.end > onset || event.onset === event.end)).length, 0) / onsets.length
    : 0

  let overlappingPairs = 0
  let comparablePairs = 0
  for (let left = 0; left < notes.length; left += 1) {
    for (let right = left + 1; right < notes.length; right += 1) {
      comparablePairs += 1
      if (overlaps(notes[left], notes[right])) overlappingPairs += 1
    }
  }
  const overlapDensity = comparablePairs ? overlappingPairs / comparablePairs : 0

  const staffByVoice = new Map()
  for (const event of notes) {
    if (!staffByVoice.has(event.voice)) staffByVoice.set(event.voice, new Set())
    staffByVoice.get(event.voice).add(event.staff)
  }
  const crossStaffPresent = [...staffByVoice.values()].some((staffSet) => staffSet.size > 1)
  const tupletPresent = notes.some((event) => event.metadata?.tuplet != null || event.metadata?.timeModification != null)
  const gracePresent = notes.some((event) => event.metadata?.grace === true)
  const tieEvents = notes.filter((event) => event.metadata?.tieStart === true || event.metadata?.tieStop === true || Array.isArray(event.metadata?.ties) && event.metadata.ties.length > 0).length
  const tieDensity = notes.length ? tieEvents / notes.length : 0
  const uniqueDurations = new Set(notes.map((event) => event.duration).filter(Number.isFinite)).size
  const rhythmicComplexity = Math.min(1, (uniqueDurations / 8) + (tupletPresent ? 0.25 : 0) + Math.min(0.25, overlapDensity / 2) + Math.min(0.25, voices.size / 16))

  return Object.freeze({
    voiceCount: voices.size,
    staffCount: staves.size,
    simultaneousNoteDensity: round(simultaneousNoteDensity),
    overlapDensity: round(overlapDensity),
    crossStaffPresent,
    tupletPresent,
    tieDensity: round(tieDensity),
    gracePresent,
    rhythmicComplexity: round(rhythmicComplexity),
  })
}

export function polyphonyLevelLabel(complexity) {
  if (!complexity || !Number.isInteger(complexity.voiceCount) || complexity.voiceCount < 0) throw new TypeError('valid complexity profile is required.')
  if (complexity.voiceCount >= 4) return 'voice-4-plus'
  return `voice-${complexity.voiceCount}`
}
