export const CORPUS_SOURCE_STATUS = Object.freeze({
  REFERENCE_ONLY: 'REFERENCE_ONLY',
  GOLD_ELIGIBLE: 'GOLD_ELIGIBLE',
})

const SHA40 = /^[0-9a-f]{40}$/i

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
}

function validateRights(rights) {
  if (!rights || typeof rights !== 'object' || Array.isArray(rights)) throw new TypeError('rights must be an object.')
  for (const key of ['benchmarkUse', 'commercialUse', 'trainingUse', 'redistribution']) {
    if (typeof rights[key] !== 'boolean') throw new TypeError(`rights.${key} must be boolean.`)
  }
}

export function createCorpusSource({
  id,
  instrumentProfile,
  sourceFormat,
  repository,
  commitSha,
  filePath,
  blobSha,
  license,
  rights,
  challengeTags = [],
  notes = null,
}) {
  nonEmptyString(id, 'id')
  nonEmptyString(instrumentProfile, 'instrumentProfile')
  nonEmptyString(sourceFormat, 'sourceFormat')
  nonEmptyString(repository, 'repository')
  nonEmptyString(filePath, 'filePath')
  nonEmptyString(license, 'license')
  if (!SHA40.test(commitSha)) throw new TypeError('commitSha must be a pinned 40-character SHA.')
  if (!SHA40.test(blobSha)) throw new TypeError('blobSha must be a pinned 40-character SHA.')
  if (!Array.isArray(challengeTags)) throw new TypeError('challengeTags must be an array.')
  validateRights(rights)

  return Object.freeze({
    id,
    instrumentProfile,
    sourceFormat,
    repository,
    commitSha,
    filePath,
    blobSha,
    license,
    rights: Object.freeze({ ...rights }),
    challengeTags: Object.freeze([...challengeTags]),
    notes,
    status: CORPUS_SOURCE_STATUS.REFERENCE_ONLY,
    teacherApproval: null,
  })
}

export function promoteCorpusSourceForGold(source, teacherApproval) {
  if (!source || source.status !== CORPUS_SOURCE_STATUS.REFERENCE_ONLY) {
    throw new TypeError('Only reference-only corpus sources can be promoted.')
  }
  if (!source.rights?.benchmarkUse) throw new TypeError('Source rights do not allow benchmark use.')
  if (!teacherApproval || teacherApproval.approved !== true || typeof teacherApproval.approvalId !== 'string' || !teacherApproval.approvalId.trim()) {
    throw new TypeError('Explicit teacher approval provenance is required for gold eligibility.')
  }

  return Object.freeze({
    ...source,
    status: CORPUS_SOURCE_STATUS.GOLD_ELIGIBLE,
    teacherApproval: Object.freeze({ ...teacherApproval }),
  })
}
