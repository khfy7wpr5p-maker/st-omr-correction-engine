import { parseBoundedMusicXmlScoreGraph } from '../../adapters/musicxml/boundedMusicXmlScoreGraphAdapter.js'
import { analyzeOmrCorrections } from './omrCorrectionAnalyzer.js'

function requiredXml(value) {
  if (typeof value !== 'string' || !value.includes('<score-partwise')) {
    throw new TypeError('musicxml must be score-partwise XML text.')
  }
  return value
}

function boundedSourceId(value) {
  if (value == null) return 'browser-musicxml-source'
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || value !== value.trim()) {
    throw new TypeError('sourceId must be a non-empty bounded string.')
  }
  return value
}

function freezeFinding(value) {
  return Object.freeze({ ...value })
}

export function analyzeMusicXmlSuspiciousMeasures({
  musicxml,
  sourceId = 'browser-musicxml-source',
  tolerance = 0.01,
} = {}) {
  const xml = requiredXml(musicxml)
  const id = boundedSourceId(sourceId)
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('tolerance must be finite and non-negative.')

  const parsed = parseBoundedMusicXmlScoreGraph(xml, { sourceId: id, includeRests: true })
  const analysis = analyzeOmrCorrections({ scoreGraph: parsed.scoreGraph, tolerance })

  const eventMeasure = new Map(parsed.scoreGraph.events.map((event) => [event.id, event.measureKey]))
  const measureMeta = new Map()
  parsed.scoreGraph.measures.forEach((measure, measureIndex) => {
    const event = parsed.scoreGraph.events.find((candidate) => candidate.measureKey === measure.key)
    const measureNumber = event?.metadata?.musicXmlMeasureNumber
      ?? (measure.key.startsWith('m') ? measure.key.slice(1) : measure.key)
    measureMeta.set(measure.key, Object.freeze({ measureIndex, measureNumber: String(measureNumber) }))
  })

  const mapped = []
  let unmappedFindingCount = 0
  for (let index = 0; index < analysis.findings.length; index += 1) {
    const finding = analysis.findings[index]
    const measureKey = typeof finding.measureKey === 'string'
      ? finding.measureKey
      : (typeof finding.eventId === 'string' ? eventMeasure.get(finding.eventId) : undefined)
    const meta = typeof measureKey === 'string' ? measureMeta.get(measureKey) : undefined
    if (!meta) {
      unmappedFindingCount += 1
      continue
    }
    mapped.push(freezeFinding({
      findingId: `${id}:${finding.errorClass}:${finding.code}:${measureKey}:${index}`,
      errorClass: finding.errorClass,
      code: finding.code,
      measureKey,
      measureNumber: meta.measureNumber,
      measureIndex: meta.measureIndex,
      ...(typeof finding.eventId === 'string' ? { eventId: finding.eventId } : {}),
      ...(typeof finding.voiceKey === 'string' ? { voiceKey: finding.voiceKey } : {}),
      ...(Number.isFinite(finding.actualQuarterBeats) ? { actualQuarterBeats: finding.actualQuarterBeats } : {}),
      ...(Number.isFinite(finding.expectedQuarterBeats) ? { expectedQuarterBeats: finding.expectedQuarterBeats } : {}),
      ...(Number.isFinite(finding.actual) ? { actual: finding.actual } : {}),
      ...(Number.isFinite(finding.expected) ? { expected: finding.expected } : {}),
    }))
  }

  const grouped = new Map()
  for (const finding of mapped) {
    const current = grouped.get(finding.measureKey) ?? {
      measureKey: finding.measureKey,
      measureNumber: finding.measureNumber,
      measureIndex: finding.measureIndex,
      codes: new Set(),
      errorClasses: new Set(),
      findingIds: [],
    }
    current.codes.add(finding.code)
    current.errorClasses.add(finding.errorClass)
    current.findingIds.push(finding.findingId)
    grouped.set(finding.measureKey, current)
  }

  const suspiciousMeasures = [...grouped.values()]
    .sort((left, right) => left.measureIndex - right.measureIndex)
    .map((item) => Object.freeze({
      measureKey: item.measureKey,
      measureNumber: item.measureNumber,
      measureIndex: item.measureIndex,
      codes: Object.freeze([...item.codes].sort()),
      errorClasses: Object.freeze([...item.errorClasses].sort()),
      findingIds: Object.freeze([...item.findingIds]),
    }))

  return Object.freeze({
    contract: 'ST_OMR_CORRECTION_ENGINE_SUSPICIOUS_MEASURES_V1',
    mode: 'SHADOW_ONLY',
    sourceId: parsed.sourceId,
    sourceHash: parsed.sha256,
    measureCount: parsed.summary.measureCount,
    eventCount: parsed.summary.eventCount,
    findings: Object.freeze(mapped),
    suspiciousMeasures: Object.freeze(suspiciousMeasures),
    unmappedFindingCount,
    sourceGraphMutated: false,
    automaticApplyAuthority: false,
    musicXmlWriteBackAuthority: false,
  })
}
