import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBoundedMusicXmlScoreGraph } from '../src/index.js'

const fixture = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>
      <note><rest/><duration>2</duration><voice>1</voice><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
      <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><staff>2</staff></note>
      <forward><duration>12</duration></forward>
    </measure>
  </part>
</score-partwise>`

test('bounded MusicXML adapter preserves backup, forward, chord, voice and staff timing', () => {
  const parsed = parseBoundedMusicXmlScoreGraph(fixture, { sourceId: 'fixture' })
  assert.equal(parsed.ok, true)
  assert.equal(parsed.summary.measureCount, 1)
  assert.equal(parsed.summary.eventCount, 4)
  assert.equal(parsed.summary.pitchedNoteCount, 3)
  assert.equal(parsed.summary.restCount, 1)
  assert.deepEqual(parsed.summary.voices, [1, 2])
  assert.deepEqual(parsed.summary.staves, [1, 2])
  const [rest, c5, e5, c3] = parsed.scoreGraph.events
  assert.equal(rest.onset, 0)
  assert.equal(rest.duration, 0.5)
  assert.equal(c5.onset, 0.5)
  assert.equal(c5.duration, 0.5)
  assert.equal(c5.pitch, 72)
  assert.equal(e5.onset, 0.5)
  assert.equal(e5.isChordTone, true)
  assert.equal(e5.pitch, 76)
  assert.equal(c3.onset, 0)
  assert.equal(c3.duration, 1)
  assert.equal(c3.voice, 2)
  assert.equal(c3.staff, 2)
  assert.equal(parsed.automaticCorrectionAuthority, false)
})

test('bounded MusicXML adapter fails closed on multi-part and nonzero transposition', () => {
  const multi = fixture.replace('</score-partwise>', '<part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes></measure></part></score-partwise>')
  assert.throws(() => parseBoundedMusicXmlScoreGraph(multi), /EXACTLY_ONE_PART/)
  const transposed = fixture.replace('<staves>2</staves>', '<transpose><chromatic>2</chromatic></transpose><staves>2</staves>')
  assert.throws(() => parseBoundedMusicXmlScoreGraph(transposed), /TRANSPOSITION_UNSUPPORTED/)
})
