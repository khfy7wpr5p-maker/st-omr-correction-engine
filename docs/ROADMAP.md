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
| E11 | Controlled automatic correction | NOT STARTED — explicit safety approval required | Safety gate |
| E12 | Optional visual second-opinion AI | Not started | Evidence only |

E0-E10I preserve source immutability and do not authorize production auto-correction. E10I adds balanced source-specific high-evidence/guard pairs from Tárrega, Dowland, Webern and Paradis while keeping the resolver threshold at 0.90. The verified 32-case controlled benchmark has zero incorrect resolved corrections, 0.50 coverage and 1.00 precision among resolved cases. E11 is a separate authorization boundary and remains NOT STARTED; completing E10I does not authorize it. E12 may only provide optional evidence and may not bypass deterministic validation or host quality gates.
