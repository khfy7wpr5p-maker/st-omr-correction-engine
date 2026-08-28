# Current Status

Last verified technical baseline: `dc1063efa1e1f200f4834afc063f37871bbebf99`

## Verified autonomous boundary

Stages E0-E10B are technically merged and exact-main CI passed through workflow run #15 (`33151194218`). The engine remains non-authoritative and shadow-first.

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
- pending review packets cannot silently become gold;
- approved packet and source identity must match exactly before gold eligibility.

## Current human-review boundary

Two real-source excerpts are queued as `PENDING`:

1. Piano — Satie, *Je te veux*, opening measures 1–8, piano staves 2–3.
2. Classical guitar — Sor Op. 35 No. 13, home-theme measures 1–8, staff 1.

No teacher approval has been invented or assumed. These sources remain reference-only until an actual musical review occurs.

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
