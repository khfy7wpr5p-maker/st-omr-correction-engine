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
| CE-POLY-02..20 | Polyphonic correction strengthening program | Completed | Research/shadow/readiness only |
| CE-EVIDENCE-01 | REAL_OMR gold eligibility / provenance gate | Completed | None |
| CE-EVIDENCE-02 | Event-level REAL_OMR annotation queue | Completed | None |
| CE-EVIDENCE-03 | Source-level calibration/final-evaluation leakage guard | Completed | None |
| CE-EVIDENCE-04 | Exact-hash teacher-approved Audiveris real-OMR seed + negative detector regression | Completed | None |
| CE-E2E-01 | End-to-end deterministic correction proposal, reversible projection and independent revalidation surface | Completed — PR #90 | Shadow/proposal; E11A unchanged |
| CE-E2E-02 | REAL_OMR correction-needed readiness gate | Completed — PR #91 | None |
| CE-DATA-01 | Collect exact-provenance teacher-reviewed correction-needed REAL_OMR cases | Next evidence milestone | None |
| CE-CAL-01 | Per-class source-separated calibration + risk/coverage evaluation | Blocked on CE-DATA-01 | None |
| CE-PROMOTE-* | Promote individual correction classes through readiness ladder | Blocked on evidence | Only after explicit gate |
| E12 | Optional visual second-opinion AI | Not started | Evidence only |

## Current automatic-correction boundary

E11A remains the only authorized automatic-correction slice. It keeps the resolver threshold at `0.90`, requires at least two independent evidence sources, allows exactly one `CHANGE_VOICE` patch, preserves source immutability, and requires an explicit post-correction `ACCEPT` revalidation result.

Expanded CE-E2E proposal support does not broaden E11A.

## CE-E2E architecture state

CE-E2E-01 established the executable shadow/proposal path for deterministic targets:

`detect → propose → patch → project → independently revalidate → revert if needed`

Current deterministic proposal classes:

- pitch;
- duration/rhythm;
- onset;
- voice;
- staff;
- bounded tie changes.

CE-E2E-02 then separated implementation capability from production readiness by requiring correction-needed, gold-eligible REAL_OMR teacher evidence for automatic-correction promotion.

## Real OMR evidence status

Current approved evidence:

- 1 independent exact-hash teacher-approved Audiveris source;
- 22 approved score events;
- 54 bounded `NO_CORRECTION_NEEDED` labels;
- 0 known correction-needed REAL_OMR event labels;
- 0 correction-safe accepted correction-needed REAL_OMR labels;
- 0 independent polyphonic REAL_OMR correction-event sources;
- 0 real teacher-gold calibration records carrying correction-engine confidence.

The seven SesliTab `real-omr` regression XML fixtures remain regression-only because source/license/golden/approval/integrity evidence is incomplete. They must not be counted as musical ground truth.

## Readiness policy

Expanded correction classes progress only through the fail-closed ladder:

`RESEARCH_ONLY → SHADOW_READY → TEACHER_REVIEW_READY → AUTO_CORRECTION_CANDIDATE → PRODUCTION_APPROVED`

For REAL_OMR correction promotion, `NO_CORRECTION_NEEDED`, controlled mutation, synthetic or provenance-ineligible records cannot substitute for real teacher-accepted correction-needed events.

No numeric threshold is invented by the readiness evaluator.

## Next milestone: CE-DATA-01

The next valid milestone is evidence acquisition, not broader auto-correction code.

CE-DATA-01 should collect real Audiveris failures with:

- exact source provenance and hash;
- raw MusicXML/OMR artifact identity;
- event location and class;
- original value;
- teacher-gold value;
- explicit teacher decision;
- correction-safety judgment where appropriate.

Only after source-separated evidence exists should CE-CAL-01 calculate class-specific precision, coverage, selective risk and calibration and support a later promotion decision.

## Closed production boundaries

No production MusicXML overwrite, corrected MusicXML serialization, SesliTab write-back, ScoreMosaic automatic patch/winner selection, SesliTab quality-gate bypass, machine-to-teacher provenance conversion, Audiveris mutation, provider/network/deployment change, multi-patch automatic transaction, confidence-threshold reduction or external-AI authority is granted by CE-E2E-01/02.
