# Roadmap

| Stage | Scope | Status | Production mutation |
|---|---|---|---|
| E0 | Safe repo, CI, contracts, architecture/safety policy | Completed | None |
| E1 | Canonical correction data model | Completed | None |
| E2 | Candidate graph + bounded search | Completed | None |
| E3 | Meter/rhythm/onset constraints | Completed | None |
| E4 | Candidate resolver | Completed | Shadow only |
| E5 | Polyphonic voice solver | Completed | Shadow only |
| E6 | Classical guitar profile | Completed | Shadow only |
| E7 | Piano profile | Completed | Shadow only |
| E8 | Patch/revert model | Completed | Controlled projection only |
| E9 | SesliTab adapter | Completed as shadow contract | Shadow only |
| E10 | Teacher evidence + benchmark | Completed | Shadow only |
| E10A | Pinned CC0 piano/guitar reference corpus + gold-promotion gate | Completed | None |
| E10B | Bounded teacher-review queue for real-source excerpts | Completed | None |
| E10C | Refined source-verified musical review evidence | Completed | None |
| E10D | Explicit teacher approval + controlled real-score mutation baseline | Completed | None |
| E10E | Strengthened voice evidence + expanded approved mutation benchmark | Completed | Shadow only |
| E10F | Scale approved controlled mutation benchmark from 8 to 24 cases | Completed | Shadow only |
| E10G | Expand pinned CC0 real-score reference/review corpus from 2 to 6 sources | Completed | None |
| E10H | Record explicit teacher approval for four new bounded excerpts and expand gold-eligible source pool to 6 | Completed | None |
| E10I | Derive source-specific controlled mutations from newly approved excerpts | Completed — 32 total cases | Shadow only |
| E11 | Controlled automatic correction | In progress only through bounded E11A | Controlled in-memory only |
| E11A | Single-patch voice-only controlled automatic correction with mandatory revalidation | Completed | In-memory canonical graph only |
| INT-S0 | SesliTab integration compatibility / contract audit | Completed | None |
| INT-S1 | SesliTab exact-revision shadow-only evidence bridge | Completed | Shadow only |
| CE-POLY-01 | Fresh-read polyphony/correction gap analysis | Completed | None |
| CE-POLY-02 | Versioned polyphonic error taxonomy | Completed | None |
| CE-POLY-03 | Teacher-gold correction-event schema + source mutation invariant | Completed | None |
| CE-POLY-04 | Selective prediction precision/coverage/risk metrics | Completed | None |
| CE-POLY-05 | Confidence calibration research harness | Completed | None |
| CE-POLY-06 | Polyphony complexity metadata | Completed | None |
| CE-POLY-07 | Voice 3 readiness benchmark | Completed — current evidence remains below auto threshold | None |
| CE-POLY-08 | Voice 4 readiness benchmark | Completed — current evidence remains below auto threshold | None |
| CE-POLY-09 | Cross-staff research-only reasoning | Completed | None |
| CE-POLY-10 | Visual/bbox localization evidence contract | Completed | Evidence only |
| CE-POLY-11 | Tie anomaly detection | Completed | None |
| CE-POLY-12 | Tuplet anomaly detection | Completed | None |
| CE-POLY-13 | Duration anomaly detection | Completed | None |
| CE-POLY-14 | Onset anomaly detection | Completed | None |
| CE-POLY-15 | Bounded candidate generation for newly supported research classes | Completed | Research descriptors only |
| CE-POLY-16 | Independent revalidation v2 | Completed | Validation only |
| CE-POLY-17 | Teacher workload telemetry | Completed | None |
| CE-POLY-18 | ScoreMosaic shadow bridge v2 | Completed | Shadow only |
| CE-POLY-19 | External benchmark license/rights/checksum intake gate | Completed | None |
| CE-POLY-20 | Cumulative production-readiness evaluation | Completed | None |
| CE-EVIDENCE-01 | REAL_OMR gold eligibility / provenance gate | Completed | None |
| CE-EVIDENCE-02 | Event-level REAL_OMR annotation queue | Completed | None |
| CE-EVIDENCE-03 | Source-level calibration/final-evaluation leakage guard | Completed | None |
| CE-EVIDENCE-04 | Exact-hash teacher-approved Audiveris real-OMR seed + negative detector regression | Completed | None |
| E12 | Optional visual second-opinion AI | Not started | Evidence only |

## Current automatic-correction boundary

E11A remains the only authorized automatic-correction slice. It keeps the resolver threshold at `0.90`, requires at least two independent evidence sources, allows exactly one `CHANGE_VOICE` patch, preserves source immutability, and requires an explicit post-correction `ACCEPT` revalidation result. `REVIEW`, `BLOCK`, projection failure, missing revalidation or revalidation failure leaves the source graph selected.

CE-POLY and CE-EVIDENCE do **not** broaden E11A. Tie, tuplet, duration, onset, cross-staff, pitch, Voice 3 and Voice 4 expansion remain research/evidence work until class-specific readiness is established from real teacher-gold data.

## Real OMR evidence status

The collection/evaluation infrastructure is ready, but the current real-OMR evidence is intentionally small:

- 1 independent exact-hash teacher-approved Audiveris source;
- 22 approved score events;
- 54 bounded `NO_CORRECTION_NEEDED` labels: 22 pitch, 22 duration, 10 tie;
- 0 known correction-needed REAL_OMR event labels;
- 0 independent polyphonic REAL_OMR correction-event sources;
- 0 real teacher-gold calibration records carrying correction-engine confidence.

The seven SesliTab `real-omr` regression XML fixtures remain regression-only because source/license/golden/approval/integrity evidence is incomplete. They must not be counted as musical ground truth.

## Readiness policy

Expanded correction classes progress only through the cumulative fail-closed readiness ladder:

`RESEARCH_ONLY → SHADOW_READY → TEACHER_REVIEW_READY → AUTO_CORRECTION_CANDIDATE → PRODUCTION_APPROVED`

No numeric threshold is invented by the readiness evaluator. Automatic/production promotion requires the lower evidence gates plus an explicit teacher-gold-derived policy, human approval and security review. Current expanded classes remain `RESEARCH_ONLY` because the real correction-needed evidence is not yet sufficient.

## Verified integration shadow boundary

INT-S1 provides deterministic exact-revision-local event IDs, immutable reverse mapping, fail-closed `NoteObject[]` ↔ timeline ↔ structural-evidence binding, reuse of read-only beam evidence, no fabricated stem evidence, unique `VOICE_OVERLAP` target mapping, isolated per-target validator evidence and no apply/write-back capability.

CE-POLY-18 additionally provides a ScoreMosaic shadow evidence packet while preserving ScoreMosaic's locked boundaries: no winner selection, no automatic merge/correction, no Teacher Review mutation and no publication authority.

## Closed production boundaries

No production MusicXML overwrite, corrected MusicXML serialization, SesliTab write-back, ScoreMosaic automatic patch/winner selection, SesliTab quality-gate bypass, machine-to-teacher provenance conversion, Audiveris mutation, Render/provider/network/deployment change, multi-patch automatic transaction, automatic duration/onset/staff/tie/tuplet/pitch/beam/relation correction, confidence-threshold reduction, external AI model dependency, or training feedback loop is authorized by the completed CE-POLY/CE-EVIDENCE work.

The next scientifically valid milestone is not broader automatic correction code. It is expansion of exact-provenance, teacher-reviewed REAL_OMR evidence, especially correction-needed polyphonic cases, followed by leakage-safe calibration/risk evaluation.
