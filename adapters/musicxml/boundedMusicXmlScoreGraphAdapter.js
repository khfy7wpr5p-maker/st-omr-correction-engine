import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createMeasure, createScoreEvent, createScoreGraph } from '../../src/index.js'

const STEP_TO_PC = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function asXml(input) {
  if (typeof input === 'string' && input.includes('<score-partwise')) return { text: input, bytes: Buffer.from(input) }
  if (typeof input === 'string') {
    const bytes = Buffer.from(readFileSync(input))
    return { text: bytes.toString('utf8'), bytes }
  }
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    const bytes = Buffer.from(input)
    return { text: bytes.toString('utf8'), bytes }
  }
  throw new TypeError('MusicXML input must be XML text, a path, Buffer, or Uint8Array.')
}

function textTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : null
}

function intTag(block, tag, { required = false, defaultValue = null } = {}) {
  const raw = textTag(block, tag)
  if (raw == null || raw === '') {
    if (required) throw new Error(`MUSICXML_${tag.toUpperCase()}_REQUIRED`)
    return defaultValue
  }
  const value = Number(raw)
  if (!Number.isInteger(value)) throw new Error(`MUSICXML_${tag.toUpperCase()}_MUST_BE_INTEGER`)
  return value
}

function pitchFromNote(note) {
  if (/<rest(?:\s[^>]*)?\s*\/>/i.test(note) || /<rest(?:\s[^>]*)?>/i.test(note)) return null
  const pitch = note.match(/<pitch(?:\s[^>]*)?>([\s\S]*?)<\/pitch>/i)?.[1]
  if (!pitch) throw new Error('MUSICXML_PITCH_REQUIRED_FOR_NON_REST')
  const step = textTag(pitch, 'step')
  const octave = intTag(pitch, 'octave', { required: true })
  const alter = intTag(pitch, 'alter', { defaultValue: 0 })
  if (!(step in STEP_TO_PC)) throw new Error('MUSICXML_UNSUPPORTED_PITCH_STEP')
  if (!Number.isInteger(alter) || alter < -2 || alter > 2) throw new Error('MUSICXML_UNSUPPORTED_ALTER')
  return (octave + 1) * 12 + STEP_TO_PC[step] + alter
}

function parseTime(attributes, previous) {
  const time = attributes.match(/<time(?:\s[^>]*)?>([\s\S]*?)<\/time>/i)?.[1]
  if (!time) return previous
  const beats = intTag(time, 'beats', { required: true })
  const beatType = intTag(time, 'beat-type', { required: true })
  if (beats <= 0 || beatType <= 0) throw new Error('MUSICXML_INVALID_TIME_SIGNATURE')
  return Object.freeze({ beats, beatType })
}

function measureNumber(attrs, fallback) {
  const raw = attrs.match(/\bnumber="([^"]+)"/i)?.[1]
  return raw && raw.trim() ? raw.trim() : String(fallback)
}

function isImplicit(attrs) {
  return /\bimplicit="yes"/i.test(attrs)
}

export function parseBoundedMusicXmlScoreGraph(input, { sourceId = 'musicxml-source', includeRests = true } = {}) {
  const { text, bytes } = asXml(input)
  if (!/<score-partwise\b/i.test(text)) throw new Error('MUSICXML_SCORE_PARTWISE_REQUIRED')
  if (/<score-timewise\b/i.test(text)) throw new Error('MUSICXML_SCORE_TIMEWISE_UNSUPPORTED')
  if (/<transpose\b/i.test(text)) {
    const chromatic = intTag(text.match(/<transpose(?:\s[^>]*)?>([\s\S]*?)<\/transpose>/i)?.[1] ?? '', 'chromatic', { defaultValue: 0 })
    if (chromatic !== 0) throw new Error('MUSICXML_TRANSPOSITION_UNSUPPORTED')
  }

  const parts = [...text.matchAll(/<part\b[^>]*>([\s\S]*?)<\/part>/gi)]
  if (parts.length !== 1) throw new Error('MUSICXML_EXACTLY_ONE_PART_REQUIRED')

  const measures = []
  const events = []
  let divisions = null
  let time = null
  let serial = 0
  const partBody = parts[0][1]
  const measureMatches = [...partBody.matchAll(/<measure\b([^>]*)>([\s\S]*?)<\/measure>/gi)]
  if (!measureMatches.length) throw new Error('MUSICXML_MEASURE_REQUIRED')

  for (let index = 0; index < measureMatches.length; index += 1) {
    const attrs = measureMatches[index][1]
    const body = measureMatches[index][2]
    const key = `m${measureNumber(attrs, index + 1)}`
    const tokens = [...body.matchAll(/<(attributes|note|backup|forward)\b[^>]*>[\s\S]*?<\/\1>/gi)]
    let cursorDivisions = 0
    let previousOnsetDivisions = null

    for (const tokenMatch of tokens) {
      const kind = tokenMatch[1].toLowerCase()
      const block = tokenMatch[0]
      if (kind === 'attributes') {
        const nextDivisions = intTag(block, 'divisions', { defaultValue: divisions })
        if (nextDivisions != null) {
          if (nextDivisions <= 0) throw new Error('MUSICXML_INVALID_DIVISIONS')
          divisions = nextDivisions
        }
        time = parseTime(block, time)
        continue
      }
      if (!divisions) throw new Error('MUSICXML_DIVISIONS_REQUIRED_BEFORE_TIMED_EVENT')
      if (!time) throw new Error('MUSICXML_TIME_SIGNATURE_REQUIRED_BEFORE_TIMED_EVENT')

      if (kind === 'backup' || kind === 'forward') {
        const duration = intTag(block, 'duration', { required: true })
        if (duration < 0) throw new Error('MUSICXML_NEGATIVE_DURATION_UNSUPPORTED')
        cursorDivisions += kind === 'backup' ? -duration : duration
        if (cursorDivisions < 0) throw new Error('MUSICXML_BACKUP_BEFORE_MEASURE_START')
        previousOnsetDivisions = null
        continue
      }

      const chord = /<chord(?:\s[^>]*)?\s*\/>/i.test(block)
      const grace = /<grace(?:\s[^>]*)?\s*\/>/i.test(block)
      const durationDivisions = intTag(block, 'duration', { defaultValue: grace ? 0 : null })
      if (durationDivisions == null) throw new Error('MUSICXML_NOTE_DURATION_REQUIRED')
      if (durationDivisions < 0) throw new Error('MUSICXML_NEGATIVE_DURATION_UNSUPPORTED')
      const onsetDivisions = chord ? previousOnsetDivisions : cursorDivisions
      if (onsetDivisions == null) throw new Error('MUSICXML_CHORD_WITHOUT_LEADING_NOTE')
      const isRest = /<rest(?:\s[^>]*)?\s*\/>/i.test(block) || /<rest(?:\s[^>]*)?>/i.test(block)
      const voice = intTag(block, 'voice', { defaultValue: 1 })
      const staff = intTag(block, 'staff', { defaultValue: 1 })
      if (voice < 1 || staff < 1) throw new Error('MUSICXML_INVALID_VOICE_OR_STAFF')
      const event = createScoreEvent({
        id: `${sourceId}:m${index + 1}:e${++serial}`,
        measureKey: key,
        onset: onsetDivisions / divisions,
        duration: durationDivisions / divisions,
        voice,
        staff,
        pitch: pitchFromNote(block),
        isRest,
        isChordTone: chord,
        metadata: Object.freeze({
          musicXmlMeasureNumber: measureNumber(attrs, index + 1),
          tieStart: /<tie\b[^>]*type="start"/i.test(block),
          tieStop: /<tie\b[^>]*type="stop"/i.test(block),
          grace,
        }),
      })
      if (includeRests || !isRest) events.push(event)
      previousOnsetDivisions = onsetDivisions
      if (!chord) cursorDivisions += durationDivisions
    }

    if (!time) throw new Error('MUSICXML_TIME_SIGNATURE_REQUIRED')
    measures.push(createMeasure({
      key,
      beats: time.beats,
      beatType: time.beatType,
      implicit: isImplicit(attrs),
      pickup: isImplicit(attrs) && cursorDivisions / divisions < time.beats * (4 / time.beatType),
    }))
  }

  return Object.freeze({
    ok: true,
    sha256: sha256(bytes),
    sourceId,
    scoreGraph: createScoreGraph({ sourceId, measures, events }),
    summary: Object.freeze({
      measureCount: measures.length,
      eventCount: events.length,
      pitchedNoteCount: events.filter((event) => !event.isRest).length,
      restCount: events.filter((event) => event.isRest).length,
      voices: Object.freeze([...new Set(events.map((event) => event.voice))].sort((a, b) => a - b)),
      staves: Object.freeze([...new Set(events.map((event) => event.staff))].sort((a, b) => a - b)),
    }),
    authority: 'CANONICALIZATION_ONLY',
    automaticCorrectionAuthority: false,
  })
}
