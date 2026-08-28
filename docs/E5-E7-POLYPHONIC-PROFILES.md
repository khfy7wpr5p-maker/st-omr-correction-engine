# E5-E7 Polyphonic Voice Solver and Profiles

E5 adds a bounded shadow-mode voice candidate generator. It only varies event identities explicitly marked ambiguous by the host/validator and never mutates input events.

E6 adds a classical-guitar profile with soft stem-direction priors, single-staff expectation and notation hints. Fingering/string indications remain semantic hints; this module does not decide playable TAB positions.

E7 adds a piano profile with cross-staff support. `VOICE != STAFF` and `HAND != STAFF` are explicit invariants; upper/lower staff is never treated as a hard right/left-hand assignment.

All profile knowledge is advisory evidence. It cannot bypass hard violations, resolver thresholds or host-side validation.
