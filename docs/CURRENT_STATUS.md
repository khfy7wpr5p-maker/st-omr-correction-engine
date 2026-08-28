# Current Status

Last verified technical main baseline: `c01cf43242570c22b4e1bec50bc9dc505a7c2e77`

## Verified autonomous boundary

Stages E0-E10D are merged and exact-main CI passed through workflow run #22 (`33152779505`). The engine remains non-authoritative and shadow-first.

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
- controlled teacher-approved voice-assignment mutation baseline.

## E10D benchmark result

Explicit musical approval was recorded for:

1. Piano — Satie, *Je te veux*, measures 1–8, piano staves 2–3.
2. Classical guitar — Sor Op. 35 No. 13, measures 1–8, staff 1.

Two controlled voice-assignment mutations were evaluated against the default shadow solver and resolver.

Verified outcome:

- total cases: 2;
- correct correction direction ranked first: 2 / 2;
- final automatically resolved: 0 / 2;
- ambiguous / abstained: 2 / 2;
- incorrect resolved corrections: 0;
- coverage: 0;
- precision: not applicable because no case was auto-resolved.

This is an intentionally fail-closed baseline. The evidence points in the correct direction, but current confidence is below the default resolution threshold. The threshold was not weakened to manufacture coverage.

## Safety boundary

Not implemented or authorized:

- production MusicXML overwrite;
- automatic application of correction proposals;
- Audiveris runtime modification;
- provider/network execution from the core;
- inferred relation mutation without a relation model;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 controlled automatic correction is deliberately NOT STARTED. Before E11, teacher-approved benchmark coverage must expand and stronger independent evidence must justify any automatic resolution.

E12 visual second-opinion AI is also not started. Any future AI component must be optional evidence only.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
