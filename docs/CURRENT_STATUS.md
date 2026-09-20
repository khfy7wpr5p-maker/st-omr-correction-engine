# Current Status

Last verified production baseline before this documentation refresh:

- `main` commit: `122725676cb1f2cb0eddb05d791bd11abea13b32`;
- merge source: PR #91 — **CE-E2E-02: gate readiness on correction-needed real OMR evidence**;
- merge-post `test-and-build`: run #187 — **SUCCESS**;
- preceding feature: PR #90 — **CE-E2E-01: complete end-to-end OMR correction proposal surface**.

This document describes repository behavior at that verified baseline. The architecture-refresh PR changes documentation only and does not widen runtime correction authority.

## Current engineering state

### Completed

- E0-E10I baseline architecture and benchmark/evidence infrastructure;
- E11A bounded voice-only controlled automatic correction;
- CE-POLY-02 through CE-POLY-20;
- CE-EVIDENCE-01 through CE-EVIDENCE-04;
- CE-E2E-01 end-to-end correction proposal/projection/revalidation surface;
- CE-E2E-02 REAL_OMR correction-needed readiness gate;
- SesliTab shadow correction entrypoint;
- reversible patch projection for pitch, onset, voice, duration, staff and bounded tie changes;
- independent revalidation v2;
- fail-closed REAL_OMR provenance and correction-safety gating.

## CE-E2E-01 result

The engine can now execute this bounded engineering chain for exact targets:

```text
OMR/ScoreGraph evidence
→ detect anomaly
→ build correction proposal
→ create reversible patch
→ project safely
→ independently revalidate
→ revert exactly when needed
```

Supported deterministic proposal classes include:

- pitch;
- duration/rhythm;
- onset;
- voice;
- staff;
- bounded tie changes.

Tuplets and cross-staff remain analysis/research surfaces where exact safe correction is not established.

## CE-E2E-02 result

Readiness promotion is now explicitly separated from mere implementation capability.

For expanded automatic-correction promotion, positive evidence must be:

- `origin === REAL_OMR`;
- gold-eligible under exact provenance/integrity rules;
- `correctionNeeded === true`;
- teacher decision `ACCEPT_CORRECTION`;
- `evidenceAvailable === true`;
- and, for auto-correction candidacy, at least one admitted event must carry `correctionSafe === true`.

The gate explicitly prevents these from being treated as positive automatic-correction evidence:

- `NO_CORRECTION_NEEDED` labels;
- controlled mutation labels;
- synthetic labels;
- ineligible or incomplete-provenance REAL_OMR labels.

## Current REAL_OMR evidence

The approved real-OMR seed currently provides:

- 1 independent exact-hash teacher-approved Audiveris 5.11.0 source;
- 22 approved score events;
- 54 `NO_CORRECTION_NEEDED` labels:
  - 22 pitch;
  - 22 duration;
  - 10 tie;
- 0 accepted correction-needed REAL_OMR labels;
- 0 correction-safe accepted correction-needed REAL_OMR labels;
- 0 independent polyphonic REAL_OMR correction-event sources;
- 0 real teacher-gold calibration records carrying correction-engine confidence.

The 54 labels are valuable negative-regression evidence: they protect known-correct material from false positive correction. They do not prove that expanded automatic correction is safe.

## Production automatic-correction boundary

E11A remains the only automatic-correction slice.

It authorizes one bounded high-confidence `CHANGE_VOICE` patch only when all required evidence, projection and post-correction revalidation gates pass.

Still not authorized:

- production MusicXML overwrite/serialization;
- broad automatic pitch correction;
- broad automatic duration correction;
- broad automatic onset correction;
- automatic staff/cross-staff reassignment;
- automatic tie/tuplet mutation;
- multiple-patch unattended correction;
- SesliTab production write-back;
- ScoreMosaic automatic winner/merge authority.

## Primary remaining blocker

The main blocker is now evidence acquisition rather than missing proposal-engine code.

The next scientifically valid milestone is:

1. collect exact-provenance real Audiveris failures;
2. label actual correction-needed events with teacher decisions;
3. retain source-level separation between calibration and final evaluation;
4. measure per-class precision, coverage, risk/coverage and confidence calibration;
5. promote classes through the readiness ladder only when their evidence supports it.

Teacher labels and correction provenance must remain genuinely human-originated; they are not to be fabricated by automation.

## Repository governance

The existing fail-closed repository model remains in force:

- source graphs are immutable;
- abstention is a valid outcome;
- proposals do not imply apply authority;
- independent revalidation is mandatory at production boundaries;
- no evidence class may self-promote by lowering thresholds or inventing teacher-gold;
- documentation changes do not alter production behavior.
