# CE-MIDI-EVIDENCE-05 — ScoreMosaic / Host Reliability-Gated Shadow Integration

Status: IMPLEMENTED / CURRENTLY_BLOCKED_PENDING_REAL_MEASUREMENT

Fresh-read baseline: `923e3fbca3464c2105f729a4a16ed612bd5745e9`.

## Purpose

Connect MIDI second-opinion evidence to the ScoreMosaic/host boundary only after CE-MIDI-EVIDENCE-04 has produced measured teacher-gold reliability for both required source strata.

This is a shadow integration. It does not make MIDI a winner, quorum voter, correction authority, patch source, or MusicXML mutation source.

## Reliability gate

`evaluateMidiHostReliabilityGate()` requires a CE-MIDI-EVIDENCE-04 report with:

- schema `st_omr_midi_teacher_gold_reliability`
- status `MEASURED_TEACHER_GOLD`
- `teacherGoldOnly: true`
- `measuredReliabilityAvailable: true`
- measured strata for both `TRUSTED_REFERENCE` and `AUDIO_DERIVED`
- positive teacher-gold sample count and calibration/selective-prediction output in each stratum
- no automatic correction authority
- no correction patches
- no production threshold
- no recommended evidence weight
- applied MIDI evidence weight exactly `0`

If these conditions are not satisfied, MIDI evidence and diagnostics are omitted from the host packet and the integration status is `BLOCKED`.

## Shadow-enabled packet

When the reliability gate is satisfied, `createScoreMosaicMidiShadowEvidencePacket()` adds MIDI as a **separate** channel alongside the existing ScoreMosaic disagreement evidence. It never appends MIDI items into the canonical ScoreMosaic evidence list used by existing consumers.

The supplied MIDI evidence result must itself prove:

- `mode: SHADOW_ONLY`
- `authority: SHADOW_EVIDENCE_ONLY`
- exact source ScoreGraph identity
- score bytes/structure unchanged
- MIDI bytes unchanged
- no automatic correction authority
- no correction patches
- every MIDI evidence item has weight `0`
- source type is calibrated `TRUSTED_REFERENCE` or `AUDIO_DERIVED`

## Current repository reality

CE-MIDI-EVIDENCE-04 found no admitted real teacher-verified MIDI corpus covering both required source strata. Therefore the production repository's current default outcome is intentionally:

`MIDI host integration = BLOCKED`

This is not an implementation failure. It is the contractually required fail-closed state until real teacher-gold reliability is measured.

Tests use test-only measured fixtures to prove that the gate can open without changing any authority boundary; those fixtures are not empirical reliability claims.

## Locked boundaries

- MIDI winner selection: false
- MIDI quorum mutation: false
- MIDI candidate deletion: false
- MIDI teacher-revision mutation: false
- MIDI MusicXML merge: false
- MIDI patch application: false
- MIDI correction authority: false
- MIDI evidence-weight override: false

A future program may alter these boundaries only with new explicit authorization and measured evidence; CE-MIDI-EVIDENCE-05 does not do so.
