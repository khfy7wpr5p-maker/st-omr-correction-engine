# Evidence Readiness

Status: **evidence infrastructure complete; production evidence incomplete**.

Technical baseline entering this closure: `ff39ae05f2de074f2b4dab9a8e62909d372a187e` with exact-main `test-and-build` run #103 (`33195531405`) — SUCCESS.

This document becomes authoritative when its own protected-main merge and exact-main CI pass.

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

## Missing evidence

The following values remain zero:

- known correction-needed REAL_OMR event labels: 0;
- independent polyphonic REAL_OMR correction-event sources: 0;
- real teacher-gold calibration records carrying correction-engine confidence: 0.

A source-disjoint calibration/final-evaluation split cannot be populated from one independent source. Therefore no empirical calibration, precision/risk or production-readiness claim for expanded correction classes can be made from the current real-OMR evidence.

## Explicitly excluded material

SesliTab currently retains seven `tests/fixtures/real-omr/*-clean.xml` files as deterministic regression outputs. Its own inventory marks them `REGRESSION_OUTPUT_ONLY` and `REVIEW_REQUIRED`, with source PDF, expected golden MusicXML, approval record and integrity manifest absent.

Those files remain excluded from correction-engine musical ground truth until the missing source/license/golden/approval/integrity evidence is completed. Their existence does not justify a teacher-gold label.

## Class readiness

The expanded correction areas remain `RESEARCH_ONLY` under the cumulative readiness model:

- Voice 3;
- Voice 4;
- cross-staff;
- pitch;
- duration;
- onset;
- tie;
- tuplet.

Voice 3 and Voice 4 also remain below the unchanged current automatic resolver threshold in their bounded readiness fixtures: beam + temporal evidence reaches 0.70 rather than 0.90.

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
