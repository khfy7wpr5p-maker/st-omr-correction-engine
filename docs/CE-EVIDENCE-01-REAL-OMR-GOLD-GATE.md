# CE-EVIDENCE-01 — Real OMR Gold Eligibility Gate

Status: evidence infrastructure only. No production correction policy change.

## Purpose

The repository already distinguishes `REAL_OMR`, `CONTROLLED_MUTATION`, and `SYNTHETIC` teacher-gold event origins. Before this stage there was no dedicated gate preventing non-real examples from being passed into calibration/risk metrics by callers.

This stage adds a fail-closed eligibility layer for real OMR evidence.

## Calibration eligibility

A calibration-eligible event must:

- have `origin=REAL_OMR`;
- carry a stable event, source, engine and taxonomy identity;
- have a non-ambiguous teacher decision;
- contain a candidate value to evaluate against teacher gold;
- carry explicit provenance with teacher approval ID, source revision ID, exact source SHA-256 and engine version.

Controlled mutations and synthetic examples remain useful for regression and research, but cannot be silently promoted into the real OMR calibration set.

## Correctness label

`createRealOmrCalibrationRecord` derives the boolean `correct` label only by comparing the candidate value with the teacher-gold value. Confidence does not determine correctness, and the engine is not treated as musical authority.

## Dataset status

At the start of this stage, repository code search found the `REAL_OMR` event contract and test fixture, but no registered collection of real OMR teacher-gold correction events. This stage therefore does not claim that the >=500 or >=1000 real-event targets have been reached.

## Safety boundaries

- no teacher decision is synthesized;
- no controlled mutation is relabeled as real OMR;
- no automatic correction scope is expanded;
- no confidence threshold is changed;
- no training feedback loop is introduced;
- no external data is copied.

The next evidence step can prepare deterministic teacher-review batches, but gold promotion still requires explicit event-level teacher decisions.
