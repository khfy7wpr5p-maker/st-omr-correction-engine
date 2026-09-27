import {
  SEMANTIC_CONSISTENCY_DIAGNOSTIC as CODE,
  SEMANTIC_CONSISTENCY_STATUS as STATUS,
} from './semanticConsistencyContract.js'
import { analyzeSemanticConsistencyProfile } from './semanticReference.js'

const ORDER = Object.freeze([
  CODE.PROFILE_UNSUPPORTED,
  CODE.REFERENCE,
  CODE.PART_COUNT_MISMATCH,
  CODE.MEASURE_COUNT_MISMATCH,
  CODE.NOTE_COUNT_MISMATCH,
  CODE.PITCH_MISMATCH,
  CODE.ONSET_MISMATCH,
  CODE.DURATION_MISMATCH,
  CODE.VOICE_MISMATCH,
  CODE.STAFF_MISMATCH,
  CODE.TIE_ROLE_MISMATCH,
  CODE.METER_MISMATCH,
])

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function diagnostic(code, message, location = null) {
  return deepFreeze({ code, message, location })
}

function unsupported(message) {
  return deepFreeze({
    status: STATUS.UNSUPPORTED,
    diagnostics: [diagnostic(CODE.PROFILE_UNSUPPORTED, message)],
  })
}

function sortedDiagnostics(items) {
  const order = new Map(ORDER.map((code, index) => [code, index]))
  return [...items].sort((a, b) =>
    (order.get(a.code) ?? 999) - (order.get(b.code) ?? 999)
    || JSON.stringify(a.location).localeCompare(JSON.stringify(b.location))
    || a.message.localeCompare(b.message)
  )
}

function semanticMeasureTimeline(reference) {
  const { semanticSnapshot: snapshot, provenance } = reference
  const divisions = provenance.divisionsPerQuarter
  const contexts = [...snapshot.time_signatures].sort((a, b) =>
    a.onset_div - b.onset_div
    || a.part_id.localeCompare(b.part_id)
  )
  if (contexts.length === 0 || contexts[0].onset_div !== 0) return null
  if (new Set(contexts.map((item) => item.part_id)).size !== 1) return null

  const starts = []
  const meters = []
  let active = null
  let cursor = 0
  let contextIndex = 0

  for (let measureIndex = 0; measureIndex < snapshot.measure_count; measureIndex += 1) {
    let contextsAtStart = 0
    while (contextIndex < contexts.length && contexts[contextIndex].onset_div === cursor) {
      active = contexts[contextIndex]
      contextsAtStart += 1
      contextIndex += 1
    }
    if (contextsAtStart > 1 || active === null) return null
    if (contexts[contextIndex] && contexts[contextIndex].onset_div < cursor) return null

    const numerator = active.beats * 4 * divisions
    if (!Number.isSafeInteger(numerator) || numerator % active.beat_type !== 0) return null
    const durationDiv = numerator / active.beat_type
    if (!Number.isSafeInteger(durationDiv) || durationDiv <= 0) return null

    const next = cursor + durationDiv
    if (contexts[contextIndex] && contexts[contextIndex].onset_div > cursor
      && contexts[contextIndex].onset_div < next) return null

    starts.push(cursor)
    meters.push(deepFreeze({
      measureIndex,
      beats: active.beats,
      beatType: active.beat_type,
    }))
    cursor = next
  }

  if (contextIndex !== contexts.length) return null
  return deepFreeze({ starts, meters, endDiv: cursor })
}

function scoreNumberToDivisions(value, divisions) {
  if (!Number.isFinite(value) || value < 0) return null
  const scaled = value * divisions
  if (!Number.isFinite(scaled)) return null
  const integer = Math.round(scaled)
  if (!Number.isSafeInteger(integer)) return null
  if (integer / divisions !== value) return null
  return integer
}

function semanticNotes(reference, timeline) {
  const { semanticSnapshot: snapshot, provenance } = reference
  const notes = []
  for (const note of snapshot.notes) {
    const start = timeline.starts[note.measure_index]
    const nextStart = note.measure_index + 1 < timeline.starts.length
      ? timeline.starts[note.measure_index + 1]
      : timeline.endDiv
    if (start === undefined || note.onset_div < start || note.onset_div > nextStart) return null
    if (note.onset_div + note.duration_div > nextStart) return null
    notes.push({
      measureIndex: note.measure_index,
      staff: note.staff,
      voice: note.voice,
      onsetDiv: note.onset_div - start,
      durationDiv: note.duration_div,
      pitch: note.pitch_midi,
      occurrenceOrdinal: 1,
      tieStart: note.tie_next !== null,
      tieStop: note.tie_prev !== null,
      sourceId: note.source_id,
      divisionsPerQuarter: provenance.divisionsPerQuarter,
    })
  }
  return notes
}

function scoreNotes(scoreGraph, divisions) {
  const measureIndex = new Map(scoreGraph.measures.map((measure, index) => [measure.key, index]))
  const notes = []
  for (const event of scoreGraph.events) {
    if (event.isRest) continue
    const index = measureIndex.get(event.measureKey)
    const onsetDiv = scoreNumberToDivisions(event.onset, divisions)
    const durationDiv = scoreNumberToDivisions(event.duration, divisions)
    if (index === undefined || onsetDiv === null || durationDiv === null) return null
    if (!Number.isInteger(event.pitch) || event.pitch < 0 || event.pitch > 127) return null
    if (!Number.isInteger(event.voice) || event.voice <= 0) return null
    if (!Number.isInteger(event.staff) || event.staff <= 0) return null
    notes.push({
      measureIndex: index,
      staff: event.staff,
      voice: event.voice,
      onsetDiv,
      durationDiv,
      pitch: event.pitch,
      occurrenceOrdinal: 1,
      tieStart: event.metadata?.tieStart === true,
      tieStop: event.metadata?.tieStop === true,
      eventId: event.id,
    })
  }
  return notes
}

function structuralKey(note) {
  return [
    note.measureIndex,
    note.staff,
    note.voice,
    note.onsetDiv,
    note.pitch,
  ].join(':')
}

function duplicateStructuralKey(notes) {
  const seen = new Set()
  for (const note of notes) {
    const key = structuralKey(note)
    if (seen.has(key)) return key
    seen.add(key)
  }
  return null
}

function identityDiff(left, right) {
  if (left.measureIndex !== right.measureIndex) return ['measure']
  const diffs = []
  if (left.staff !== right.staff) diffs.push('staff')
  if (left.voice !== right.voice) diffs.push('voice')
  if (left.onsetDiv !== right.onsetDiv) diffs.push('onset')
  if (left.pitch !== right.pitch) diffs.push('pitch')
  return diffs
}

const FIELD_CODE = Object.freeze({
  pitch: CODE.PITCH_MISMATCH,
  onset: CODE.ONSET_MISMATCH,
  voice: CODE.VOICE_MISMATCH,
  staff: CODE.STAFF_MISMATCH,
})

function pairNotes(score, semantic) {
  const pairs = []
  const scoreUsed = new Set()
  const semanticUsed = new Set()
  const scoreByKey = new Map(score.map((note, index) => [structuralKey(note), { note, index }]))

  for (let semanticIndex = 0; semanticIndex < semantic.length; semanticIndex += 1) {
    const target = semantic[semanticIndex]
    const match = scoreByKey.get(structuralKey(target))
    if (!match || scoreUsed.has(match.index)) continue
    scoreUsed.add(match.index)
    semanticUsed.add(semanticIndex)
    pairs.push({ score: match.note, semantic: target, mismatch: null })
  }

  const unmatchedScore = score
    .map((note, index) => ({ note, index }))
    .filter((item) => !scoreUsed.has(item.index))
  const unmatchedSemantic = semantic
    .map((note, index) => ({ note, index }))
    .filter((item) => !semanticUsed.has(item.index))

  const possible = new Map()
  const scoreClaimCount = new Map()
  for (const semanticItem of unmatchedSemantic) {
    const candidates = unmatchedScore
      .map((scoreItem) => ({
        scoreItem,
        diffs: identityDiff(scoreItem.note, semanticItem.note),
      }))
      .filter((item) => item.diffs.length === 1 && FIELD_CODE[item.diffs[0]])
    possible.set(semanticItem.index, candidates)
    for (const candidate of candidates) {
      scoreClaimCount.set(candidate.scoreItem.index, (scoreClaimCount.get(candidate.scoreItem.index) ?? 0) + 1)
    }
  }

  for (const semanticItem of unmatchedSemantic) {
    const candidates = possible.get(semanticItem.index) ?? []
    if (candidates.length > 1) return { unsupported: true, pairs, unmatchedScore, unmatchedSemantic }
    if (candidates.length !== 1) continue
    const candidate = candidates[0]
    if ((scoreClaimCount.get(candidate.scoreItem.index) ?? 0) !== 1) {
      return { unsupported: true, pairs, unmatchedScore, unmatchedSemantic }
    }
    scoreUsed.add(candidate.scoreItem.index)
    semanticUsed.add(semanticItem.index)
    pairs.push({
      score: candidate.scoreItem.note,
      semantic: semanticItem.note,
      mismatch: FIELD_CODE[candidate.diffs[0]],
    })
  }

  return {
    unsupported: false,
    pairs,
    unmatchedScore: score.map((note, index) => ({ note, index })).filter((item) => !scoreUsed.has(item.index)),
    unmatchedSemantic: semantic.map((note, index) => ({ note, index })).filter((item) => !semanticUsed.has(item.index)),
  }
}

export function compareScoreGraphWithSemanticReference({ scoreGraph, reference }) {
  if (!scoreGraph || !Array.isArray(scoreGraph.measures) || !Array.isArray(scoreGraph.events)) {
    return unsupported('A valid ScoreGraph is required.')
  }

  const profile = analyzeSemanticConsistencyProfile(reference)
  if (profile.status === STATUS.UNSUPPORTED) return profile

  const timeline = semanticMeasureTimeline(reference)
  if (timeline === null) return unsupported('Semantic measure timeline is ambiguous or unsupported.')

  const semantic = semanticNotes(reference, timeline)
  const score = scoreNotes(scoreGraph, reference.provenance.divisionsPerQuarter)
  if (semantic === null || score === null) return unsupported('Score/note timing is outside the admitted SEM-05 profile.')

  if (duplicateStructuralKey(semantic) !== null || duplicateStructuralKey(score) !== null) {
    return unsupported('Indistinguishable duplicate unison coordinates are outside SEM-05.')
  }

  const diagnostics = []
  if (scoreGraph.measures.length !== reference.semanticSnapshot.measure_count) {
    diagnostics.push(diagnostic(
      CODE.MEASURE_COUNT_MISMATCH,
      'ScoreGraph and semantic reference measure counts differ.'
    ))
  }
  if (score.length !== semantic.length) {
    diagnostics.push(diagnostic(
      CODE.NOTE_COUNT_MISMATCH,
      'ScoreGraph and semantic reference pitched-note counts differ.'
    ))
  }

  for (let i = 0; i < Math.min(scoreGraph.measures.length, timeline.meters.length); i += 1) {
    const measure = scoreGraph.measures[i]
    const meter = timeline.meters[i]
    if (!Number.isInteger(measure.beats) || !Number.isInteger(measure.beatType)
      || measure.beats <= 0 || measure.beatType <= 0) {
      return unsupported('Non-integer ScoreGraph meter is outside SEM-05.')
    }
    if (measure.beats !== meter.beats || measure.beatType !== meter.beatType) {
      diagnostics.push(diagnostic(
        CODE.METER_MISMATCH,
        `Meter differs at measure ${i}.`,
        { measureIndex: i }
      ))
    }
  }

  const pairing = pairNotes(score, semantic)
  if (pairing.unsupported) return unsupported('Ambiguous structural fallback pairing is outside SEM-05.')

  for (const pair of pairing.pairs) {
    const location = {
      measureIndex: pair.semantic.measureIndex,
      staff: pair.semantic.staff,
      voice: pair.semantic.voice,
      pitch: pair.semantic.pitch,
    }
    if (pair.mismatch !== null) {
      diagnostics.push(diagnostic(pair.mismatch, 'Structural note field differs.', location))
    }
    if (pair.score.durationDiv !== pair.semantic.durationDiv) {
      diagnostics.push(diagnostic(CODE.DURATION_MISMATCH, 'Note duration differs.', location))
    }
    if (pair.score.tieStart !== pair.semantic.tieStart || pair.score.tieStop !== pair.semantic.tieStop) {
      diagnostics.push(diagnostic(CODE.TIE_ROLE_MISMATCH, 'Tie boundary role differs.', location))
    }
  }

  if (pairing.unmatchedScore.length > 0 || pairing.unmatchedSemantic.length > 0) {
    if (!diagnostics.some((item) => item.code === CODE.NOTE_COUNT_MISMATCH)) {
      diagnostics.push(diagnostic(
        CODE.NOTE_COUNT_MISMATCH,
        'ScoreGraph and semantic reference note structures cannot be paired uniquely.'
      ))
    }
  }

  for (const item of reference.semanticSnapshot.diagnostics) {
    diagnostics.push(diagnostic(
      CODE.REFERENCE,
      `Semantic reference diagnostic: ${item.code}`,
      item.source_id === null ? null : { sourceId: item.source_id }
    ))
  }

  const ordered = sortedDiagnostics(diagnostics)
  return deepFreeze({
    status: ordered.length === 0 ? STATUS.PASS : STATUS.MISMATCH,
    diagnostics: ordered,
  })
}
