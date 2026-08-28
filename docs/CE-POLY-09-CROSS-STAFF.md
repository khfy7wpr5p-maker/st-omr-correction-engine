# CE-POLY-09 — Cross-Staff Detection / Reasoning

Adds a research-only analyzer that treats `voice` and `staff` as independent identities.

It reports:

- the same voice appearing on more than one staff;
- beam groups spanning multiple staves;
- no correction patch.

This stage deliberately does not perform `CHANGE_STAFF`, infer hand identity, or authorize automatic cross-staff correction. Ambiguous notation remains a teacher-review/research concern until dedicated teacher-gold evidence is available.
