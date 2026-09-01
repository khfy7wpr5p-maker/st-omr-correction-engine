# CE-MIDI Sor Teacher Review Form

Work: Fernando Sor — Op.35 No.13, measures 1–8

Purpose: human musical verification of MIDI/ScoreGraph diagnostics. This document does not create teacher-gold by itself.

## Decision vocabulary

For each review item choose exactly one:

- `DIAGNOSTIC_CORRECT` — the MIDI diagnostic correctly identifies a real disagreement/error relevant to the score evidence.
- `DIAGNOSTIC_FALSE_POSITIVE` — the diagnostic is caused by representation/serialization/matching behavior and is not a real score error.
- `AMBIGUOUS` — available musical evidence is insufficient to decide safely.

Optional note: short musical reason.

## Sor baseline

The current benchmark window contains 97 ScoreGraph note events and 83 MIDI note events. It reports 83 `MIDI_EXACT_MATCH` and 14 `MIDI_AMBIGUOUS_MATCH` diagnostics with reason `POLYPHONIC_SAME_PITCH_MIDI_COLLAPSE`; it reports no missing, extra, pitch, onset, or duration conflict in this window.

The 14 ambiguity items are the teacher-review target. The engine must not pre-label them as correct or false-positive.

## Review procedure

1. Open the score/reference for the indicated event/location.
2. Compare the written polyphonic voices with the corresponding MIDI event.
3. Decide whether one serialized MIDI note legitimately represents simultaneous same-pitch notes in distinct written voices.
4. Record one decision from the vocabulary above and, when useful, a short reason.
5. Do not infer a correction merely because MIDI and notation differ.

## Review record template

Copy one block per generated Sor review item:

```text
reviewId: <generated review id>
diagnosticCode: MIDI_AMBIGUOUS_MATCH
scoreEventId: <generated score event id>
midiEventId: <generated midi event id>
ambiguityReason: POLYPHONIC_SAME_PITCH_MIDI_COLLAPSE
decision: <DIAGNOSTIC_CORRECT | DIAGNOSTIC_FALSE_POSITIVE | AMBIGUOUS>
note: <optional musical reason>
reviewerId: <human reviewer identifier>
reviewedAt: <ISO-8601 timestamp>
```

## Safety boundary

A completed form is review evidence only until machine validation confirms every required field and provenance relationship. No item may enable automatic correction, change MIDI `SHADOW_ONLY`, change `weight: 0`, establish independence, or promote host reliability by itself.
