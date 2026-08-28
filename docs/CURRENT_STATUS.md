# Current Status

Last verified main baseline before E10D: `7cdf084dc1b93232dfdbc4854005fa65ff9051f4`

## Verified autonomous boundary

Stages E0-E10C are merged and exact-main CI passed through workflow run #19 (`33152222483`). The engine remains non-authoritative and shadow-first.

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
- immutable PENDING / APPROVED / REJECTED teacher-review packets;
- source-verified review complexity for Satie piano and three-layer Sor classical guitar.

## E10D approval boundary

Explicit musical approval was supplied on 2026-08-28 for the two bounded review packets:

1. Piano — Satie, *Je te veux*, measures 1–8, piano staves 2–3.
2. Classical guitar — Sor Op. 35 No. 13, measures 1–8, staff 1.

E10D records that approval immutably, promotes only those pinned sources to `GOLD_ELIGIBLE`, and adds two controlled voice-assignment mutation cases. These cases operate on canonical event copies and never modify the source score.

The first benchmark is intentionally fail-closed: it requires the solver to rank the approved correction direction first while the default resolver must still abstain if confidence remains below its production threshold. No threshold is weakened to manufacture coverage.

## Safety boundary

Not implemented or authorized:

- production MusicXML overwrite;
- automatic application of correction proposals;
- Audiveris runtime modification;
- provider/network execution from the core;
- inferred relation mutation without a relation model;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 controlled automatic correction is deliberately NOT STARTED and requires a separate explicit safety authorization after representative teacher-approved benchmark evidence.

E12 visual second-opinion AI is also not started. Any future AI component must be optional evidence only.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
