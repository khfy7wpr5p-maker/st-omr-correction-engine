# CE-MIDI-EVIDENCE-04 — Teacher-Gold Reliability Calibration

Status: RESEARCH_ONLY / FAIL-CLOSED

Fresh-read baseline: `4df4e460efa76cbd91fa082805a1ea05eb0969c9`.

## Purpose

Measure MIDI evidence reliability against independently teacher-verified ground truth, with `TRUSTED_REFERENCE` and `AUDIO_DERIVED` reported separately.

This stage does not grant correction authority, choose a production threshold, or assign a non-zero MIDI evidence weight.

## Admission rule

Only cases created with `MIDI_EVALUATION_ORACLE_TYPE.TEACHER_VERIFIED` and explicit approval metadata (`approved`, `verifierId`, `reviewedAt`) are admitted into reliability calibration.

Programmatic/synthetic oracle cases may test the calibration machinery, but they cannot count as measured teacher-gold reliability. Independent-reference cases also do not substitute for teacher-gold measurement in this program.

## Required strata

A complete CE-MIDI-EVIDENCE-04 measurement requires teacher-verified cases for both:

- `TRUSTED_REFERENCE`
- `AUDIO_DERIVED`

If either stratum has no eligible measurement record, the report status is `INSUFFICIENT_TEACHER_GOLD` and downstream integration must remain blocked.

## Metrics

For each source stratum the report preserves benchmark precision/recall metrics and computes from teacher-gold case outcomes:

- sample count
- Brier score
- expected calibration error and reliability bins
- precision / recall / risk / coverage curves
- abstention rate
- false-correction rate

The benchmark case's bounded alignment confidence is used as the confidence value; correctness is the teacher-oracle exact diagnostic-label-set outcome.

## Current repository reality

The fresh-read found no admitted real teacher-verified MIDI corpus containing both required source strata. Therefore this change supplies the calibration contract and fail-closed gate, but does **not** claim that `TRUSTED_REFERENCE` or `AUDIO_DERIVED` reliability has already been empirically established.

Tests use explicit test-only teacher-verification fixtures solely to validate the algorithm and must not be cited as product reliability measurements.

## Safety locks

- `authority: RESEARCH_ONLY`
- `productionReadiness: NOT_AUTHORIZED`
- `productionThreshold: null`
- `recommendedEvidenceWeight: null`
- `evidenceWeightApplied: 0`
- `automaticCorrectionAuthority: false`
- `correctionPatchesProduced: false`
- no pooling of trusted-reference and audio-derived reliability into one trust claim

## CE-MIDI-EVIDENCE-05 dependency

ScoreMosaic/host integration may consume MIDI evidence only behind a gate that verifies a CE-MIDI-EVIDENCE-04 report has status `MEASURED_TEACHER_GOLD` for every required source stratum. With the current repository corpus, that gate is expected to remain blocked until real teacher-gold MIDI cases are admitted and measured.
