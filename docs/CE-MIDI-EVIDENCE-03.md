# CE-MIDI-EVIDENCE-03 — Track/Part + Written/Sounding Pitch Contract

Status: SHADOW_ONLY / CONTRACT_COMPLETE

Fresh-read baseline: `khfy7wpr5p-maker/st-omr-correction-engine` main `635dd558d7ba651a7c6c080f38191d1eb0d64f3f`.

## Purpose

Add an explicit, deterministic host contract for MIDI track-to-score-part compatibility and transposing-instrument pitch comparison without turning MIDI into correction authority.

MIDI note numbers are treated as sounding pitch for comparison. ScoreGraph pitch may be declared as `SOUNDING` or `WRITTEN`. Written pitch is converted only in an ephemeral comparison view by an explicit integer `writtenToSoundingSemitones`; the source ScoreGraph is never rewritten.

## Contract

`createMidiInstrumentContract()` accepts:

- `partToTrackMap`: explicit score-part -> MIDI-track index or indices.
- `requirePartTrackMapping`: when true, every pitched score part must have an explicit mapping.
- `strictTrackOwnership`: when true, one MIDI track cannot be claimed by multiple score parts.
- `partPitchProfiles`: per-part pitch-domain and transposition declarations.
- global `scorePitchDomain` / legacy `pitchDomain` for single-domain cases.
- global `writtenToSoundingSemitones` / legacy `transpositionSemitones` when appropriate.

Per-part profiles support:

- `scorePitchDomain: SOUNDING | WRITTEN | UNKNOWN`
- `writtenToSoundingSemitones`: integer `-48..48` for `WRITTEN`
- optional `instrumentId`
- optional `instrumentName`

Instrument names and General MIDI programs remain provenance/context only. This stage does not infer transposition from a name, program number, channel, or track label.

## Examples

For a B-flat clarinet score where written C4 (`60`) sounds B-flat3 (`58`):

```js
{
  partToTrackMap: { P1: 0 },
  partPitchProfiles: {
    P1: {
      scorePitchDomain: 'WRITTEN',
      writtenToSoundingSemitones: -2,
      instrumentName: 'Clarinet in Bb'
    }
  }
}
```

The comparison pitch becomes `58`, while diagnostic provenance keeps both the original score pitch (`60`) and comparison pitch (`58`).

## Fail-closed cases

The comparison abstains as `MIDI_UNSUPPORTED_CONTEXT` when:

- score pitch domain is unknown,
- a written-pitch part has no explicit transposition,
- transposition moves a pitch outside MIDI `0..127`,
- required part-to-track mapping is missing,
- the supplied instrument contract is malformed or internally contradictory.

Legacy `transposingInstrument: true` without an explicit sounding domain or explicit written-to-sounding conversion remains unsupported.

## Safety locks

- No automatic instrument-name inference.
- No automatic transposition inference.
- No source ScoreGraph pitch mutation.
- No MIDI byte mutation.
- No MusicXML materialization or rewrite.
- MIDI evidence remains `SHADOW_EVIDENCE_ONLY`.
- Evidence weight remains `0`.
- No correction patches are produced.
- `AUDIO_DERIVED` gains no correctness authority.

## Relationship to CE-MIDI-EVIDENCE-04

This contract removes a known semantic ambiguity before reliability calibration. Calibration must stratify `TRUSTED_REFERENCE` and `AUDIO_DERIVED` evidence separately and must not assign a production evidence weight merely because transposition is now explicit.
