import { CORRECTION_STATUS } from '../../src/contracts/status.js'
import { createScoreEvent } from '../../src/model/scoreEvent.js'
import { createScoreGraph } from '../../src/model/scoreGraph.js'
import { analyzeSesliTabShadow } from './shadowAdapter.js'

const ONSET_EPSILON = 1e-9
const ALLOWED_INSTRUMENT_PROFILES = new Set(['generic', 'classical-guitar', 'piano'])
const BEAM_ERROR_CODES = new Set([
  'INVALID_BEAM_VALUE',
  'BEAM_WITHOUT_BEGIN',
  'BEAM_RESTARTED',
  'UNCLOSED_BEAM_GROUP',
])

export const SESLITAB_SHADOW_VOICE_FINDING_CODES = Object.freeze([
  'VOICE_OVERLAP',
])

function freezeArray(values) {
  return Object.freeze([...values])
}

function eventIdFor(sourceRevisionId, measureKey, sequenceIndex) {
  return `seslitab:${encodeURIComponent(sourceRevisionId)}:${encodeURIComponent(measureKey)}:seq:${sequenceIndex}`
}

function blocked({ sourceRevisionId, sourceNotes, code, details = null }) {
  return Object.freeze({
    mode: 'shadow-evidence-bridge',
    status: CORRECTION_STATUS.BLOCKED,
    code,
    sourceRevisionId,
    sourceNotes,
    scoreGraph: null,
    reverseMap: Object.freeze({}),
    analyses: Object.freeze([]),
    ignoredFindings: Object.freeze([]),
    details,
  })
}

function validatorWeight(finding) {
  if (finding?.severity === 'error') return 0.7
  if (finding?.severity === 'warning') return 0.5
  return 0.4
}

function normalizeFinding(finding, descriptor) {
  return Object.freeze({
    code: finding.code,
    weight: validatorWeight(finding),
    location: Object.freeze({
      partId: finding.partId ?? descriptor.partId ?? null,
      measureKey: descriptor.measureKey,
      measureNumber: finding.measureNumber ?? descriptor.measureNumber ?? null,
      measureIndex: Number.isFinite(finding.measureIndex) ? finding.measureIndex : descriptor.measureIndex,
      voice: descriptor.voice,
      staff: descriptor.staff,
      eventId: descriptor.id,
      sourceRevisionId: descriptor.sourceRevisionId,
      noteIndex: descriptor.noteIndex,
      sequenceIndex: descriptor.sequenceIndex,
    }),
    details: Object.freeze({
      classification: finding.classification ?? null,
      severity: finding.severity ?? null,
      expected: finding.expected ?? null,
      actual: finding.actual ?? null,
      message: finding.message ?? null,
    }),
  })
}

function groupByMeasure(entries, keyReader) {
  const groups = new Map()
  for (const entry of entries) {
    const key = keyReader(entry)
    if (typeof key !== 'string' || !key.trim()) return null
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }
  return groups
}

function primaryBeam(entry) {
  if (!Array.isArray(entry?.beam)) return null
  const beam = entry.beam.find((item) => Number(item?.number ?? 1) === 1)
  if (!beam || typeof beam.value !== 'string') return null
  const value = beam.value.trim().toLowerCase()
  if (!['begin', 'continue', 'end'].includes(value)) return null
  return value
}

function validStemDirection(entry) {
  const value = entry?.stemDirection ?? entry?.stem ?? null
  return value === 'up' || value === 'down' ? value : null
}

function assignBeamGroups(descriptors, invalidBeamMeasureKeys) {
  const byMeasure = groupByMeasure(descriptors, (entry) => entry.measureKey)
  if (!byMeasure) return

  for (const [measureKey, measureDescriptors] of byMeasure) {
    if (invalidBeamMeasureKeys.has(measureKey)) continue

    let open = null
    for (const descriptor of measureDescriptors.sort((a, b) => a.sequenceIndex - b.sequenceIndex)) {
      const value = primaryBeam(descriptor.structuralEvidence)
      if (!value) {
        if (open) open = null
        continue
      }

      if (value === 'begin') {
        open = {
          beginSequenceIndex: descriptor.sequenceIndex,
          members: [descriptor],
        }
        continue
      }

      if (!open) continue

      if (value === 'continue') {
        open.members.push(descriptor)
        continue
      }

      open.members.push(descriptor)
      if (open.members.length >= 2) {
        const group = `seslitab-beam:${encodeURIComponent(measureKey)}:1:${open.beginSequenceIndex}`
        for (const member of open.members) member.beamGroup = group
      }
      open = null
    }
  }
}

function measureEntry(key, timelineMeasure, reportByKey) {
  const report = reportByKey.get(key)
  return Object.freeze({
    key,
    expectedQuarterBeats: Number.isFinite(report?.expectedBeats) ? report.expectedBeats : null,
    implicit: Boolean(report?.implicit),
    pickup: Boolean(report?.pickup),
    partId: timelineMeasure.partId ?? null,
    measureIndex: Number.isFinite(timelineMeasure.measureIndex) ? timelineMeasure.measureIndex : null,
  })
}

function buildBridgeGraph({ sourceRevisionId, sourceNotes, structuralResult }) {
  const timelineMeasures = structuralResult?.timeline?.measures
  const noteEvidence = structuralResult?.evidence?.noteEvidence
  if (!Array.isArray(sourceNotes) || !Array.isArray(timelineMeasures) || structuralResult?.evidence?.ok !== true || !Array.isArray(noteEvidence)) {
    return { ok: false, code: 'INVALID_SESLITAB_SHADOW_INPUT' }
  }

  const sourceEntries = sourceNotes.map((note, noteIndex) => ({ note, noteIndex }))
  const notesByMeasure = groupByMeasure(sourceEntries, (entry) => entry.note?.measureKey)
  const evidenceByMeasure = groupByMeasure(noteEvidence, (entry) => entry?.measureKey)
  if (!notesByMeasure || !evidenceByMeasure) return { ok: false, code: 'MISSING_STABLE_MEASURE_IDENTITY' }

  const reportByKey = new Map((structuralResult?.measureReport?.measures || []).map((entry) => [entry.measureKey, entry]))
  const measures = []
  const descriptors = []
  const seenMeasureKeys = new Set()

  for (const timelineMeasure of timelineMeasures) {
    const measureKey = timelineMeasure?.measureKey
    if (typeof measureKey !== 'string' || !measureKey.trim() || seenMeasureKeys.has(measureKey)) {
      return { ok: false, code: 'INVALID_TIMELINE_MEASURE_IDENTITY' }
    }
    seenMeasureKeys.add(measureKey)

    const divisions = timelineMeasure.divisions
    if (!Number.isFinite(divisions) || divisions <= 0) {
      return { ok: false, code: 'INVALID_TIMELINE_DIVISIONS', details: { measureKey } }
    }

    const timelineNotes = [...(timelineMeasure.events || [])]
      .filter((event) => event?.type === 'note')
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    const sourceGroup = notesByMeasure.get(measureKey) || []
    const evidenceGroup = [...(evidenceByMeasure.get(measureKey) || [])]
      .sort((a, b) => a.noteIndex - b.noteIndex)

    if (timelineNotes.length !== sourceGroup.length || sourceGroup.length !== evidenceGroup.length) {
      return {
        ok: false,
        code: 'SESLITAB_NOTE_COUNT_MISMATCH',
        details: { measureKey, source: sourceGroup.length, timeline: timelineNotes.length, evidence: evidenceGroup.length },
      }
    }

    measures.push(measureEntry(measureKey, timelineMeasure, reportByKey))

    for (let ordinal = 0; ordinal < sourceGroup.length; ordinal += 1) {
      const { note, noteIndex } = sourceGroup[ordinal]
      const timelineEvent = timelineNotes[ordinal]
      const structuralEvidence = evidenceGroup[ordinal]

      if (structuralEvidence.noteIndex !== ordinal) {
        return { ok: false, code: 'SESLITAB_EVIDENCE_ORDER_MISMATCH', details: { measureKey, ordinal } }
      }

      const voice = Number(note?.voice ?? 1)
      const staff = Number(note?.staff ?? 1)
      if (!Number.isInteger(voice) || voice < 1 || !Number.isInteger(staff) || staff < 1) {
        return { ok: false, code: 'INVALID_NOTE_VOICE_OR_STAFF', details: { measureKey, noteIndex } }
      }

      if ((timelineEvent.voice ?? 1) !== voice || (timelineEvent.staff ?? 1) !== staff ||
          Boolean(timelineEvent.isChordNote) !== Boolean(note?.isChordNote) ||
          Boolean(timelineEvent.isGrace) !== Boolean(note?.isGrace)) {
        return { ok: false, code: 'SESLITAB_NOTE_IDENTITY_MISMATCH', details: { measureKey, noteIndex } }
      }

      const isGrace = Boolean(timelineEvent.isGrace || note?.isGrace)
      const durationDivisions = Number(timelineEvent.durationDivisions)
      const startDivisions = Number(timelineEvent.startDivisions)
      if (!Number.isFinite(durationDivisions) || durationDivisions < 0 || !Number.isFinite(startDivisions) || startDivisions < 0) {
        return { ok: false, code: 'INVALID_TIMELINE_NOTE_POSITION', details: { measureKey, noteIndex } }
      }
      if (!isGrace && Number.isFinite(note?.durationValue) && note.durationValue !== durationDivisions) {
        return { ok: false, code: 'SESLITAB_NOTE_DURATION_MISMATCH', details: { measureKey, noteIndex } }
      }

      const sequenceIndex = timelineEvent.sequenceIndex
      if (!Number.isInteger(sequenceIndex) || sequenceIndex < 0) {
        return { ok: false, code: 'INVALID_TIMELINE_SEQUENCE_INDEX', details: { measureKey, noteIndex } }
      }

      descriptors.push({
        id: eventIdFor(sourceRevisionId, measureKey, sequenceIndex),
        sourceRevisionId,
        measureKey,
        measureNumber: note?.measureNumber ?? note?.measure ?? timelineMeasure.measureNumber ?? null,
        measureIndex: Number.isFinite(note?.measureIndex) ? note.measureIndex : timelineMeasure.measureIndex ?? null,
        partId: note?.partId ?? timelineMeasure.partId ?? null,
        noteIndex,
        noteOrdinal: ordinal,
        sequenceIndex,
        onset: startDivisions / divisions,
        duration: isGrace ? 0 : durationDivisions / divisions,
        voice,
        staff,
        pitch: note?.midi ?? null,
        isRest: Boolean(note?.isRest),
        isChordTone: Boolean(note?.isChordNote),
        isGrace,
        structuralEvidence,
        beamGroup: null,
      })
    }
  }

  if (descriptors.length !== sourceNotes.length) {
    return { ok: false, code: 'UNMAPPED_SOURCE_NOTES' }
  }

  const invalidBeamMeasureKeys = new Set(
    (structuralResult.findings || [])
      .filter((finding) => BEAM_ERROR_CODES.has(finding?.code) && typeof finding?.measureKey === 'string')
      .map((finding) => finding.measureKey),
  )
  assignBeamGroups(descriptors, invalidBeamMeasureKeys)

  const events = descriptors.map((descriptor) => {
    const stemDirection = validStemDirection(descriptor.structuralEvidence)
    const metadata = Object.freeze({
      sourceRevisionId,
      sourceNoteIndex: descriptor.noteIndex,
      sourceNoteOrdinal: descriptor.noteOrdinal,
      sourceSequenceIndex: descriptor.sequenceIndex,
      sourcePartId: descriptor.partId,
      sourceMeasureIndex: descriptor.measureIndex,
      stemDirection,
      beamGroup: descriptor.beamGroup,
      sourceBeamEvidence: descriptor.structuralEvidence?.beam ?? null,
    })
    return createScoreEvent({
      id: descriptor.id,
      measureKey: descriptor.measureKey,
      onset: descriptor.onset,
      duration: descriptor.duration,
      voice: descriptor.voice,
      staff: descriptor.staff,
      pitch: descriptor.pitch,
      isRest: descriptor.isRest,
      isChordTone: descriptor.isChordTone,
      metadata,
    })
  })

  const graph = createScoreGraph({ sourceId: sourceRevisionId, measures, events })
  const reverseMap = Object.freeze(Object.fromEntries(descriptors.map((descriptor) => [
    descriptor.id,
    Object.freeze({
      sourceRevisionId,
      noteIndex: descriptor.noteIndex,
      noteOrdinal: descriptor.noteOrdinal,
      measureKey: descriptor.measureKey,
      sequenceIndex: descriptor.sequenceIndex,
      beforeVoice: descriptor.voice,
    }),
  ])))

  return { ok: true, graph, descriptors, reverseMap }
}

function mapVoiceOverlapFinding(finding, descriptors) {
  if (finding?.code !== 'VOICE_OVERLAP') return null
  const onset = Number(finding.actual)
  const voice = Number(finding.voice)
  const staff = Number(finding.staff)
  if (typeof finding.measureKey !== 'string' || !Number.isFinite(onset) ||
      !Number.isInteger(voice) || voice < 1 || !Number.isInteger(staff) || staff < 1) {
    return Object.freeze({ matched: false, code: 'VOICE_FINDING_LOCATION_INCOMPLETE', finding })
  }

  const matches = descriptors.filter((descriptor) =>
    descriptor.measureKey === finding.measureKey &&
    descriptor.voice === voice &&
    descriptor.staff === staff &&
    !descriptor.isRest &&
    !descriptor.isChordTone &&
    !descriptor.isGrace &&
    descriptor.duration > 0 &&
    Math.abs(descriptor.onset - onset) <= ONSET_EPSILON
  )

  if (matches.length !== 1) {
    return Object.freeze({ matched: false, code: 'VOICE_FINDING_NOT_UNIQUELY_MAPPED', finding, matchCount: matches.length })
  }
  return Object.freeze({ matched: true, descriptor: matches[0], finding })
}

function aggregateStatus(analyses) {
  if (analyses.length === 0) return CORRECTION_STATUS.NO_CHANGE
  return analyses.every((entry) => entry.analysis?.resolution?.status === CORRECTION_STATUS.RESOLVED)
    ? CORRECTION_STATUS.RESOLVED
    : CORRECTION_STATUS.AMBIGUOUS
}

export function analyzeSesliTabEvidenceShadow({
  sourceRevisionId,
  notes,
  structuralResult,
  instrumentProfile = 'generic',
} = {}) {
  const normalizedRevisionId = typeof sourceRevisionId === 'string' ? sourceRevisionId.trim() : ''
  if (!normalizedRevisionId) {
    return blocked({ sourceRevisionId: null, sourceNotes: notes, code: 'SOURCE_REVISION_ID_REQUIRED' })
  }
  if (!Array.isArray(notes)) {
    return blocked({ sourceRevisionId: normalizedRevisionId, sourceNotes: notes, code: 'SOURCE_NOTES_REQUIRED' })
  }
  if (!structuralResult || structuralResult.ok !== true || !Array.isArray(structuralResult.findings)) {
    return blocked({ sourceRevisionId: normalizedRevisionId, sourceNotes: notes, code: 'VALID_STRUCTURAL_RESULT_REQUIRED' })
  }
  if (typeof instrumentProfile !== 'string' || !ALLOWED_INSTRUMENT_PROFILES.has(instrumentProfile)) {
    return blocked({ sourceRevisionId: normalizedRevisionId, sourceNotes: notes, code: 'SUPPORTED_INSTRUMENT_PROFILE_REQUIRED' })
  }

  const built = buildBridgeGraph({ sourceRevisionId: normalizedRevisionId, sourceNotes: notes, structuralResult })
  if (!built.ok) {
    return blocked({
      sourceRevisionId: normalizedRevisionId,
      sourceNotes: notes,
      code: built.code,
      details: built.details ?? null,
    })
  }

  const relevant = structuralResult.findings.filter((finding) => SESLITAB_SHADOW_VOICE_FINDING_CODES.includes(finding?.code))
  const ignoredFindings = freezeArray(structuralResult.findings.filter((finding) => !SESLITAB_SHADOW_VOICE_FINDING_CODES.includes(finding?.code)))
  if (relevant.length === 0) {
    return Object.freeze({
      mode: 'shadow-evidence-bridge',
      status: CORRECTION_STATUS.NO_CHANGE,
      code: 'NO_VOICE_RELEVANT_FINDINGS',
      sourceRevisionId: normalizedRevisionId,
      sourceNotes: notes,
      scoreGraph: built.graph,
      reverseMap: built.reverseMap,
      analyses: Object.freeze([]),
      ignoredFindings,
      details: null,
    })
  }

  const mappings = relevant.map((finding) => mapVoiceOverlapFinding(finding, built.descriptors))
  const failed = mappings.find((mapping) => !mapping?.matched)
  if (failed) {
    return Object.freeze({
      mode: 'shadow-evidence-bridge',
      status: CORRECTION_STATUS.AMBIGUOUS,
      code: failed.code,
      sourceRevisionId: normalizedRevisionId,
      sourceNotes: notes,
      scoreGraph: built.graph,
      reverseMap: built.reverseMap,
      analyses: Object.freeze([]),
      ignoredFindings,
      details: Object.freeze({ matchCount: failed.matchCount ?? null }),
    })
  }

  const findingsByEvent = new Map()
  for (const mapping of mappings) {
    if (!findingsByEvent.has(mapping.descriptor.id)) findingsByEvent.set(mapping.descriptor.id, [])
    findingsByEvent.get(mapping.descriptor.id).push(normalizeFinding(mapping.finding, mapping.descriptor))
  }

  const analyses = []
  for (const [eventId, validatorFindings] of findingsByEvent) {
    const analysis = analyzeSesliTabShadow({
      scoreGraph: built.graph,
      validatorFindings,
      ambiguousEventIds: [eventId],
      instrumentProfile,
    })
    analyses.push(Object.freeze({
      eventId,
      reverse: built.reverseMap[eventId],
      validatorFindings: freezeArray(validatorFindings),
      analysis,
    }))
  }

  return Object.freeze({
    mode: 'shadow-evidence-bridge',
    status: aggregateStatus(analyses),
    code: 'SHADOW_ANALYSIS_COMPLETE',
    sourceRevisionId: normalizedRevisionId,
    sourceNotes: notes,
    scoreGraph: built.graph,
    reverseMap: built.reverseMap,
    analyses: freezeArray(analyses),
    ignoredFindings,
    details: null,
  })
}
