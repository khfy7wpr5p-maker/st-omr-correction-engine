# CE-E2E-01 — End-to-End OMR Correction Proposals

Status: implemented on feature branch pending required CI/merge.

## Goal

Close the engineering gap between isolated anomaly detectors and a host-consumable correction proposal surface for the main OMR error classes requested by SesliTab/teacher review:

- pitch / wrong note;
- duration / rhythm;
- onset;
- voice;
- staff;
- tie.

Tuplet and cross-staff remain analysis/evidence classes unless an exact safe correction target exists.

## Implemented pipeline

`analyzeOmrCorrections(...)` now provides one bounded shadow-only entrypoint:

```text
ScoreGraph + validator/reference expectations
    -> pitch/duration/onset/staff/tie/tuplet/cross-staff analysis
    -> structural correction suggestion builder
    -> existing polyphonic voice candidate solver
    -> bounded shadow proposals + abstentions
```

The source graph is returned by identity and is never mutated by analysis.

## Exact-target proposal policy

A structural proposal is emitted only when the engine has an exact target value or uniquely identified relation endpoint.

Examples:

- `expectedPitch` / explicit pitch reference -> `CHANGE_PITCH` proposal;
- `expectedDurationQuarterBeats` -> `CHANGE_DURATION` proposal;
- `expectedOnsetQuarterBeats` or a deterministic chord anchor -> `CHANGE_ONSET` proposal;
- `expectedStaff` -> `CHANGE_STAFF` proposal;
- a tie start with a unique same-lane following note lacking a stop -> bounded `CHANGE_TIE` proposal that adds the missing stop;
- a tie stop with a unique preceding same-lane note lacking a start -> bounded `CHANGE_TIE` proposal that adds the missing start.

If the tie counterpart is missing or not uniquely correctable, the engine records an abstention instead of guessing.

## Audiveris tie interoperability fix

The Audiveris MusicXML adapter stores imported tie information in `metadata.tieTypes`. The previous tie detector read only legacy `metadata.ties` / `tieStart` / `tieStop` fields, so real imported tie evidence could be invisible to tie anomaly analysis.

CE-E2E-01 makes `tieTypes` a first-class input to tie detection and preserves importer/source ordering when locating counterpart notes, including ties that cross measure boundaries where note onsets are measure-local.

## Projection and revalidation

The reversible patch layer now supports:

- `CHANGE_PITCH`;
- `CHANGE_ONSET`;
- `CHANGE_VOICE`;
- `CHANGE_DURATION`;
- `CHANGE_STAFF`;
- dedicated bounded `CHANGE_TIE` updates to `metadata.tieTypes`.

Generic `CHANGE_RELATION` projection deliberately remains unsupported so a tie proposal cannot become arbitrary metadata mutation authority.

Independent revalidation v2 understands all supported projected fields, reruns pitch/onset/duration/staff/tie/tuplet anomaly checks, checks unintended event changes, and verifies reversibility.

## SesliTab boundary

`analyzeSesliTabCorrectionShadow(...)` exposes the expanded analyzer to the SesliTab adapter without changing the legacy voice-only function.

This entrypoint is intentionally shadow-only:

- `applyEnabled = false`;
- source graph remains immutable;
- no MusicXML serialization/write-back;
- no quality-gate bypass;
- no teacher provenance fabrication.

## Automatic-correction boundary remains unchanged

This work completes the **analysis + correction proposal** feature surface. It does not claim that every class is production-safe for unattended automatic mutation.

E11A remains the only authorized automatic path: one high-confidence `CHANGE_VOICE` patch, two independent evidence sources, mandatory projection and explicit post-projection `ACCEPT` revalidation.

Pitch/duration/onset/staff/tie proposals require real correction-needed teacher-gold evidence, calibration/risk evaluation, policy approval and security review before automatic production promotion.

## Scientific blocker that code cannot manufacture

The current REAL_OMR corpus still lacks enough independently teacher-labeled correction-needed examples to certify unattended automatic correction for the expanded classes. The engine therefore completes the executable proposal path while preserving `SHADOW_ONLY` / abstention behavior until evidence gates are met.
