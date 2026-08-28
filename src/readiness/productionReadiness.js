export const CORRECTION_READINESS = Object.freeze({
  RESEARCH_ONLY: 'RESEARCH_ONLY',
  SHADOW_READY: 'SHADOW_READY',
  TEACHER_REVIEW_READY: 'TEACHER_REVIEW_READY',
  AUTO_CORRECTION_CANDIDATE: 'AUTO_CORRECTION_CANDIDATE',
  PRODUCTION_APPROVED: 'PRODUCTION_APPROVED',
})

const ORDER = Object.freeze([
  CORRECTION_READINESS.RESEARCH_ONLY,
  CORRECTION_READINESS.SHADOW_READY,
  CORRECTION_READINESS.TEACHER_REVIEW_READY,
  CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE,
  CORRECTION_READINESS.PRODUCTION_APPROVED,
])

const REQUIREMENTS = Object.freeze({
  [CORRECTION_READINESS.SHADOW_READY]: Object.freeze([
    'testsPass',
    'sourceMutationInvariantPass',
    'reversibilityPass',
    'failClosedPass',
  ]),
  [CORRECTION_READINESS.TEACHER_REVIEW_READY]: Object.freeze([
    'teacherGoldEvidenceAvailable',
    'teacherReviewContractAvailable',
    'independentRevalidationAvailable',
  ]),
  [CORRECTION_READINESS.AUTO_CORRECTION_CANDIDATE]: Object.freeze([
    'calibrationEvidenceAvailable',
    'riskCoverageEvidenceAvailable',
    'riskRegressionPass',
    'falseCorrectionThresholdPass',
    'boundedSinglePurposePatch',
    'independentEvidenceAvailable',
    'noConflictingEvidence',
    'benchmarkThresholdPass',
    'policyDerivedFromTeacherGold',
  ]),
  [CORRECTION_READINESS.PRODUCTION_APPROVED]: Object.freeze([
    'productionPolicyApproved',
    'humanApprovalRecorded',
    'securityReviewPass',
  ]),
})

function ensureRequestedStatus(value) {
  if (!ORDER.includes(value)) throw new TypeError('requestedStatus is not a recognized correction readiness level.')
}

function missingFor(status, evidence) {
  const required = REQUIREMENTS[status] ?? []
  return required.filter((key) => evidence?.[key] !== true)
}

export function evaluateCorrectionReadiness({ requestedStatus = CORRECTION_READINESS.RESEARCH_ONLY, evidence = {} } = {}) {
  ensureRequestedStatus(requestedStatus)
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new TypeError('evidence must be an object.')

  let achieved = CORRECTION_READINESS.RESEARCH_ONLY
  const blockers = []
  const requestedIndex = ORDER.indexOf(requestedStatus)

  for (let index = 1; index <= requestedIndex; index += 1) {
    const status = ORDER[index]
    const missing = missingFor(status, evidence)
    if (missing.length) {
      blockers.push(...missing.map((requirement) => Object.freeze({ status, requirement })))
      break
    }
    achieved = status
  }

  return Object.freeze({
    requestedStatus,
    achievedStatus: achieved,
    approved: achieved === requestedStatus,
    blockers: Object.freeze(blockers),
    numericThresholdInvented: false,
    productionBehaviorChanged: false,
  })
}

export function readinessRequirements() {
  return Object.freeze(Object.fromEntries(Object.entries(REQUIREMENTS).map(([status, requirements]) => [status, Object.freeze([...requirements])])))
}
