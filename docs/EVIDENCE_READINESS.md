# Evidence Readiness

Status: **evidence infrastructure complete; production evidence incomplete**.

Current source baseline verified 2026-10-28: `main@bdaeb1e6fec8aee27d1cc72347f5be735af3cf30`. See [Current Status](CURRENT_STATUS.md) for fresh tests and historical CI evidence. Readiness capability, teacher evidence and production authority are distinct.

## What is complete

The repository now has the contracts and guards needed to collect and evaluate correction evidence without conflating synthetic experiments, source references, real OMR outputs and teacher gold:

- versioned correction taxonomy;
- explicit REAL_OMR / CONTROLLED_MUTATION / SYNTHETIC origin separation;
- teacher-owned correction decisions and provenance;
- exact source-byte mutation invariants;
- risk/coverage and calibration research metrics;
- event-level REAL_OMR annotation queue;
- real-OMR gold eligibility gate;
- source-level calibration/final-evaluation leakage guard;
- fail-closed external benchmark license/rights/checksum intake;
- cumulative production-readiness evaluator;
- one exact-hash teacher-approved Audiveris evidence seed.

## Controlled benchmark is not real OMR accuracy

The existing 32-case controlled mutation benchmark remains useful for regression and solver behavior:

- 16 / 16 high-evidence controlled cases resolve correctly;
- 16 / 16 partial-evidence guards remain `AMBIGUOUS`;
- selected-case controlled precision is 1.00;
- controlled coverage is 0.50.

These are controlled mutation results. They are **not** a universal OMR accuracy estimate and must not be presented as such.

## Reference score corpus is not an OMR correction-event corpus

The repository also has six pinned CC0 real-score excerpts that are teacher-approved and `GOLD_ELIGIBLE` as source references. They support musical structure and controlled-mutation design, but they are not automatically REAL_OMR correction events because source-score approval is different from observing and labeling an OMR error.

## Current exact REAL_OMR evidence

CE-EVIDENCE-04 pins the SesliTab `plan0-owner-approved-3-8` chain:

- upstream repository: `khfy7wpr5p-maker/seslitab-guitar-reader`;
- pinned revision: `7cdf08f784a38b9e50cfb465eab87cb65a6622a1`;
- source PDF SHA-256: `df4b8ea20b6420ebdf6b3e1d625016090105fed0c2f60a4e03874d3c3be2b9b9`;
- Audiveris MusicXML SHA-256: `009dd2fd4439a4138ed62cd0e0945a5611add8db38c58c7b0f90429ccd9970f6`;
- Audiveris project SHA-256: `7424e684825b51e8fd31596c94acd5ef008a84fbaecb5c0524222aaec8f8a21a`;
- approval SHA-256: `4cda4b23b71c738e0b7117d84a4d1256656e010359c5a4b9f1f1db474ad8dfc3`;
- Audiveris version: `5.11.0`;
- rights: CC0-1.0 as explicitly recorded by the upstream approval.

The exact score contains 22 represented note events. Because the existing whole-score approval says the source PDF and Audiveris MusicXML are musically equivalent and explicitly includes tie recognition, the correction engine can conservatively project only `NO_CORRECTION_NEEDED` labels covered by that approval:

- PITCH: 22;
- DURATION: 22;
- TIE: 10;
- total labels: 54;
- independent source count: 1.

The 54 labels must never be reported as 54 independent scores.

The approved snapshot is also a real-world negative regression. Current tie, duration and onset anomaly detectors produce zero findings on it.

## Accepted correction-needed event and separate structural evidence

SES-97 / PR #95 adds one exact-provenance Franz Benda measure 6 D4 DURATION event in `src/benchmark/teacherReviewedRealOmrCorrectionSeed.js`. Explicit teacher gold changes 1 quarter beat to 0.25 quarter beats; `teacherDecision=ACCEPT_CORRECTION`, `correctionNeeded=true`, `evidenceAvailable=true`, `correctionSafe=false`.

The executable combined event-gold regression reports:

| Count | Value |
|---|---:|
| Eligible REAL_OMR labels | 55 |
| Known-correct labels | 54 |
| Independent event-gold sources | 2 |
| Accepted correction-needed labels | 1 |
| Independent correction-needed sources | 1 |
| Correction-safe accepted labels | 0 |

With all lower evidence gates explicitly supplied, this reaches `TEACHER_REVIEW_READY` and rejects `AUTO_CORRECTION_CANDIDATE`. That scenario is not an empirical calibration result or a blanket class promotion.

SES-110 / PR #98 separately records Sor Op.35 No.13 structural failures at measures 21, 28, 29 and 31 in `src/benchmark/teacherReviewedRealOmrStructuralSeed.js`: missing events and voice/timing/onset collapse. Classification is teacher-verified, but corrected-revision approval and exact teacher structural patch values are absent. `readinessEligible=false`, `patchEligible=false`, `automaticCorrectionAuthority=false`, `correctionSafe=false`. These four measures must not be counted as four event-gold corrections or simple DURATION substitutions.

## Missing evidence

There are still zero correction-safe accepted correction-needed labels in the combined event-gold set. One correction-needed source and a readiness-ineligible structural packet do not establish source-separated per-class calibration or selective risk. No real teacher-gold confidence calibration run is demonstrated in this sync. Additional independent correction-needed sources, explicit teacher values and separately justified evidence thresholds remain required before CE-CAL-01 or expanded production promotion.

## Explicitly excluded material

SesliTab currently retains seven `tests/fixtures/real-omr/*-clean.xml` files as deterministic regression outputs. Its own inventory marks them `REGRESSION_OUTPUT_ONLY` and `REVIEW_REQUIRED`, with source PDF, expected golden MusicXML, approval record and integrity manifest absent.

Those files remain excluded from correction-engine musical ground truth until the missing source/license/golden/approval/integrity evidence is completed. Their existence does not justify a teacher-gold label.

## Class readiness

Readiness is evaluated from explicit gates and the particular evidence set. The known-correct-only regression reaches `SHADOW_READY`; the SES-97 combined regression reaches `TEACHER_REVIEW_READY` when lower gates are supplied, while automatic-correction candidacy remains blocked by missing correction-safe gold. Structural intake cannot override that result.

Voice 3 and Voice 4 remain below the unchanged automatic resolver threshold in their bounded fixtures: beam + temporal evidence reaches 0.70 rather than 0.90. No expanded pitch/duration/onset/staff/tie/tuplet/cross-staff class has acquired broad unattended correction authority.

## Automatic-correction boundary

E11A remains the only automatic-correction slice. Nothing in CE-POLY or CE-EVIDENCE authorizes broader production mutation.

Still closed:

- automatic pitch correction;
- automatic duration/onset correction;
- automatic tie/tuplet correction;
- automatic cross-staff/staff reassignment;
- multi-patch automatic transactions;
- production SesliTab write-back;
- ScoreMosaic winner selection or automatic patching;
- machine-generated teacher approval;
- confidence-threshold reduction;
- automated training feedback loop.

## Next scientifically valid milestone

The next milestone is external evidence collection, not more automatic-correction code. It requires additional independent, exact-provenance REAL_OMR source/output pairs and explicit event-level teacher decisions, with priority on genuine correction-needed polyphonic examples.

Once there are multiple source-disjoint teacher-gold sources and correction-engine confidence records, the existing split, calibration and risk tooling can be used without data leakage. Until then, production promotion of the expanded classes must fail closed.
