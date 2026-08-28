# Current Status

Last verified technical main baseline: `d4c279de5e779b47681687e0f73270a601ae7768`

## Verified autonomous boundary

Stages E0-E10G are merged and exact-main CI passed through workflow run #32 (`33157106743`). The engine remains non-authoritative and shadow-first.

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
- same-staff temporal voice-continuity evidence;
- teacher-approved controlled voice benchmark scaled to 24 balanced cases;
- pinned CC0 real-score reference corpus scaled to 6 sources: 3 piano + 3 classical guitar;
- four new source-specific teacher-review packets remain PENDING.

## E10F controlled benchmark result

The resolver threshold remains unchanged at 0.90.

- total controlled cases: 24;
- piano cases: 12;
- classical-guitar cases: 12;
- high-evidence cases: 12;
- high-evidence correctly resolved: 12 / 12;
- partial-evidence guard cases: 12;
- guard cases safely `AMBIGUOUS`: 12 / 12;
- incorrect resolved corrections: 0;
- overall controlled coverage: 0.50;
- precision among resolved controlled cases: 1.00.

This is a controlled shadow benchmark, not a universal OMR accuracy claim.

## E10G real-score corpus state

The pinned CC0 corpus now contains 6 sources:

Teacher-approved/gold-eligible excerpts:

1. Piano — Satie, *Je te veux*, measures 1–8.
2. Classical guitar — Sor Op. 35 No. 13, measures 1–8.

New `REFERENCE_ONLY` / `PENDING` review sources:

3. Piano — Paradis, *An das Klavier*, measures 1–8.
4. Piano — Webern, Op. 4 No. 4 *So ich traurig bin*, measures 1–8.
5. Classical guitar — Tárrega, *Lágrima*, measures 1–8.
6. Classical guitar — Dowland, *Fantasia Number 7*, measures 1–8.

No musical approval is inferred for the four new sources. They cannot become gold without explicit matching teacher review.

## Safety boundary

Not implemented or authorized:

- production MusicXML overwrite;
- automatic application of correction proposals;
- Audiveris runtime modification;
- provider/network execution from the core;
- inferred relation mutation without a relation model;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 controlled automatic correction is deliberately NOT STARTED. Before E11, teacher-approved benchmark evidence must expand across additional real-score excerpts and evidence types.

E12 visual second-opinion AI is also not started. Any future AI component must be optional evidence only.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
