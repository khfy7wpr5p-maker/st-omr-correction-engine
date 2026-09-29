import { createHash } from 'node:crypto'

export const TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION = 'teacher-structural-patch-set-v1'

export const TEACHER_STRUCTURAL_OPERATION = Object.freeze({
  INSERT_EVENT: 'INSERT_EVENT',
  REMOVE_EVENT: 'REMOVE_EVENT',
  CHANGE_EVENT_DURATION: 'CHANGE_EVENT_DURATION',
  CHANGE_EVENT_VOICE: 'CHANGE_EVENT_VOICE',
  CHANGE_EVENT_STAFF: 'CHANGE_EVENT_STAFF',
  CHANGE_EVENT_TIE: 'CHANGE_EVENT_TIE',
  CHANGE_MEASURE_METER: 'CHANGE_MEASURE_METER',
})

const EVENT_FIELD_OPERATIONS = new Set([
  TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_DURATION,
  TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_VOICE,
  TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_STAFF,
  TEACHER_STRUCTURAL_OPERATION.CHANGE_EVENT_TIE,
])

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
  return value
}

function frozenValue(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(frozenValue))
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, frozenValue(item)])))
  }
  return value
}

export function createTeacherEditAuthorization({ actionId } = {}) {
  return Object.freeze({
    mode: 'EXPLICIT_TEACHER_EDIT',
    actionId: requiredString(actionId, 'actionId'),
  })
}

export function createTeacherStructuralPatch({
  operation,
  measureKey,
  eventId = null,
  before,
  after,
} = {}) {
  if (!Object.values(TEACHER_STRUCTURAL_OPERATION).includes(operation)) throw new TypeError('Unsupported teacher structural operation.')
  requiredString(measureKey, 'measureKey')

  if (operation === TEACHER_STRUCTURAL_OPERATION.INSERT_EVENT) {
    requiredString(eventId, 'eventId')
    if (before !== null) throw new TypeError('INSERT_EVENT before must be null.')
    if (!after || typeof after !== 'object' || Array.isArray(after)) throw new TypeError('INSERT_EVENT after must be an object.')
  } else if (operation === TEACHER_STRUCTURAL_OPERATION.REMOVE_EVENT) {
    requiredString(eventId, 'eventId')
    if (!before || typeof before !== 'object' || Array.isArray(before)) throw new TypeError('REMOVE_EVENT before must be an object.')
    if (after !== null) throw new TypeError('REMOVE_EVENT after must be null.')
  } else if (EVENT_FIELD_OPERATIONS.has(operation)) {
    requiredString(eventId, 'eventId')
    if (before === undefined) throw new TypeError('before is required.')
    if (after === undefined) throw new TypeError('after is required.')
  } else if (operation === TEACHER_STRUCTURAL_OPERATION.CHANGE_MEASURE_METER) {
    if (eventId != null) throw new TypeError('CHANGE_MEASURE_METER eventId must be absent.')
    if (!before || typeof before !== 'object' || Array.isArray(before)) throw new TypeError('CHANGE_MEASURE_METER before must be an object.')
    if (!after || typeof after !== 'object' || Array.isArray(after)) throw new TypeError('CHANGE_MEASURE_METER after must be an object.')
  }

  return Object.freeze({
    operation,
    measureKey,
    eventId,
    before: frozenValue(before),
    after: frozenValue(after),
  })
}

export function createTeacherStructuralPatchSet({
  patchSetId,
  baseSourceId,
  baseGraphFingerprint,
  authorization,
  patches,
} = {}) {
  requiredString(patchSetId, 'patchSetId')
  requiredString(baseSourceId, 'baseSourceId')
  if (typeof baseGraphFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(baseGraphFingerprint)) {
    throw new TypeError('baseGraphFingerprint must be a lowercase SHA-256 hex digest.')
  }
  if (!authorization || authorization.mode !== 'EXPLICIT_TEACHER_EDIT' || typeof authorization.actionId !== 'string' || !authorization.actionId.trim()) {
    throw new TypeError('Explicit teacher authorization is required.')
  }
  if (!Array.isArray(patches) || patches.length === 0) throw new TypeError('patches must be a non-empty array.')
  if (patches.some((patch) => !patch || !Object.values(TEACHER_STRUCTURAL_OPERATION).includes(patch.operation))) {
    throw new TypeError('patches must contain teacher structural patches.')
  }

  return Object.freeze({
    schemaVersion: TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION,
    patchSetId,
    baseSourceId,
    baseGraphFingerprint,
    authorization,
    patches: Object.freeze([...patches]),
    automaticApplyAuthority: false,
    finalTeacherApproval: false,
    studentShareEligible: false,
  })
}

export function fingerprintScoreGraph(scoreGraph) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')
  return createHash('sha256').update(JSON.stringify(scoreGraph)).digest('hex')
}
