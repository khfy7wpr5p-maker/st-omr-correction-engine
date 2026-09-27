import {
  SEMANTIC_CONSISTENCY_DIAGNOSTIC as CODE,
  SEMANTIC_CONSISTENCY_STATUS as STATUS,
} from './semanticConsistencyContract.js'

function freezeResult(status, diagnostics) {
  const frozenDiagnostics = Object.freeze(diagnostics.map((item) => Object.freeze(item)))
  return Object.freeze({ status, diagnostics: frozenDiagnostics })
}

function unsupported(message) {
  return freezeResult(STATUS.UNSUPPORTED, [{
    code: CODE.PROFILE_UNSUPPORTED,
    message,
  }])
}

function asText(input) {
  if (typeof input === 'string') return input
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) return Buffer.from(input).toString('utf8')
  return null
}

export function analyzeSemanticSourceProfile({ musicXml, expectedDivisionsPerQuarter }) {
  const text = asText(musicXml)
  if (text === null || !/<score-partwise\b/i.test(text)) {
    return unsupported('SEM-05 requires score-partwise MusicXML bytes/text.')
  }
  if (!Number.isInteger(expectedDivisionsPerQuarter) || expectedDivisionsPerQuarter <= 0) {
    return unsupported('SEM-05 requires a positive integer divisions-per-quarter provenance value.')
  }

  const partCount = [...text.matchAll(/<part(?=\s|>)[^>]*>/gi)].length
  if (partCount !== 1) return unsupported('SEM-05 admits exactly one MusicXML part.')

  const excluded = [
    [/<unpitched(?=\s|>|\/)/i, 'Unpitched/percussion notation is outside SEM-05.'],
    [/<grace(?=\s|>|\/)/i, 'Grace notation is outside SEM-05.'],
    [/<beam(?=\s|>)/i, 'Beam notation is outside SEM-05.'],
    [/<slur(?=\s|>|\/)/i, 'Slur notation is outside SEM-05.'],
    [/<tuplet(?=\s|>|\/)/i, 'Tuplet notation is outside SEM-05.'],
    [/<time-modification(?=\s|>)/i, 'Tuplet timing is outside SEM-05.'],
    [/<tremolo(?=\s|>)/i, 'Tremolo notation is outside SEM-05.'],
    [/<ornaments(?=\s|>)/i, 'Ornament notation is outside SEM-05.'],
    [/\bnon-controlling\s*=\s*["']yes["']/i, 'Non-controlling measures are outside SEM-05.'],
    [/\bimplicit\s*=\s*["']yes["']/i, 'Implicit/pickup measures are outside SEM-05.'],
  ]
  for (const [pattern, message] of excluded) {
    if (pattern.test(text)) return unsupported(message)
  }

  const divisions = [...text.matchAll(/<divisions(?:\s[^>]*)?>([^<]+)<\/divisions>/gi)]
    .map((match) => Number(match[1].trim()))
  if (divisions.length === 0) return unsupported('MusicXML divisions are required for SEM-05.')
  if (divisions.some((value) => !Number.isInteger(value) || value <= 0)) {
    return unsupported('MusicXML divisions must be positive integers.')
  }
  const distinctDivisions = [...new Set(divisions)]
  if (distinctDivisions.length !== 1 || distinctDivisions[0] !== expectedDivisionsPerQuarter) {
    return unsupported('Mid-score or provenance-divergent divisions are outside SEM-05.')
  }

  const transposeBlocks = [...text.matchAll(/<transpose(?:\s[^>]*)?>([\s\S]*?)<\/transpose>/gi)]
  for (const block of transposeBlocks) {
    const chromatic = block[1].match(/<chromatic(?:\s[^>]*)?>([^<]+)<\/chromatic>/i)
    if (!chromatic) return unsupported('Unbounded transposition is outside SEM-05.')
    const value = Number(chromatic[1].trim())
    if (!Number.isInteger(value) || value !== 0) {
      return unsupported('Written/sounding transposition comparison is outside SEM-05.')
    }
  }

  return freezeResult(STATUS.PASS, [])
}
