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
| E10I | Derive source-specific controlled mutations from newly approved excerpts | Completed — 32 total cases, all four new excerpts covered | Shadow only |
| E11 | Controlled automatic correction | In progress only through bounded E11A | Controlled in-memory only |
| E11A | Single-patch voice-only controlled automatic correction with mandatory revalidation | Completed | In-memory canonical graph only |
| INT-S0 | SesliTab integration compatibility / contract audit | Completed | None |
| INT-S1 | SesliTab exact-revision shadow-only evidence bridge | Completed | Shadow only |
| E12 | Optional visual second-opinion AI | Not started | Evidence only |

## Current automatic-correction boundary

E11A is the only authorized automatic-correction slice currently implemented. It keeps the resolver threshold at `0.90`, requires at least two independent evidence sources, allows exactly one `CHANGE_VOICE` patch, preserves source immutability, and requires an explicit post-correction `ACCEPT` revalidation result. `REVIEW`, `BLOCK`, projection failure, missing revalidation or revalidation failure leaves the source graph selected.

INT-S0 and INT-S1 do **not** expand the E11A automatic-correction boundary. They establish only the safe read-only contract between SesliTab-shaped host evidence and the existing shadow candidate/resolver path.

## Verified SesliTab shadow boundary

INT-S1 now provides:

- deterministic exact-revision-local event IDs;
- immutable reverse mapping to SesliTab source-note identity;
- fail-closed `NoteObject[]` ↔ timeline ↔ structural-evidence binding;
- reuse of SesliTab's existing read-only beam evidence;
- no fabricated stem evidence;
- exact unique `VOICE_OVERLAP` target mapping;
- isolated per-target validator evidence;
- unchanged resolver threshold and scoring;
- diagnostic-only shadow output with no apply/write-back capability.

With the currently pinned SesliTab host evidence, beam continuity can be available while stem direction is normally absent. Missing stem evidence remains missing; the bridge does not lower `0.90` to compensate.

## Closed production boundaries

No production MusicXML overwrite, corrected MusicXML serialization, SesliTab write-back, SesliTab quality-gate bypass, machine-to-teacher provenance conversion, Audiveris mutation, Render/provider/network/deployment change, multi-patch automatic transaction, or automatic duration/onset/staff/tie/tuplet/pitch/beam/relation correction is authorized by E11A or INT-S1.

Any production-facing SesliTab correction step requires a new bounded design covering at minimum machine-proposal provenance/revision identity and exact-revision post-projection revalidation. E12 remains a separate approval boundary.
