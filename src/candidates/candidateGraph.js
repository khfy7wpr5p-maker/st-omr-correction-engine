export const DEFAULT_CANDIDATE_LIMITS = Object.freeze({ maxCandidates: 64, maxDepth: 4, maxOperations: 256 })

function validateLimits(limits) {
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isInteger(value) || value < 1) throw new RangeError(`${key} must be a positive integer.`)
  }
}

export function buildCandidateGraph(seed, expand, options = {}) {
  if (typeof expand !== 'function') throw new TypeError('expand must be a function.')
  const limits = { ...DEFAULT_CANDIDATE_LIMITS, ...options }
  validateLimits(limits)

  const queue = [{ value: seed, depth: 0 }]
  const nodes = []
  let operations = 0
  let exhausted = false

  while (queue.length > 0) {
    if (nodes.length >= limits.maxCandidates || operations >= limits.maxOperations) { exhausted = true; break }
    const current = queue.shift()
    nodes.push(Object.freeze({ value: current.value, depth: current.depth }))
    if (current.depth >= limits.maxDepth) continue

    const children = expand(current.value, current.depth) || []
    if (!Array.isArray(children)) throw new TypeError('expand must return an array.')
    for (const child of children) {
      operations += 1
      if (operations > limits.maxOperations || nodes.length + queue.length >= limits.maxCandidates) { exhausted = true; break }
      queue.push({ value: child, depth: current.depth + 1 })
    }
    if (exhausted) break
  }

  return Object.freeze({ nodes: Object.freeze(nodes), operations, exhausted, limits: Object.freeze(limits) })
}
