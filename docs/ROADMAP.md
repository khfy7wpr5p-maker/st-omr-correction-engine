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
| E12 | Optional visual second-opinion AI | Not started | Evidence only |

E11A is the only authorized automatic-correction slice currently implemented. It keeps the resolver threshold at 0.90, requires at least two independent evidence sources, allows exactly one `CHANGE_VOICE` patch, preserves source immutability, and requires an explicit post-correction `ACCEPT` quality-gate result. `REVIEW`, `BLOCK`, projection failure, missing revalidation, or revalidation failure leaves the source graph selected.

No production MusicXML overwrite, SesliTab production integration, Audiveris mutation, multi-patch automatic transaction, or automatic duration/onset/staff/tie/tuplet/pitch/relation correction is authorized by E11A. Any expansion beyond E11A requires a new bounded evidence/design decision. E12 remains a separate approval boundary.
