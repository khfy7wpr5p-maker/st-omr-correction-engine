export function createCorrectionRequest({ structuredScore, validatorFindings = [], instrumentProfile = 'generic', sourceId = null }) {
  if (!structuredScore || typeof structuredScore !== 'object' || Array.isArray(structuredScore)) {
    throw new TypeError('structuredScore must be an object.')
  }
  if (!Array.isArray(validatorFindings)) throw new TypeError('validatorFindings must be an array.')
  if (typeof instrumentProfile !== 'string' || !instrumentProfile.trim()) throw new TypeError('instrumentProfile is required.')
  return Object.freeze({
    structuredScore,
    validatorFindings: Object.freeze([...validatorFindings]),
    instrumentProfile,
    sourceId,
  })
}
