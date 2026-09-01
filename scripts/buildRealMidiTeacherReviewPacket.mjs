import { readFileSync } from 'node:fs'
import { buildRealMidiTeacherReviewPacket } from '../src/index.js'

const [sorPath, lagrimaPath, bachPath] = process.argv.slice(2)
if (!sorPath || !lagrimaPath || !bachPath) throw new Error('Usage: node scripts/buildRealMidiTeacherReviewPacket.mjs <sor.json> <lagrima.json> <bach.json>')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const packet = buildRealMidiTeacherReviewPacket([
  { id: 'sor-op35-no13', benchmark: readJson(sorPath) },
  { id: 'tarrega-lagrima', benchmark: readJson(lagrimaPath) },
  { id: 'bach-bwv846-asap', benchmark: readJson(bachPath) },
])
console.log(JSON.stringify(packet, null, 2))
