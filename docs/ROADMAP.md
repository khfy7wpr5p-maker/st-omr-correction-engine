# Roadmap

| Stage | Scope | Status | Production mutation |
|---|---|---|---|
| E0 | Safe repo, CI, contracts, architecture/safety policy | Completed | None |
| E1 | Canonical correction data model | Implemented, pending stage CI/merge | None |
| E2 | Candidate graph + bounded search | Implemented, pending stage CI/merge | None |
| E3 | Meter/rhythm/onset constraints | Implemented, pending stage CI/merge | None |
| E4 | Candidate resolver | Implemented, pending stage CI/merge | Shadow only |
| E5 | Polyphonic voice solver | Not started | Shadow only |
| E6 | Classical guitar profile | Not started | Shadow only |
| E7 | Piano profile | Not started | Shadow only |
| E8 | Patch/revert model | Not started | Controlled, not auto-applied |
| E9 | SesliTab adapter | Not started | Shadow only |
| E10 | Teacher evidence + benchmark | Not started | Shadow only |
| E11 | Controlled automatic correction | Not started | Safety gate; explicit approval required |
| E12 | Optional visual second-opinion AI | Not started | Evidence only |

E0-E10 must preserve source immutability and may be developed without production auto-correction. E11 is a separate authorization boundary.
