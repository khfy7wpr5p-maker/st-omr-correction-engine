# ST-OMR Correction Engine — Architecture Reality Refresh — 2026-09-20

## Purpose

Synchronize architecture documentation with the actual verified repository behavior after CE-E2E-01 and CE-E2E-02.

This refresh is documentation-only. It does not change runtime behavior, thresholds, automatic-correction authority, provider integration or production write-back.

## Verified source baseline

Repository: `khfy7wpr5p-maker/st-omr-correction-engine`

Verified baseline used for this report:

- `main`: `122725676cb1f2cb0eddb05d791bd11abea13b32`;
- PR #90: CE-E2E-01 — end-to-end OMR correction proposal surface;
- PR #91: CE-E2E-02 — correction-needed REAL_OMR readiness gate;
- merge-post `test-and-build` after PR #91: run #187 — SUCCESS.

## Architectural conclusion

The project has crossed an important engineering boundary:

```text
recognizer output
→ semantic anomaly analysis
→ bounded correction proposal
→ reversible patch
→ safe projection
→ independent revalidation
→ evidence/readiness gate
```

The repository now contains a coherent correction-engine pipeline rather than isolated detectors.

However, engineering completeness of a proposal path is intentionally not equivalent to permission for broad unattended correction.

## Current component map

### 1. Input and canonicalization

The engine consumes structured OMR/MusicXML-derived evidence rather than owning recognition.

Primary internal model:

- canonical ScoreGraph;
- stable event IDs;
- measure/timing/voice/staff/pitch metadata;
- explicit evidence contracts.

### 2. Detection and constraints

Implemented analysis covers:

- pitch anomalies;
- duration/rhythm anomalies;
- onset anomalies;
- meter constraints;
- voice/polyphony conflicts;
- staff anomalies;
- tie anomalies;
- tuplet anomalies;
- cross-staff context.

### 3. Proposal generation

When a deterministic target exists, the engine may produce a bounded shadow proposal.

CE-E2E-01 supports exact proposal paths for:

- pitch;
- duration;
- onset;
- voice;
- staff;
- tie.

Tuplet/cross-staff continue to abstain where an exact safe mutation is not established.

### 4. Patch safety

Correction patches are:

- bounded;
- auditable;
- reversible;
- protected against stale `before` state;
- projected onto a new graph rather than mutating the source.

Generic unrestricted relation mutation remains closed.

### 5. Revalidation

Independent revalidation verifies:

- only authorized fields changed;
- event identity is stable;
- measure structure is stable;
- relevant detectors/constraints are rerun;
- reverse patching reproduces the source graph.

### 6. Readiness and scientific evidence

CE-E2E-02 prevents proposal capability from becoming self-authorization.

For REAL_OMR correction evidence to support promotion, it must be:

- REAL_OMR origin;
- exact-provenance gold-eligible;
- actually correction-needed;
- teacher-accepted;
- evidence-backed.

For automatic-correction candidacy, admitted evidence must also include an explicitly correction-safe case.

Known-correct examples remain useful for false-positive regression but cannot prove correction safety.

## Production boundary

Only E11A has automatic apply authority.

E11A remains:

- voice-only;
- one patch;
- high-confidence;
- at least two independent evidence sources;
- immutable in-memory projection;
- mandatory post-projection revalidation;
- explicit `ACCEPT` before selection.

No production corrected-MusicXML serialization/write-back exists.

## Evidence state

Current approved real-OMR evidence:

| Metric | Current state |
|---|---:|
| Independent exact-hash approved REAL_OMR sources | 1 |
| Approved score events | 22 |
| NO_CORRECTION_NEEDED labels | 54 |
| Correction-needed REAL_OMR labels | 0 |
| Correction-safe accepted correction-needed labels | 0 |
| Independent polyphonic correction-event sources | 0 |
| Real teacher-gold calibration records with engine confidence | 0 |

This is sufficient to test false-positive restraint on one approved source, but not sufficient to authorize expanded automatic correction.

## Architecture decisions

1. **Recognizer separation remains permanent.** The correction engine is not another OMR recognizer.
2. **Source immutability remains non-negotiable.** Raw/source MusicXML is never overwritten by analysis.
3. **Abstention remains a valid successful result.** Ambiguity is not forced into a guess.
4. **Proposal authority and apply authority remain separate.**
5. **REAL_OMR evidence is provenance-gated.**
6. **Known-correct labels cannot substitute for correction-needed labels.**
7. **Controlled/synthetic mutations cannot masquerade as real-world OMR correction evidence.**
8. **Teacher provenance must be genuine and human-originated.**
9. **Independent revalidation remains mandatory at production boundaries.**
10. **E11A remains the only current automatic-correction slice.**

## Main remaining work

The next bottleneck is data/evidence rather than proposal-engine implementation.

Recommended sequence:

1. **CE-DATA-01:** collect exact-provenance Audiveris failure examples.
2. Obtain event-level teacher-gold corrections for real correction-needed events.
3. Split evidence by source for calibration vs final evaluation.
4. Measure class-specific precision, coverage, risk/coverage and confidence calibration.
5. Promote only evidence-supported classes through the readiness ladder.
6. Design corrected-MusicXML serialization/write-back only after a separate explicit production decision.

## Guardrail conclusion

No evidence supports broad “all OMR errors are now automatically corrected” language.

The defensible current statement is:

> The engine can detect and propose bounded corrections for the main deterministic error classes and can safely project, independently revalidate and revert those proposals. Broad unattended automatic correction remains intentionally gated by missing real correction-needed teacher-gold evidence.

That distinction is part of the architecture, not an unfinished coding accident.
