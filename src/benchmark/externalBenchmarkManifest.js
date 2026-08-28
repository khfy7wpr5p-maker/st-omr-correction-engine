const SHA256 = /^[0-9a-f]{64}$/i

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`)
  return value
}

function requiredBoolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean.`)
  return value
}

export function createExternalBenchmarkManifest({
  dataset,
  source,
  version,
  license,
  licenseVerified,
  redistribution,
  commercialUse,
  trainingAllowed,
  evaluationAllowed,
  checksum,
}) {
  dataset = requiredString(dataset, 'dataset')
  source = requiredString(source, 'source')
  version = requiredString(version, 'version')
  license = requiredString(license, 'license')
  licenseVerified = requiredBoolean(licenseVerified, 'licenseVerified')
  redistribution = requiredBoolean(redistribution, 'redistribution')
  commercialUse = requiredBoolean(commercialUse, 'commercialUse')
  trainingAllowed = requiredBoolean(trainingAllowed, 'trainingAllowed')
  evaluationAllowed = requiredBoolean(evaluationAllowed, 'evaluationAllowed')
  if (typeof checksum !== 'string' || !SHA256.test(checksum)) throw new TypeError('checksum must be a 64-character SHA-256 hex string.')

  return Object.freeze({
    schemaVersion: '1.0.0',
    dataset,
    source,
    version,
    license,
    licenseVerified,
    redistribution,
    commercialUse,
    trainingAllowed,
    evaluationAllowed,
    checksum: checksum.toLowerCase(),
  })
}

export function evaluateExternalBenchmarkEligibility(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new TypeError('manifest is required.')
  const blockers = []
  if (manifest.licenseVerified !== true) blockers.push('LICENSE_NOT_VERIFIED')
  if (manifest.evaluationAllowed !== true) blockers.push('EVALUATION_NOT_ALLOWED')
  if (typeof manifest.checksum !== 'string' || !SHA256.test(manifest.checksum)) blockers.push('CHECKSUM_INVALID')

  return Object.freeze({
    eligibleForEvaluation: blockers.length === 0,
    eligibleForRepositoryCopy: blockers.length === 0 && manifest.redistribution === true,
    eligibleForTraining: blockers.length === 0 && manifest.trainingAllowed === true,
    blockers: Object.freeze(blockers),
  })
}
