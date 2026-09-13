# CE-E2E-02 — Real OMR Correction Readiness Gate

Status: implemented on feature branch pending required CI/merge.

## Goal

Prevent correct/no-change teacher-gold examples from being mistaken for evidence that an expanded automatic correction class is safe.

CE-E2E-01 completed the executable proposal/projection/revalidation surface for pitch, duration, onset, voice, staff and bounded tie changes. CE-E2E-02 closes the evidence-policy gap between that engineering capability and production promotion.

## Fail-closed evidence scope

`evaluateRealOmrCorrectionReadiness(...)` admits automatic-correction promotion evidence only from correction events that are all of the following:

- `origin === REAL_OMR`;
- `correctionNeeded === true`;
- `teacherDecision === ACCEPT_CORRECTION`;
- `evidenceAvailable === true`.

For automatic-correction candidacy, at least one admitted correction event must also carry `correctionSafe === true`.

The gate explicitly excludes controlled mutations and synthetic cases from real-OMR correction-needed counts.

## Current approved real-OMR seed

The existing exact-hash Audiveris 5.11.0 seed remains valuable negative-regression evidence:

- 1 independent approved real-OMR source;
- 22 score events;
- 54 bounded teacher-approved labels;
- 54 `NO_CORRECTION_NEEDED` labels;
- 0 accepted correction-needed labels;
- 0 correction-safe accepted correction-needed labels.

Those 54 labels protect against false positives on a known-correct OMR result, but they cannot promote pitch, duration, tie or any other expanded class toward automatic correction.

## Readiness behavior

Even if all shadow engineering gates are supplied as passing, the current approved real-OMR seed cannot advance beyond `SHADOW_READY` for correction readiness because correction-needed teacher-gold is absent.

A controlled mutation marked `ACCEPT_CORRECTION` also cannot satisfy the gate because its origin is not `REAL_OMR`.

A real correction-needed teacher-gold event that is not explicitly correction-safe may reach teacher-review readiness when the lower gates are satisfied, but it is capped below `AUTO_CORRECTION_CANDIDATE`.

## Production boundary

This stage does not:

- widen E11A;
- authorize pitch/duration/onset/staff/tie automatic mutation;
- authorize production MusicXML write-back;
- convert machine proposals into teacher approval;
- invent a numeric reliability threshold;
- treat no-correction labels as positive correction evidence;
- treat controlled/synthetic mutations as real OMR evidence.

E11A remains the only automatic slice: one bounded high-confidence `CHANGE_VOICE` patch with independent evidence and mandatory post-projection `ACCEPT` revalidation.

## Remaining external evidence blocker

The next scientifically valid work is data acquisition/review, not broader automatic-correction code: collect exact-provenance real Audiveris failures, obtain event-level teacher decisions for actual correction-needed cases, then populate leakage-safe calibration and final-evaluation splits.

Until that evidence exists, expanded classes remain proposal/shadow capabilities rather than unattended production mutation authority.
