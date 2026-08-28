# Current Status

Last verified technical main baseline entering this status synchronization: `ff39ae05f2de074f2b4dab9a8e62909d372a187e`.

Exact-main `test-and-build`: run #103 (`33195531405`) — SUCCESS.

This document is considered synchronized when the PR containing it is merged through protected `main` and that merge's exact-main required CI also passes.

## 2026-08-28 CE-POLY / CE-EVIDENCE expansion

CE-POLY-02 through CE-POLY-20 are completed. The expansion added versioned error taxonomy, teacher-gold correction-event contracts, source-byte mutation invariants, selective-prediction risk/coverage metrics, calibration research metrics, polyphony-complexity metadata, Voice 3/4 readiness benchmarks, research-only cross-staff reasoning, visual-localization evidence, tie/tuplet/duration/onset anomaly detection, bounded research candidate generation, independent revalidation v2, teacher-workload telemetry, a ScoreMosaic shadow bridge, fail-closed external benchmark intake, and cumulative production-readiness evaluation.

CE-EVIDENCE-01 through CE-EVIDENCE-04 are also completed:

- REAL_OMR gold eligibility requires explicit provenance, exact source SHA-256, engine version and non-ambiguous teacher decision;
- controlled mutation and synthetic cases cannot silently enter real-OMR calibration evidence;
- event-level REAL_OMR annotation queues keep teacher-owned decisions empty until explicitly supplied;
- calibration and final evaluation splits cannot share event IDs or source SHA-256 values;
- one exact-hash, teacher-approved Audiveris 5.11.0 evidence seed from SesliTab is pinned as a bounded real-world regression source;
- that seed contains 22 score events and projects 54 `NO_CORRECTION_NEEDED` labels: 22 pitch, 22 duration and 10 tie labels;
- the 54 labels still represent exactly one independent source and are never reported as 54 independent scores;
- the approved seed produces zero tie, duration or onset anomaly findings and therefore protects against false positives on that known-correct real Audiveris result.

Current real-OMR evidence boundary:

- independent exact-hash teacher-approved REAL_OMR sources usable by this engine: 1;
- approved real-OMR score events represented in the seed: 22;
- approved no-correction labels derived from the exact whole-score approval: 54;
- known correction-needed REAL_OMR event labels: 0;
- independent polyphonic REAL_OMR correction-event sources: 0;
- calibration records with correction-engine confidence on real teacher-gold events: 0;
- a leakage-safe calibration/final-evaluation split cannot yet be populated from the single approved source alone.

This means the evidence infrastructure is complete for safe collection, but expanded correction classes remain data-limited. Voice 3, Voice 4, cross-staff, tie, tuplet, duration, onset and pitch must remain `RESEARCH_ONLY` unless later real teacher-gold evidence satisfies the readiness gates. No numeric production threshold has been invented to bypass the missing data.

The seven SesliTab `tests/fixtures/real-omr/*-clean.xml` files remain `REGRESSION_OUTPUT_ONLY / REVIEW_REQUIRED` on SesliTab main because source PDF, expected golden MusicXML, approval record and integrity chain are incomplete. They are not promoted to musical ground truth.

No CE-POLY or CE-EVIDENCE package broadened the production automatic-correction boundary. E11A remains the only automatic-correction slice: one high-confidence `CHANGE_VOICE` patch, exact immutable projection, mandatory independent host revalidation and explicit `ACCEPT` before in-memory selection.

## Verified autonomous boundary

Stages E0-E10I are completed. E11 has started only through the explicitly authorized, narrowly bounded E11A voice-only controlled automatic correction gate. E11A remains the only automatic-correction slice.

The SesliTab integration track has additionally completed two non-production stages:

- compatibility audit / contract mapping;
- bounded shadow-only evidence bridge.

Neither stage authorizes SesliTab write-back, production correction, quality-gate bypass or teacher-approval inference.

Verified capabilities include:

- provider-agnostic correction contracts and explicit abstention states;
- stable score/event identities;
- bounded candidate search;
- meter and onset constraints;
- deterministic candidate resolver requiring independent evidence classes;
- bounded polyphonic voice candidate generation;
- classical-guitar and piano soft-prior profiles;
- explicit `VOICE != STAFF` and `HAND != STAFF` invariants;
- immutable correction projection with stale-before protection;
- reversible projection for currently supported patch fields;
- fail-closed unsupported relation correction;
- pure SesliTab-shaped shadow analysis;
- deterministic exact-revision-local SesliTab bridge event IDs and immutable reverse mapping;
- fail-closed SesliTab `NoteObject[]` ↔ timeline ↔ structural-evidence binding;
- reuse of SesliTab's existing read-only beam evidence without duplicating raw MusicXML parsing;
- exact `VOICE_OVERLAP` target mapping by measure/voice/staff/onset with abstention on non-unique mappings;
- per-target validator-evidence isolation;
- preservation of validator classification/severity/details in evidence;
- no fabricated stem evidence and no confidence-threshold reduction;
- explicit teacher-approved provenance;
- deterministic benchmark reporting correction coverage separately from precision;
- same-staff temporal voice-continuity evidence;
- pinned CC0 real-score reference corpus at 6 sources: 3 piano + 3 classical guitar;
- all six bounded review excerpts explicitly teacher-approved and `GOLD_ELIGIBLE`;
- 32-case balanced controlled benchmark using source-specific structure from Tárrega, Dowland, Webern and Paradis;
- E11A controlled in-memory automatic application for a single high-confidence `CHANGE_VOICE` patch only after mandatory host revalidation returns `ACCEPT`.

## E10I controlled benchmark baseline

The resolver threshold remains unchanged at `0.90`.

- total controlled cases: 32;
- piano cases: 16;
- classical-guitar cases: 16;
- high-evidence cases: 16;
- high-evidence correctly resolved: 16 / 16;
- partial-evidence guard cases: 16;
- guard cases safely `AMBIGUOUS`: 16 / 16;
- incorrect resolved corrections: 0;
- overall controlled coverage: 0.50;
- precision among resolved controlled cases: 1.00.

Per-source mutation-case distribution:

- Satie, *Je te veux*: 12 cases — 6 high-evidence + 6 guard;
- Sor Op. 35 No. 13: 12 cases — 6 high-evidence + 6 guard;
- Tárrega, *Lágrima*: 2 cases — 1 high-evidence + 1 guard;
- Dowland, *Fantasia Number 7*: 2 cases — 1 high-evidence + 1 guard;
- Webern Op. 4 No. 4: 2 cases — 1 high-evidence + 1 guard;
- Paradis, *An das Klavier*: 2 cases — 1 high-evidence + 1 guard.

This remains a controlled benchmark and is not a universal OMR accuracy claim.

## E11A controlled automatic correction

E11A was explicitly authorized on 2026-08-28 and implemented in PR #29. Issue #27 is closed as completed.

A correction reaches the automatic in-memory apply path only when all of these conditions hold:

- resolver status is `RESOLVED`;
- result confidence is at least `0.90`;
- result carries at least two independent evidence sources;
- exactly one patch is proposed;
- operation is `CHANGE_VOICE`;
- patch confidence is at least `0.90`;
- patch carries at least two independent evidence sources;
- immutable projection succeeds;
- post-correction revalidation is supplied and succeeds;
- host quality gate explicitly returns `ACCEPT`.

`REVIEW` or `BLOCK` revalidation retains the exact source graph. Missing or failed revalidation fails closed to `BLOCK`. The raw source graph is never overwritten.

Controlled E11A regression result:

- 16 / 16 high-evidence teacher-approved cases reached controlled apply only after explicit `ACCEPT` revalidation;
- 16 / 16 guard cases remained unapplied and did not enter revalidation;
- incorrect controlled automatic applications: 0;
- non-voice automatic operations remain rejected;
- `minConfidence = 0.90` remains unchanged.

E11A technical verification:

- implementation PR: #29;
- implementation head: `2734fb9f2b1600b315346b1b929ed826fa4d370d`;
- exact-head `test-and-build`: run #47 (`33164669931`) — SUCCESS;
- squash-merged main: `0e0e70b7d70bd6b527b0d2b3357ad5ba48a151d5`;
- exact-main `test-and-build`: run #48 (`33164701779`) — SUCCESS.

## SesliTab shadow-only evidence bridge

The bridge was explicitly authorized on 2026-08-28 after the compatibility audit. Issue #33 is closed as completed through PR #34.

Pinned host baseline used for this stage:

- `seslitab-guitar-reader` main: `95f11139929d1e3d65bd6c295794c316bb04ca84`;
- host CI: run #237 (`33165513082`) — SUCCESS.

The bridge consumes existing SesliTab-shaped read-only data only:

- exact `NoteObject[]`;
- structural-validation `timeline`;
- structural `findings`;
- existing `evidence.noteEvidence` beam metadata.

It does not parse raw MusicXML and does not duplicate the SesliTab validator.

Verified bridge behavior:

- event IDs are deterministic and exact-revision-local;
- each event has immutable reverse mapping to source revision, source note index, physical measure key, structural sequence index and source voice;
- note/timeline/evidence mismatch blocks before candidate generation;
- only `VOICE_OVERLAP` currently selects a voice target;
- target mapping requires a unique exact match by `measureKey + voice + staff + actual onset`;
- zero or multiple target matches abstain as `AMBIGUOUS`;
- unrelated findings do not create voice candidates;
- complete valid primary beam groups can become read-only beam-continuity metadata;
- malformed/incomplete beam evidence is suppressed rather than guessed;
- current SesliTab structural evidence does not provide stem direction, so the bridge does not invent it;
- with current host-like beam + temporal evidence but no stem, the tested alternative voice confidence remains `0.70`, below the unchanged `0.90` threshold, so the resolver abstains;
- an explicitly source-provided valid stem can be passed through and can reach the pre-existing `0.90` shadow boundary when beam and temporal evidence also agree;
- source notes and structural result remain unchanged;
- bridge output exposes no apply/write-back capability.

Bridge technical verification:

- implementation PR: #34;
- implementation head: `2c4a0767c7e1dc8aa33878c2ed59ee29b4c503e6`;
- exact-head `test-and-build`: run #53 (`33175005768`) — SUCCESS;
- squash-merged main: `6ad46875d7ac49c3dea0b36e1c8c9ca0ebb3dbeb`;
- exact-main `test-and-build`: run #54 (`33175087307`) — SUCCESS.

Detailed contract: `docs/SESLITAB-SHADOW-EVIDENCE-BRIDGE.md`.

## Approved real-score corpus state

The pinned CC0 corpus contains six bounded, teacher-approved/gold-eligible excerpts:

1. Piano — Satie, *Je te veux*, measures 1–8.
2. Classical guitar — Sor Op. 35 No. 13, measures 1–8.
3. Piano — Paradis, *An das Klavier*, measures 1–8.
4. Piano — Webern, Op. 4 No. 4 *So ich traurig bin*, measures 1–8.
5. Classical guitar — Tárrega, *Lágrima*, measures 1–8.
6. Classical guitar — Dowland, *Fantasia Number 7*, measures 1–8.

Teacher approval provenance remains bounded to the reviewed excerpts.

## Safety boundary

Still not implemented or authorized:

- production MusicXML overwrite or serialization of corrected output;
- SesliTab production correction/write-back integration;
- conversion of a shadow `RESOLVED` result into SesliTab quality-gate `ACCEPT`;
- conversion of machine proposals into teacher approval or teacher-correction provenance;
- Audiveris runtime/provider modification;
- Render/network/deployment changes;
- automatic duration correction;
- automatic onset correction;
- automatic staff/cross-staff reassignment;
- automatic tie or tuplet mutation;
- automatic pitch correction;
- automatic beam/relation/arpeggio/glissando mutation;
- multiple-patch automatic transactions;
- pickup or irregular-measure normalization;
- confidence-threshold reduction;
- provider/network execution from the core;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 expansion beyond the verified E11A voice-only gate requires a separate bounded evidence/design decision. Any production-facing SesliTab write-back requires a separately designed machine-proposal provenance/revision path and exact-revision post-projection revalidation. E12 visual second-opinion AI is not started and remains a separate approval boundary.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
