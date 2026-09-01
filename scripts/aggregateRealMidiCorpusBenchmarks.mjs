import { readFileSync } from 'node:fs'
import { aggregateRealMidiCorpusMeasurements } from '../src/index.js'

const [sorPath, lagrimaPath, bachPath] = process.argv.slice(2)
if (!sorPath || !lagrimaPath || !bachPath) {
  throw new Error('Usage: node scripts/aggregateRealMidiCorpusBenchmarks.mjs <sor.json> <lagrima.json> <bach.json>')
}
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const result = aggregateRealMidiCorpusMeasurements([
  {
    id: 'sor-op35-no13',
    instrumentProfile: 'classical-guitar',
    relationship: 'CROSS_SOURCE_SAME_WORK_REFERENCE_ONLY',
    independenceVerified: false,
    teacherVerified: false,
    benchmark: readJson(sorPath),
  },
  {
    id: 'tarrega-lagrima',
    instrumentProfile: 'classical-guitar',
    relationship: 'CROSS_SOURCE_SAME_WORK_REFERENCE_ONLY',
    independenceVerified: false,
    teacherVerified: false,
    benchmark: readJson(lagrimaPath),
  },
  {
    id: 'bach-bwv846-asap',
    instrumentProfile: 'piano',
    relationship: 'UPSTREAM_SAME_SCORE_REPRESENTATIONS',
    independenceVerified: false,
    teacherVerified: false,
    benchmark: readJson(bachPath),
  },
])
console.log(JSON.stringify(result, null, 2))
