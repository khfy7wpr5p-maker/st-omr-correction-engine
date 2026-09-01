import { createHash } from 'node:crypto'
import { createMeasure } from '../../src/model/measure.js'
import { createScoreEvent } from '../../src/model/scoreEvent.js'
import { createScoreGraph } from '../../src/model/scoreGraph.js'

export const AUDIVERIS_MUSICXML_IMPORTER_VERSION = 'audiveris-musicxml-scoregraph-v1'

const STEP = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function decodeXmlText(value) {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, entity) => {
    if (entity === 'amp') return '&'
    if (entity === 'lt') return '<'
    if (entity === 'gt') return '>'
    if (entity === 'quot') return '"'
    if (entity === 'apos') return "'"
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
  }).replace(/&[^;\s]+;/g, (entity) => {
    throw new TypeError(`Unsupported XML entity: ${entity}`)
  })
}

function parseAttributes(raw) {
  const attrs = {}
  let index = 0
  while (index < raw.length) {
    while (index < raw.length && /\s/.test(raw[index])) index += 1
    if (index >= raw.length) break
    const nameMatch = /^[A-Za-z_][A-Za-z0-9_.:-]*/.exec(raw.slice(index))
    if (!nameMatch) throw new TypeError(`Malformed XML attribute near: ${raw.slice(index, index + 40)}`)
    const name = nameMatch[0]
    index += name.length
    while (index < raw.length && /\s/.test(raw[index])) index += 1
    if (raw[index] !== '=') throw new TypeError(`Missing '=' after XML attribute ${name}.`)
    index += 1
    while (index < raw.length && /\s/.test(raw[index])) index += 1
    const quote = raw[index]
    if (quote !== '"' && quote !== "'") throw new TypeError(`XML attribute ${name} must be quoted.`)
    index += 1
    const end = raw.indexOf(quote, index)
    if (end < 0) throw new TypeError(`Unterminated XML attribute ${name}.`)
    attrs[name] = decodeXmlText(raw.slice(index, end))
    index = end + 1
  }
  return Object.freeze(attrs)
}

function findTagEnd(xml, start) {
  let quote = null
  for (let index = start + 1; index < xml.length; index += 1) {
    const character = xml[index]
    if (quote) {
      if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (character === '>') return index
  }
  return -1
}

function parseXmlBounded(xml) {
  if (typeof xml !== 'string' || !xml.trim()) throw new TypeError('MusicXML source must be a non-empty UTF-8 string.')
  const stack = []
  let documentRoot = null
  let index = 0

  while (index < xml.length) {
    if (xml[index] !== '<') {
      const next = xml.indexOf('<', index)
      const end = next < 0 ? xml.length : next
      const text = decodeXmlText(xml.slice(index, end))
      if (stack.length) stack.at(-1).text += text
      else if (text.trim()) throw new TypeError('Text outside XML root is unsupported.')
      index = end
      continue
    }
    if (xml.startsWith('<!--', index)) {
      const end = xml.indexOf('-->', index + 4)
      if (end < 0) throw new TypeError('Unterminated XML comment.')
      index = end + 3
      continue
    }
    if (xml.startsWith('<?', index)) {
      const end = xml.indexOf('?>', index + 2)
      if (end < 0) throw new TypeError('Unterminated XML processing instruction.')
      index = end + 2
      continue
    }
    if (xml.startsWith('<![CDATA[', index)) {
      const end = xml.indexOf(']]>', index + 9)
      if (end < 0 || !stack.length) throw new TypeError('Invalid CDATA section.')
      stack.at(-1).text += xml.slice(index + 9, end)
      index = end + 3
      continue
    }
    if (xml.startsWith('<!DOCTYPE', index)) {
      let end = index + 9
      let quote = null
      let subsetDepth = 0
      for (; end < xml.length; end += 1) {
        const character = xml[end]
        if (quote) {
          if (character === quote) quote = null
          continue
        }
        if (character === '"' || character === "'") quote = character
        else if (character === '[') subsetDepth += 1
        else if (character === ']') subsetDepth -= 1
        else if (character === '>' && subsetDepth === 0) break
      }
      if (end >= xml.length) throw new TypeError('Unterminated DOCTYPE.')
      if (xml.slice(index, end + 1).includes('[')) throw new TypeError('Internal DOCTYPE subsets are unsupported.')
      index = end + 1
      continue
    }
    if (xml.startsWith('<!', index)) throw new TypeError('Unsupported XML declaration.')

    const end = findTagEnd(xml, index)
    if (end < 0) throw new TypeError('Unterminated XML tag.')
    let raw = xml.slice(index + 1, end).trim()
    if (!raw) throw new TypeError('Empty XML tag.')

    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim()
      const node = stack.pop()
      if (!node || node.name !== name) throw new TypeError(`Mismatched XML closing tag: ${name}.`)
      if (!stack.length) {
        if (documentRoot) throw new TypeError('Multiple XML roots are unsupported.')
        documentRoot = node
      }
      index = end + 1
      continue
    }

    const selfClosing = raw.endsWith('/')
    if (selfClosing) raw = raw.slice(0, -1).trim()
    const nameMatch = /^[A-Za-z_][A-Za-z0-9_.:-]*/.exec(raw)
    if (!nameMatch) throw new TypeError(`Malformed XML tag: ${raw.slice(0, 60)}`)
    const name = nameMatch[0]
    if (name.includes(':')) throw new TypeError(`Namespaced MusicXML tag is unsupported: ${name}`)
    const node = { name, attrs: parseAttributes(raw.slice(name.length)), children: [], text: '' }
    if (stack.length) stack.at(-1).children.push(node)
    if (selfClosing) {
      if (!stack.length) {
        if (documentRoot) throw new TypeError('Multiple XML roots are unsupported.')
        documentRoot = node
      }
    } else stack.push(node)
    index = end + 1
  }

  if (stack.length) throw new TypeError(`Unclosed XML tag: ${stack.at(-1).name}`)
  if (!documentRoot) throw new TypeError('XML root is required.')
  return documentRoot
}

function children(node, name) {
  return node.children.filter((entry) => entry.name === name)
}

function child(node, name) {
  return node.children.find((entry) => entry.name === name) ?? null
}

function value(node, name) {
  const found = child(node, name)
  return found ? found.text.trim() : null
}

function positiveIntegerText(text, name) {
  if (!/^\d+$/.test(text ?? '')) throw new TypeError(`${name} must be a positive integer.`)
  const number = Number(text)
  if (!Number.isSafeInteger(number) || number < 1) throw new TypeError(`${name} must be a positive integer.`)
  return number
}

function durationQuarter(node, divisions, name) {
  if (!Number.isInteger(divisions) || divisions < 1) throw new TypeError('MusicXML divisions must be known before timed events.')
  return positiveIntegerText(value(node, 'duration'), `${name}.duration`) / divisions
}

function parsePitch(note) {
  const pitch = child(note, 'pitch')
  if (!pitch) return null
  const step = value(pitch, 'step')
  if (!Object.hasOwn(STEP, step)) throw new TypeError(`Unsupported MusicXML pitch step: ${step}`)
  const octaveText = value(pitch, 'octave')
  if (!/^-?\d+$/.test(octaveText ?? '')) throw new TypeError('MusicXML pitch octave must be an integer.')
  const octave = Number(octaveText)
  const alterText = value(pitch, 'alter')
  const alter = alterText == null ? 0 : Number(alterText)
  if (!Number.isFinite(alter) || !Number.isInteger(alter)) throw new TypeError('Microtonal MusicXML alter is unsupported in v1 importer.')
  const midi = 12 * (octave + 1) + STEP[step] + alter
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new TypeError(`MusicXML pitch is outside MIDI range: ${midi}`)
  return midi
}

function stableGraphPayload(scoreGraph) {
  return {
    sourceId: scoreGraph.sourceId,
    measures: scoreGraph.measures.map((measure) => ({
      key: measure.key,
      beats: measure.beats,
      beatType: measure.beatType,
      expectedQuarterBeats: measure.expectedQuarterBeats,
      implicit: measure.implicit,
      pickup: measure.pickup,
    })),
    events: scoreGraph.events.map((event) => ({
      id: event.id,
      measureKey: event.measureKey,
      onset: event.onset,
      duration: event.duration,
      end: event.end,
      voice: event.voice,
      staff: event.staff,
      pitch: event.pitch,
      isRest: event.isRest,
      isChordTone: event.isChordTone,
      metadata: event.metadata,
    })),
  }
}

export function importAudiverisMusicXml(input, { sourceId, expectedSourceSha256 = null } = {}) {
  if (typeof sourceId !== 'string' || !sourceId.trim()) throw new TypeError('sourceId is required.')
  const sourceBytes = Buffer.isBuffer(input) ? Buffer.from(input) : Buffer.from(String(input), 'utf8')
  const sourceSha256 = sha256(sourceBytes)
  if (expectedSourceSha256 != null && sourceSha256 !== expectedSourceSha256) {
    return Object.freeze({ ok: false, reason: 'SOURCE_HASH_MISMATCH', sourceSha256 })
  }

  let root
  try {
    root = parseXmlBounded(sourceBytes.toString('utf8'))
  } catch (error) {
    return Object.freeze({ ok: false, reason: 'INVALID_OR_UNSUPPORTED_XML', details: error.message, sourceSha256 })
  }
  if (root.name !== 'score-partwise') return Object.freeze({ ok: false, reason: 'UNSUPPORTED_MUSICXML_ROOT', sourceSha256 })
  if (root.attrs.version !== '4.0.3') return Object.freeze({ ok: false, reason: 'UNSUPPORTED_MUSICXML_VERSION', details: root.attrs.version ?? null, sourceSha256 })

  const parts = children(root, 'part')
  if (parts.length !== 1) return Object.freeze({ ok: false, reason: 'UNSUPPORTED_MULTIPART_SCORE', details: parts.length, sourceSha256 })
  const part = parts[0]
  const partId = part.attrs.id ?? null
  if (!partId) return Object.freeze({ ok: false, reason: 'PART_ID_REQUIRED', sourceSha256 })

  const unsupportedTags = new Set(['grace', 'time-modification', 'transpose'])
  const scan = [root]
  while (scan.length) {
    const node = scan.pop()
    if (unsupportedTags.has(node.name)) {
      return Object.freeze({ ok: false, reason: `UNSUPPORTED_${node.name.toUpperCase().replace('-', '_')}`, sourceSha256 })
    }
    scan.push(...node.children)
  }

  const measures = []
  const events = []
  const warnings = []
  const measureKeys = new Set()
  let divisions = null
  let beats = null
  let beatType = null
  let eventOrdinal = 0

  for (const measureNode of children(part, 'measure')) {
    const measureKey = measureNode.attrs.number
    if (typeof measureKey !== 'string' || !measureKey.trim() || measureKeys.has(measureKey)) {
      return Object.freeze({ ok: false, reason: 'MEASURE_KEY_INVALID_OR_DUPLICATE', details: measureKey ?? null, sourceSha256 })
    }
    measureKeys.add(measureKey)
    const implicit = measureNode.attrs.implicit === 'yes'
    let cursor = 0
    let lastNoteOnset = null
    let maxEnd = 0
    let measureBeats = beats
    let measureBeatType = beatType

    for (const node of measureNode.children) {
      if (node.name === 'attributes') {
        const divisionsText = value(node, 'divisions')
        if (divisionsText != null) divisions = positiveIntegerText(divisionsText, 'attributes.divisions')
        const time = child(node, 'time')
        if (time) {
          measureBeats = positiveIntegerText(value(time, 'beats'), 'time.beats')
          measureBeatType = positiveIntegerText(value(time, 'beat-type'), 'time.beat-type')
          beats = measureBeats
          beatType = measureBeatType
        }
        continue
      }

      if (node.name === 'backup' || node.name === 'forward') {
        let amount
        try {
          amount = durationQuarter(node, divisions, node.name)
        } catch (error) {
          return Object.freeze({ ok: false, reason: 'INVALID_TIMING', details: error.message, sourceSha256 })
        }
        cursor += node.name === 'forward' ? amount : -amount
        if (cursor < -1e-9) return Object.freeze({ ok: false, reason: 'NEGATIVE_MEASURE_CURSOR', details: { measureKey, cursor }, sourceSha256 })
        if (Math.abs(cursor) < 1e-12) cursor = 0
        continue
      }

      if (node.name !== 'note') continue
      if (child(node, 'cue')) return Object.freeze({ ok: false, reason: 'UNSUPPORTED_CUE_NOTE', details: measureKey, sourceSha256 })

      let duration
      try {
        duration = durationQuarter(node, divisions, 'note')
      } catch (error) {
        return Object.freeze({ ok: false, reason: 'INVALID_NOTE_DURATION', details: error.message, sourceSha256 })
      }
      const chord = child(node, 'chord') != null
      if (chord && lastNoteOnset == null) return Object.freeze({ ok: false, reason: 'CHORD_WITHOUT_LEADER', details: measureKey, sourceSha256 })
      const onset = chord ? lastNoteOnset : cursor

      let voice
      let staff
      try {
        voice = value(node, 'voice') == null ? 1 : positiveIntegerText(value(node, 'voice'), 'note.voice')
        staff = value(node, 'staff') == null ? 1 : positiveIntegerText(value(node, 'staff'), 'note.staff')
      } catch (error) {
        return Object.freeze({ ok: false, reason: 'INVALID_VOICE_OR_STAFF', details: error.message, sourceSha256 })
      }

      const rest = child(node, 'rest') != null
      let pitch = null
      try {
        pitch = rest ? null : parsePitch(node)
      } catch (error) {
        return Object.freeze({ ok: false, reason: 'INVALID_PITCH', details: error.message, sourceSha256 })
      }
      if (!rest && pitch == null) return Object.freeze({ ok: false, reason: 'PITCH_OR_REST_REQUIRED', details: measureKey, sourceSha256 })

      const tieTypes = children(node, 'tie').map((tie) => tie.attrs.type).filter(Boolean)
      if (tieTypes.some((type) => type !== 'start' && type !== 'stop')) {
        return Object.freeze({ ok: false, reason: 'UNSUPPORTED_TIE_TYPE', details: tieTypes, sourceSha256 })
      }

      eventOrdinal += 1
      const event = createScoreEvent({
        id: `${sourceId}:m${measureKey}:e${eventOrdinal}`,
        measureKey,
        onset,
        duration,
        voice,
        staff,
        pitch,
        isRest: rest,
        isChordTone: chord,
        metadata: Object.freeze({
          sourceFormat: 'MUSICXML',
          importerVersion: AUDIVERIS_MUSICXML_IMPORTER_VERSION,
          partId,
          sourceOrder: eventOrdinal,
          tieTypes: Object.freeze(tieTypes),
          pitchDomain: 'WRITTEN',
        }),
      })
      events.push(event)
      maxEnd = Math.max(maxEnd, event.end)
      if (!chord) {
        lastNoteOnset = onset
        cursor += duration
      }
    }

    if (!Number.isInteger(measureBeats) || !Number.isInteger(measureBeatType)) {
      return Object.freeze({ ok: false, reason: 'TIME_SIGNATURE_REQUIRED', details: measureKey, sourceSha256 })
    }
    const measure = createMeasure({ key: measureKey, beats: measureBeats, beatType: measureBeatType, implicit, pickup: implicit })
    measures.push(measure)
    if (!implicit && maxEnd > measure.expectedQuarterBeats + 1e-9) {
      warnings.push(Object.freeze({ code: 'MEASURE_EVENT_OVERFLOW', measureKey, expectedQuarterBeats: measure.expectedQuarterBeats, maxEventEnd: maxEnd }))
    }
    if (!implicit && maxEnd < measure.expectedQuarterBeats - 1e-9) {
      warnings.push(Object.freeze({ code: 'MEASURE_EVENT_UNDERFILL', measureKey, expectedQuarterBeats: measure.expectedQuarterBeats, maxEventEnd: maxEnd }))
    }
  }

  const scoreGraph = createScoreGraph({ sourceId, measures, events })
  const canonicalGraphSha256 = sha256(Buffer.from(JSON.stringify(stableGraphPayload(scoreGraph)), 'utf8'))
  if (sha256(sourceBytes) !== sourceSha256) throw new Error('MusicXML source mutation invariant violated.')

  return Object.freeze({
    ok: true,
    scoreGraph,
    identity: Object.freeze({
      origin: 'OMR_CANONICAL',
      sourceId,
      revisionId: AUDIVERIS_MUSICXML_IMPORTER_VERSION,
      sha256: canonicalGraphSha256,
      sourceSha256,
      provenanceVerified: true,
    }),
    benchmarkInput: Object.freeze({ scoreGraph }),
    sourceSha256,
    canonicalGraphSha256,
    sourceByteLength: sourceBytes.length,
    warnings: Object.freeze(warnings),
    automaticCorrectionAuthority: false,
  })
}
