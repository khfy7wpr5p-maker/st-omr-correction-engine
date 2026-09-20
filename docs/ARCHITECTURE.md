# Architecture

## System boundary

`ST OMR Correction Engine` is a fail-closed semantic correction layer downstream of an OMR provider and upstream of host-side review/revalidation.

It does not replace Audiveris or another OMR recognizer. It consumes structured score evidence and validator findings, reasons about likely musical/structural errors, produces bounded correction proposals, and abstains when evidence is insufficient.

```text
OMR provider / imported MusicXML
        |
        v
Canonical ScoreGraph + host findings/evidence
        |
        v
Detectors / constraints
(pitch, duration, onset, tie, tuplet, staff, meter, polyphony)
        |
        +--------------------------+
        |                          |
        v                          v
Structural suggestion builder   Polyphonic voice solver
        |                          |
        +------------+-------------+
                     v
          Candidate resolver / abstention
                     |
                     v
          Reversible correction patches
                     |
                     v
        Shadow projection / safe in-memory projection
                     |
                     v
       Independent revalidation v2
                     |
                     v
      REAL_OMR correction-readiness gate
                     |
          +----------+----------+
          |                     |
          v                     v
     review/shadow         authorized narrow apply
                           (E11A voice-only)
```

The engine never grants itself production authority from a proposal alone.

## Implemented architecture layers

1. **Contracts and canonical correction model**
   - stable score/event identities;
   - versioned error taxonomy;
   - explicit evidence and correction-result contracts;
   - first-class abstention / ambiguous outcomes.

2. **Bounded analysis**
   - meter/rhythm/onset constraints;
   - pitch anomaly detection;
   - duration anomaly detection;
   - staff anomaly detection;
   - tie anomaly detection;
   - tuplet anomaly detection;
   - cross-staff reasoning;
   - polyphony-complexity metadata.

3. **Candidate generation and resolution**
   - bounded candidate graph;
   - structural suggestion builder;
   - polyphonic voice solver;
   - resolver requiring explicit evidence rather than “measure sums correctly” heuristics.

4. **Patch, projection and reversibility**
   - bounded operations for pitch, onset, voice, duration, staff and tie;
   - stale-`before` protection;
   - immutable source graph;
   - exact patch reversal;
   - unsupported generic relation mutation fails closed.

5. **Independent revalidation**
   - projected revisions are rechecked independently;
   - only fields authorized by the patch may change;
   - source/event identity and measure structure remain stable;
   - revert must reproduce the source graph.

6. **Evidence and benchmark layer**
   - teacher-gold correction-event schema;
   - REAL_OMR provenance/integrity eligibility;
   - source-level split leakage protection;
   - selective prediction and risk/coverage metrics;
   - confidence-calibration research harness;
   - teacher workload telemetry.

7. **Readiness layer**
   - generic ladder:
     `RESEARCH_ONLY → SHADOW_READY → TEACHER_REVIEW_READY → AUTO_CORRECTION_CANDIDATE → PRODUCTION_APPROVED`;
   - REAL_OMR-specific correction gate counts only gold-eligible, teacher-accepted, correction-needed real OMR evidence;
   - `NO_CORRECTION_NEEDED`, controlled mutation and synthetic labels cannot promote an expanded class to automatic correction;
   - automatic-correction candidacy additionally requires explicit `correctionSafe === true` evidence.

8. **Host adapters**
   - SesliTab shadow adapter exposes expanded end-to-end correction analysis without write-back;
   - ScoreMosaic integration remains shadow/evidence only;
   - core does not depend on host UI, playback, TAB, authentication, deployment or provider runtime.

## CE-E2E correction surface

CE-E2E-01 completed the executable proposal path for deterministic targets:

- pitch;
- duration/rhythm;
- onset;
- voice;
- staff;
- bounded tie changes.

Tuplet and cross-staff logic remain analysis/evidence surfaces when a safe exact mutation target is not available.

CE-E2E-02 added the fail-closed REAL_OMR readiness gate so that engineering capability cannot be mistaken for scientific evidence of safe unattended correction.

## Production automatic-correction boundary

E11A remains the only authorized automatic-correction slice.

A controlled automatic correction is limited to exactly one high-confidence `CHANGE_VOICE` patch and requires:

- resolver status `RESOLVED`;
- confidence at least `0.90`;
- at least two independent evidence sources;
- immutable projection success;
- mandatory post-projection independent/host revalidation;
- explicit `ACCEPT` result.

`REVIEW`, `BLOCK`, missing revalidation, failed projection or failed revalidation leaves the source graph selected.

There is no production MusicXML overwrite or corrected-MusicXML serialization path.

## Evidence boundary as of 2026-09-20

Current approved REAL_OMR evidence remains deliberately small:

- 1 independent exact-hash teacher-approved Audiveris source;
- 22 approved score events;
- 54 bounded `NO_CORRECTION_NEEDED` labels;
- 0 known correction-needed REAL_OMR event labels;
- 0 independent polyphonic REAL_OMR correction-event sources;
- 0 real teacher-gold calibration records carrying correction-engine confidence.

Therefore pitch, duration, onset, staff, tie, tuplets, cross-staff, Voice 3 and Voice 4 must not be promoted to broad unattended production correction solely from the current repository evidence.

## Dependency direction

Core contracts, analysis, resolver, patching, validation and readiness do not depend on adapters or optional AI.

Adapters depend on core contracts.

Optional AI may contribute evidence through explicit contracts, but it is never semantic authority and may not bypass readiness or teacher provenance.

## Non-goals / closed boundaries

The current architecture does not authorize:

- Audiveris runtime/provider modification;
- production MusicXML overwrite;
- SesliTab production write-back;
- ScoreMosaic winner selection or automatic patch merge;
- machine-generated teacher provenance;
- multi-patch unattended correction transactions;
- automatic pitch/duration/onset/staff/tie/tuplet/cross-staff mutation outside a separately approved evidence gate;
- confidence-threshold reduction;
- external AI dependency as a required production authority;
- universal OMR accuracy claims.
