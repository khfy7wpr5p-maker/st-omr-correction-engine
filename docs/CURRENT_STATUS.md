# Current Status

Verified on 2026-10-28 against engine `main@bdaeb1e6fec8aee27d1cc72347f5be735af3cf30` (PR #99, merged 2026-09-29). This is a source/record synchronization; current consumer pins and live deployment are not newly qualified.

## Current merged capabilities

| Milestone | Repository evidence | Current boundary |
|---|---|---|
| SEM-05 | PR #94, `2425e4e5f2f96d36c2524055f9cba9966d2465e5` | Same-source semantic comparison only; not independent resolver evidence |
| CE-DATA-01 / SES-97 | PR #95, `589c996ee0945ab6fb1169e7f0c7abfeb56add35` | One eligible DURATION correction-needed teacher-gold event; `correctionSafe=false` |
| CE-STRUCT-01 / SES-107 | PR #96, `c11d35b35321c5d7761e7033ce4ce1d91cbeb1c2` | Explicit teacher-authored structural patches, immutable projection and exact rollback |
| CE-STRUCT browser / SES-108 prerequisite | PR #97, `7550e77b3ddff55e63e714b2dbc2b450b69771dc` | Separate bounded structural runtime and exact-source manifest |
| Sor structural evidence / SES-110 | PR #98, `1a3592327a3918e10da9b288ee39710fc4ebbf9b` | Four teacher-verified failure measures; no exact patch values or readiness promotion |
| Read-only browser analysis / SES-112 | PR #99, `bdaeb1e6fec8aee27d1cc72347f5be735af3cf30` | MusicXML text → suspicious measures; separate analysis IIFE/manifest; no apply/write-back |

## Current evidence and open records

The event-gold regression combines 54 known-correct labels with one accepted correction-needed DURATION label: 55 eligible labels, 2 independent sources, 1 correction-needed source and 0 correction-safe accepted events. The Sor structural packet is separate and `readinessEligible=false`; four failure measures are not four safe gold corrections.

Linear checked during this sync: SES-109 is **Todo**, despite older Notion wording saying In Progress; SES-110/111/112/114 are Done. CE-DATA-02 remains an unfinished evidence milestone. CE-CAL-01 needs a separately justified evidence threshold and calibration/final-evaluation source separation.

SES-263 is **Todo**: the teacher reports old suspicious marks remaining after correction and reanalysis. The current record has not established whether the host analyzed old XML, the new result still flags the measure, or presentation retained old results. Root cause/fix and live reanalysis behavior remain unverified. Existing analysis and CE-STRUCT integration completion must not be used to close it.

## Verification evidence

- Existing exact-main [test-and-build run 36605554522](https://github.com/khfy7wpr5p-maker/st-omr-correction-engine/actions/runs/36605554522): success, same `bdaeb1e6...` baseline.
- Existing exact-main [basic-pitch smoke run 36605554481](https://github.com/khfy7wpr5p-maker/st-omr-correction-engine/actions/runs/36605554481): success; not rerun locally.
- Fresh local `npm test`: **379 passed, 0 failed, 0 skipped**, both browser artifacts built; Node v24.22.1. CI declares Node 20.
- Fresh local `npm run check`: **PASS**.
- No private Sor source replay, consumer browser qualification, production deployment verification or new musical teacher review was performed.
- This update changes documentation only. A documentation PR requires its own PR-head CI; the successful baseline run is not that PR's result.

See [Architecture](ARCHITECTURE.md), [Evidence Readiness](EVIDENCE_READINESS.md), [Roadmap](ROADMAP.md) and the [2026-10-28 refresh](ARCHITECTURE-REALITY-REFRESH-2026-10-28.md).

## Historical implementation notes

The dated sections below retain implementation-time evidence. Their historical zero counts and old host baselines do not override the current summary above.

## 2026-09-29 CE-STRUCT browser-runtime prerequisite — merged

CE-STRUCT-01 is already merged on `main` at `c11d35b35321c5d7761e7033ce4ce1d91cbeb1c2`. PR #97 subsequently merged at `7550e77b3ddff55e63e714b2dbc2b450b69771dc`, packaging only that bounded teacher-structural surface for browser consumption.

Current branch behavior includes:

- exact Node/browser SHA-256 fingerprint parity;
- a bounded browser entry that does not expose automatic correction, approval, persistence, sharing or MusicXML write-back surfaces;
- an esbuild IIFE artifact with zero external imports;
- a manifest containing exact checked-out engine revision, artifact byte size and SHA-256;
- PR CI that checks out the actual PR head rather than GitHub's temporary merge ref before qualification;
- browser-vs-Node parity coverage across admitted teacher structural operations and hard-false authority flags.

No SesliTab production integration, Render/service/domain, deployment, persistence, authentication, automatic apply, final teacher approval, student sharing, learning, or MusicXML write-back is added by this prerequisite. Its historical merge gate has been satisfied; deployment is not established by that merge.

## 2026-09-29 CE-STRUCT-01 branch state

CE-STRUCT-01 was implemented in PR #96 and is merged on `main` at `c11d35b35321c5d7761e7033ce4ce1d91cbeb1c2`. It remains a teacher-authorized structural correction lane and does not authorize deployment or broader automatic correction.

Branch behavior now includes:

- a dedicated `TeacherStructuralPatchSetV1` contract isolated from `PATCH_OPERATION`;
- exact base `sourceId` + SHA-256 ScoreGraph fingerprint binding;
- explicit teacher-action authorization without conflating it with final teacher approval;
- explicit note/rest insertion and removal;
- teacher-authored duration, voice, staff, tie and existing-measure meter edits;
- atomic immutable projection with stale-before failure;
- deterministic inverse patches and exact rollback, including exact `eventIndex` restoration for non-final event removal;
- independent structural diff/revalidation with residual/resolved/new finding separation;
- a read-only SesliTab adapter that can mark only `teacherCorrectedRevisionEligible`;
- hard false authority flags for automatic apply, final teacher approval, student sharing, MusicXML write-back and learning.

E11A remains exactly the existing one-patch high-confidence `CHANGE_VOICE` automatic slice. Automatic DURATION and other structural correction are not enabled. No persistence, authentication, student-delivery, Render/service/domain, provider, or MusicXML serializer change is introduced.

Guardrails review added RED regressions for nested contract immutability, schema-version rejection, key-order-independent exact snapshots, standalone inverse usability, and non-final event-order rollback. RED run #239 failed on those new tests as expected; GREEN run #251 passed `npm test` and `npm run check`. Final post-documentation exact-head CI is tracked on PR #96 / Linear SES-107 / the CE-STRUCT-01 Notion handoff rather than pinning its run number here, because editing this file to record that run would create a new head that requires another qualification.

## 2026-09-27 SEM-05 — merged

SEM-05 implements a merged, shadow/reference semantic-consistency path against the qualified ST Score Semantic Engine contract. It compares a provenance-pinned SemanticSnapshot with the existing OMR ScoreGraph without granting correction authority.

The safety result is explicit:

- same-source Semantic Engine output is not independent evidence;
- semantic diagnostics never enter `candidate.evidence`;
- `createEvidence()` and `EVIDENCE_SOURCE` are unchanged;
- resolver thresholds and independent-source counting are unchanged;
- teacher-gold and REAL_OMR readiness are unchanged;
- E11A remains the only authorized narrow automatic-correction slice;
- source ScoreGraph remains immutable;
- no Python/Partitura runtime, REST/network service, Render change or MusicXML write-back is introduced.

PR #94 merged on 2026-09-27 at `2425e4e5f2f96d36c2524055f9cba9966d2465e5`; the implementation is present in the verified engine baseline.

## 2026-09-20 CE-E2E architecture synchronization

CE-E2E-01 (PR #90) completed the bounded end-to-end correction proposal path for exact deterministic targets:

`ScoreGraph / host evidence → anomaly detection → correction proposal → reversible patch → safe projection → independent revalidation → exact revert when needed`.

The executable proposal surface now covers pitch, duration/rhythm, onset, voice, staff and bounded tie changes. Tuplet and cross-staff remain analysis/evidence surfaces where the engine abstains when an exact safe mutation is not established.

CE-E2E-02 (PR #91) then separated implementation capability from production readiness. Expanded correction classes can advance only from gold-eligible, teacher-accepted, correction-needed REAL_OMR evidence. `NO_CORRECTION_NEEDED`, controlled-mutation, synthetic and provenance-ineligible labels cannot substitute for positive real-world correction evidence. Automatic-correction candidacy additionally requires admitted evidence with `correctionSafe === true`.

Current approved REAL_OMR evidence remains:

- 1 independent exact-hash teacher-approved Audiveris source;
- 22 approved score events;
- 54 bounded `NO_CORRECTION_NEEDED` labels;
- 0 accepted correction-needed REAL_OMR labels;
- 0 correction-safe accepted correction-needed REAL_OMR labels;
- 0 independent polyphonic REAL_OMR correction-event sources;
- 0 real teacher-gold calibration records carrying correction-engine confidence.

Therefore E11A remains the only automatic-correction slice. The main remaining blocker is acquisition and teacher review of genuine correction-needed REAL_OMR cases, followed by source-separated calibration/risk evaluation.

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
