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
| E8 | Patch/revert model | Implemented, pending stage CI/merge | Controlled projection only |
| E9 | SesliTab adapter | Implemented, pending stage CI/merge | Shadow only |
| E10 | Teacher evidence + benchmark | Implemented, pending stage CI/merge | Shadow only |
| E11 | Controlled automatic correction | NOT STARTED — explicit safety approval required | Safety gate |
| E12 | Optional visual second-opinion AI | Not started | Evidence only |

E0-E10 preserve source immutability and do not authorize production auto-correction. E11 is a separate authorization boundary.
