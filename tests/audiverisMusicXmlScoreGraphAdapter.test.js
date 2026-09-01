import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  AUDIVERIS_MUSICXML_IMPORTER_VERSION,
  importAudiverisMusicXml,
} from '../adapters/musicxml/index.js'

function score(body, { version = '4.0.3', extraPart = '' } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0.3 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="${version}">
  <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
  <part id="P1">${body}</part>${extraPart}
</score-partwise>`
}

const SIMPLE = score(`
<measure number="1">
  <attributes><divisions>4</divisions><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff><tie type="start"/></note>
  <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff></note>
  <note><rest/><duration>4</duration><voice>1</voice><staff>1</staff></note>
</measure>
<measure number="2">
  <note><pitch><step>G</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff></note>
  <backup><duration>8</duration></backup>
  <note><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration><voice>2</voice><staff>1</staff></note>
</measure>`)

test('bounded Audiveris importer preserves ordered chord/backup timing and source immutability', () => {
  const bytes = Buffer.from(SIMPLE, 'utf8')
  const before = Buffer.from(bytes)
  const expectedSourceSha256 = createHash('sha256').update(bytes).digest('hex')
  const first = importAudiverisMusicXml(bytes, { sourceId: 'omr-test', expectedSourceSha256 })
  const second = importAudiverisMusicXml(bytes, { sourceId: 'omr-test', expectedSourceSha256 })

  assert.equal(first.ok, true)
  assert.equal(first.identity.origin, 'OMR_CANONICAL')
  assert.equal(first.identity.revisionId, AUDIVERIS_MUSICXML_IMPORTER_VERSION)
  assert.equal(first.sourceSha256, expectedSourceSha256)
  assert.equal(first.canonicalGraphSha256, second.canonicalGraphSha256)
  assert.deepEqual(bytes, before)
  assert.equal(first.scoreGraph.measures.length, 2)
  assert.equal(first.scoreGraph.events.length, 5)
  assert.deepEqual(first.warnings, [])

  const [c4, e4, rest, g4, c3] = first.scoreGraph.events
  assert.deepEqual([c4.onset, c4.duration, c4.pitch, c4.voice], [0, 1, 60, 1])
  assert.deepEqual(c4.metadata.tieTypes, ['start'])
  assert.deepEqual([e4.onset, e4.duration, e4.pitch, e4.isChordTone], [0, 1, 64, true])
  assert.deepEqual([rest.onset, rest.duration, rest.pitch, rest.isRest], [1, 1, null, true])
  assert.deepEqual([g4.measureKey, g4.onset, g4.duration, g4.voice], ['2', 0, 2, 1])
  assert.deepEqual([c3.measureKey, c3.onset, c3.duration, c3.voice], ['2', 0, 2, 2])
  assert.equal(c4.metadata.pitchDomain, 'WRITTEN')
  assert.equal(first.automaticCorrectionAuthority, false)
})

test('real OMR timing defects remain warnings rather than being silently normalized', () => {
  const xml = score(`<measure number="1">
    <attributes><divisions>4</divisions><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>12</duration><voice>1</voice></note>
  </measure>`)
  const result = importAudiverisMusicXml(xml, { sourceId: 'overflow' })
  assert.equal(result.ok, true)
  assert.deepEqual(result.warnings, [{ code: 'MEASURE_EVENT_OVERFLOW', measureKey: '1', expectedQuarterBeats: 2, maxEventEnd: 3 }])
  assert.equal(result.scoreGraph.events[0].duration, 3)
})

test('source identity mismatch fails closed before parsing', () => {
  const result = importAudiverisMusicXml(SIMPLE, { sourceId: 'omr-test', expectedSourceSha256: '0'.repeat(64) })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'SOURCE_HASH_MISMATCH')
})

test('unsupported or unsafe MusicXML contexts fail closed', () => {
  const cases = [
    [score(`<measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><transpose><chromatic>-2</chromatic></transpose></attributes></measure>`), 'UNSUPPORTED_TRANSPOSE'],
    [score(`<measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><grace/><pitch><step>C</step><octave>4</octave></pitch><voice>1</voice></note></measure>`), 'UNSUPPORTED_GRACE'],
    [score(`<measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note></measure>`), 'UNSUPPORTED_TIME_MODIFICATION'],
    [score(`<measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><backup><duration>4</duration></backup></measure>`), 'NEGATIVE_MEASURE_CURSOR'],
  ]
  for (const [xml, reason] of cases) {
    const result = importAudiverisMusicXml(xml, { sourceId: `unsupported-${reason}` })
    assert.equal(result.ok, false)
    assert.equal(result.reason, reason)
  }
})

test('multi-part and unsupported MusicXML versions do not enter canonical ScoreGraph', () => {
  const multi = score('<measure number="1"/>', { extraPart: '<part id="P2"><measure number="1"/></part>' })
  assert.equal(importAudiverisMusicXml(multi, { sourceId: 'multi' }).reason, 'UNSUPPORTED_MULTIPART_SCORE')
  assert.equal(importAudiverisMusicXml(score('<measure number="1"/>', { version: '4.0' }), { sourceId: 'old' }).reason, 'UNSUPPORTED_MUSICXML_VERSION')
})
