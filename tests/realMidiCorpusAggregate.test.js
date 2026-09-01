import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateRealMidiCorpusMeasurements } from '../src/index.js'

const metrics = Object.freeze({
  alignment_success_rate: 1,
  event_match_coverage: 0.5,
  pitch_agreement_rate: 1,
  onset_agreement_rate: 1,
  duration_agreement_rate: 0.75,
  ambiguous_match_rate: 0.25,
  unaligned_rate: 0,
  extra_note_diagnostic_rate: 0,
  missing_note_diagnostic_rate: 0,
})

function benchmark(scoreEvents, midiEvents, diagnosticCounts = {}) {
  return { authority: 'EVALUATION_ONLY', automaticCorrectionAuthority: false, scoreEvents, midiEvents, metrics, diagnosticCounts }
}

test('aggregate keeps real MIDI corpus measurement descriptive and non-authoritative', () => {
  const result = aggregateRealMidiCorpusMeasurements([
    { id: 'a', instrumentProfile: 'classical-guitar', benchmark: benchmark(10, 9, { MIDI_EXACT_MATCH: 5 }) },
    { id: 'b', instrumentProfile: 'piano', benchmark: benchmark(20, 18, { MIDI_EXACT_MATCH: 7, MIDI_SCORE_NOTE_MISSING: 2 }) },
  ])
  assert.equal(result.workCount, 2)
  assert.equal(result.scoreEvents, 30)
  assert.equal(result.midiEvents, 27)
  assert.equal(result.diagnosticCounts.MIDI_EXACT_MATCH, 12)
  assert.equal(result.diagnosticCounts.MIDI_SCORE_NOTE_MISSING, 2)
  assert.equal(result.macroMetrics.pitch_agreement_rate, 1)
  assert.equal(result.interpretation.descriptiveOnly, true)
  assert.equal(result.interpretation.precisionRecallAvailable, false)
  assert.equal(result.interpretation.measuredReliabilityEligible, false)
  assert.equal(result.interpretation.automaticCorrectionAuthority, false)
})

test('aggregate rejects authority promotion and malformed rates', () => {
  assert.throws(() => aggregateRealMidiCorpusMeasurements([{ id: 'bad', benchmark: { ...benchmark(1, 1), automaticCorrectionAuthority: true } }]), /must not have automatic correction authority/)
  assert.throws(() => aggregateRealMidiCorpusMeasurements([{ id: 'bad', benchmark: { ...benchmark(1, 1), metrics: { ...metrics, pitch_agreement_rate: 2 } } }]), /finite rate/)
})
