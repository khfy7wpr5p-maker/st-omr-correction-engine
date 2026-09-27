import {
  SEMANTIC_CONSISTENCY_DIAGNOSTIC,
  SEMANTIC_CONSISTENCY_STATUS,
} from './semanticConsistencyContract.js'

const PROVENANCE_SCHEMA = 'st-omr-semantic-consistency-provenance-v1'
const SNAPSHOT_SCHEMA = 'st-semantic-snapshot-v1'
const SEMANTIC_ENGINE_COMMIT = 'ffc997b242fa862e180e698385cc0afb52de47a1'
const PARTITURA_VERSION = '1.9.0'

export class SemanticConsistencyReferenceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SemanticConsistencyReferenceError'
    this.code = 'INVALID_SEMANTIC_REFERENCE'
  }
}

function invalid(message) {
  throw new SemanticConsistencyReferenceError(message)
}

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${name} must be an object.`)
  return value
}

function string(value, name, { nullable = false } = {}) {
  if (nullable && value === null) return null
  if (typeof value !== 'string' || !value.trim()) invalid(`${name} must be a non-empty string.`)
  return value
}

function integer(value, name, { min = null, max = null, nullable = false } = {}) {
  if (nullable && value === null) return null
  if (!Number.isInteger(value)) invalid(`${name} must be an integer.`)
  if (min !== null && value < min) invalid(`${name} is below the admitted range.`)
  if (max !== null && value > max) invalid(`${name} is above the admitted range.`)
  return value
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function normalizeDiagnostic(item, index) {
  const input = object(item, `diagnostics[${index}]`)
  return {
    code: string(input.code, `diagnostics[${index}].code`),
    severity: input.severity == null ? null : string(input.severity, `diagnostics[${index}].severity`),
    source_id: input.source_id == null ? null : string(input.source_id, `diagnostics[${index}].source_id`),
    message: input.message == null ? null : string(input.message, `diagnostics[${index}].message`),
  }
}

function normalizeNote(item, index) {
  const input = object(item, `notes[${index}]`)
  if (typeof input.is_grace !== 'boolean') invalid(`notes[${index}].is_grace must be boolean.`)
  return {
    source_id: input.source_id == null ? null : string(input.source_id, `notes[${index}].source_id`),
    part_id: string(input.part_id, `notes[${index}].part_id`),
    measure_index: integer(input.measure_index, `notes[${index}].measure_index`),
    pitch_midi: integer(input.pitch_midi, `notes[${index}].pitch_midi`),
    onset_div: integer(input.onset_div, `notes[${index}].onset_div`),
    duration_div: integer(input.duration_div, `notes[${index}].duration_div`),
    voice: integer(input.voice, `notes[${index}].voice`, { nullable: true }),
    staff: integer(input.staff, `notes[${index}].staff`, { nullable: true }),
    tie_prev: input.tie_prev == null ? null : string(input.tie_prev, `notes[${index}].tie_prev`),
    tie_next: input.tie_next == null ? null : string(input.tie_next, `notes[${index}].tie_next`),
    is_grace: input.is_grace,
  }
}

function normalizeTimeSignature(item, index) {
  const input = object(item, `time_signatures[${index}]`)
  return {
    part_id: string(input.part_id, `time_signatures[${index}].part_id`),
    onset_div: integer(input.onset_div, `time_signatures[${index}].onset_div`),
    beats: integer(input.beats, `time_signatures[${index}].beats`),
    beat_type: integer(input.beat_type, `time_signatures[${index}].beat_type`),
  }
}

export function validateSemanticConsistencyReference({
  provenance,
  semanticSnapshot,
  observedSourceSha256,
  observedSourceId,
}) {
  const p = object(provenance, 'provenance')
  const snapshot = object(semanticSnapshot, 'semanticSnapshot')

  if (p.schemaVersion !== PROVENANCE_SCHEMA) invalid('Unsupported provenance schema.')
  if (typeof p.sourceSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(p.sourceSha256)) invalid('Invalid source SHA-256.')
  if (p.sourceSha256 !== observedSourceSha256) invalid('Source SHA-256 provenance mismatch.')
  if (string(p.sourceId, 'provenance.sourceId') !== observedSourceId) invalid('Source identity provenance mismatch.')
  if (p.semanticEngineCommit !== SEMANTIC_ENGINE_COMMIT) invalid('Semantic Engine commit provenance mismatch.')
  if (p.semanticSnapshotSchema !== SNAPSHOT_SCHEMA) invalid('Semantic snapshot provenance schema mismatch.')
  if (p.partituraVersion !== PARTITURA_VERSION) invalid('Partitura provenance mismatch.')
  integer(p.divisionsPerQuarter, 'provenance.divisionsPerQuarter', { min: 1 })

  if (snapshot.schema_version !== SNAPSHOT_SCHEMA || snapshot.schema_version !== p.semanticSnapshotSchema) {
    invalid('Semantic snapshot schema mismatch.')
  }
  if (snapshot.source_kind !== 'musicxml') invalid('Semantic snapshot source kind must be musicxml.')
  if (!Array.isArray(snapshot.notes)) invalid('Semantic snapshot notes must be an array.')
  if (!Array.isArray(snapshot.time_signatures)) invalid('Semantic snapshot time_signatures must be an array.')
  if (!Array.isArray(snapshot.diagnostics)) invalid('Semantic snapshot diagnostics must be an array.')

  const normalized = {
    provenance: {
      schemaVersion: p.schemaVersion,
      sourceSha256: p.sourceSha256,
      semanticEngineCommit: p.semanticEngineCommit,
      semanticSnapshotSchema: p.semanticSnapshotSchema,
      partituraVersion: p.partituraVersion,
      sourceId: p.sourceId,
      divisionsPerQuarter: p.divisionsPerQuarter,
    },
    semanticSnapshot: {
      schema_version: snapshot.schema_version,
      source_kind: snapshot.source_kind,
      part_count: integer(snapshot.part_count, 'semanticSnapshot.part_count', { min: 0 }),
      measure_count: integer(snapshot.measure_count, 'semanticSnapshot.measure_count', { min: 0 }),
      notes: snapshot.notes.map(normalizeNote),
      time_signatures: snapshot.time_signatures.map(normalizeTimeSignature),
      diagnostics: snapshot.diagnostics.map(normalizeDiagnostic),
    },
  }
  return deepFreeze(normalized)
}

function unsupported(message) {
  return deepFreeze({
    status: SEMANTIC_CONSISTENCY_STATUS.UNSUPPORTED,
    diagnostics: [{
      code: SEMANTIC_CONSISTENCY_DIAGNOSTIC.PROFILE_UNSUPPORTED,
      message,
    }],
  })
}

export function analyzeSemanticConsistencyProfile(reference) {
  const snapshot = reference?.semanticSnapshot
  const provenance = reference?.provenance
  if (!snapshot || !provenance) return unsupported('Validated semantic reference is required.')
  if (snapshot.part_count !== 1) return unsupported('SEM-05 admits exactly one part.')
  if (snapshot.measure_count < 2) return unsupported('SEM-05 admits at least two measures.')
  if (!Number.isInteger(provenance.divisionsPerQuarter) || provenance.divisionsPerQuarter <= 0) {
    return unsupported('SEM-05 requires fixed positive divisions per quarter.')
  }
  if (snapshot.time_signatures.length === 0 || snapshot.time_signatures[0]?.onset_div !== 0) {
    return unsupported('SEM-05 requires an unambiguous meter timeline beginning at zero.')
  }

  for (const item of snapshot.time_signatures) {
    if (item.onset_div < 0 || item.beats <= 0 || item.beat_type <= 0) {
      return unsupported('Invalid semantic meter context.')
    }
  }

  for (const note of snapshot.notes) {
    if (note.is_grace) return unsupported('Grace notes are outside SEM-05.')
    if (!Number.isInteger(note.pitch_midi) || note.pitch_midi < 0 || note.pitch_midi > 127) {
      return unsupported('Unsupported semantic pitch.')
    }
    if (!Number.isInteger(note.measure_index) || note.measure_index < 0 || note.measure_index >= snapshot.measure_count) {
      return unsupported('Unsupported semantic measure membership.')
    }
    if (note.onset_div < 0 || note.duration_div < 0) return unsupported('Negative semantic timing is unsupported.')
    if (!Number.isInteger(note.voice) || note.voice <= 0 || !Number.isInteger(note.staff) || note.staff <= 0) {
      return unsupported('Missing or invalid semantic voice/staff is unsupported.')
    }
  }

  if (snapshot.diagnostics.some((item) => item.code === 'UNSUPPORTED_STRUCTURE')) {
    return unsupported('Semantic Engine reported unsupported structure.')
  }

  return deepFreeze({ status: SEMANTIC_CONSISTENCY_STATUS.PASS })
}
