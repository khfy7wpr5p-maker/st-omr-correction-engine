# Current Status

Last verified technical main baseline: `a53ad5cde7709fa6d2c5e4c02c40d74970fc6b02`

## Verified autonomous boundary

Stages E0-E10E are merged and exact-main CI passed through workflow run #26 (`33155843705`). The engine remains non-authoritative and shadow-first.

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
- pure SesliTab-shaped shadow adapter contract;
- explicit teacher-approved provenance;
- deterministic benchmark reporting correction coverage separately from precision;
- pinned CC0 reference-source identities for one piano and one classical-guitar score;
- teacher-approved `GOLD_ELIGIBLE` bounded reference excerpts;
- source-verified Satie piano complexity and three-layer Sor classical-guitar structure;
- controlled teacher-approved voice-assignment mutation baseline;
- same-staff temporal voice-continuity evidence;
- expanded 8-case teacher-approved mutation benchmark with explicit guard cases.

## E10E benchmark result

The resolver threshold remains unchanged at 0.90.

Eight controlled mutations derived from the approved Satie and Sor excerpt structures were evaluated:

- total cases: 8;
- high-evidence cases: 4;
- guard / partial-evidence cases: 4;
- correct automatically resolved: 4 / 8;
- incorrect automatically resolved: 0;
- safely ambiguous / abstained: 4 / 8;
- overall controlled coverage: 0.50;
- precision among resolved controlled cases: 1.00.

All 8 cases ranked the teacher-approved correction direction first. The 4 high-evidence cases combined stem, beam and same-staff temporal continuity plus independent validator evidence and crossed the unchanged threshold. The 4 guard cases intentionally lacked one symbolic signal and remained below threshold.

A dedicated safety regression also confirms that even 0.90 symbolic confidence cannot resolve without an independent evidence class: removing validator evidence still forces `AMBIGUOUS`.

This remains a controlled shadow benchmark, not a universal OMR accuracy claim.

## Safety boundary

Not implemented or authorized:

- production MusicXML overwrite;
- automatic application of correction proposals;
- Audiveris runtime modification;
- provider/network execution from the core;
- inferred relation mutation without a relation model;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 controlled automatic correction is deliberately NOT STARTED. Before E11, teacher-approved benchmark coverage must expand across more real-score excerpts and evidence types.

E12 visual second-opinion AI is also not started. Any future AI component must be optional evidence only.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
