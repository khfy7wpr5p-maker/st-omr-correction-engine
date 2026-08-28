# Current Status

Last verified technical main baseline: `dba302cc4082b1c159d042d422964b862c858f99`

## Verified autonomous boundary

Stages E0-E10I are completed. E10I source-specific benchmark expansion is merged and exact-main CI verified through workflow run #44 (`33159925397`). The engine remains non-authoritative and shadow-first.

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
- pinned CC0 real-score reference corpus at 6 sources: 3 piano + 3 classical guitar;
- all six bounded review excerpts explicitly teacher-approved and `GOLD_ELIGIBLE`;
- controlled voice benchmark expanded from 24 to 32 cases using source-specific structure from Tárrega, Dowland, Webern and Paradis without changing solver policy.

## E10I final controlled benchmark result

The resolver threshold remains unchanged at 0.90.

- total controlled cases: 32;
- piano cases: 16;
- classical-guitar cases: 16;
- high-evidence cases: 16;
- high-evidence correctly resolved: 16 / 16;
- partial-evidence guard cases: 16;
- guard cases safely `AMBIGUOUS`: 16 / 16;
- incorrect resolved corrections: 0;
- overall controlled coverage: 0.50;
- precision among resolved controlled cases: 1.00.

Per-source mutation-case distribution:

- Satie, *Je te veux*: 12 cases — 6 high-evidence + 6 guard;
- Sor Op. 35 No. 13: 12 cases — 6 high-evidence + 6 guard;
- Tárrega, *Lágrima*: 2 cases — 1 high-evidence + 1 guard;
- Dowland, *Fantasia Number 7*: 2 cases — 1 high-evidence + 1 guard;
- Webern Op. 4 No. 4: 2 cases — 1 high-evidence + 1 guard;
- Paradis, *An das Klavier*: 2 cases — 1 high-evidence + 1 guard.

This is a controlled shadow benchmark, not a universal OMR accuracy claim.

## E10I source-specific completion

Tárrega, *Lágrima*:

- measure 6 uses the source's explicit high-voice beamed eighth-note line;
- separate low and middle voice context is preserved;
- the high-evidence mutation resolves to the approved upper voice;
- the matched partial-evidence case remains `AMBIGUOUS`.

Dowland, *Fantasia Number 7*:

- measure 7 preserves simultaneous high, low, upper-middle and lower-middle layers;
- the high-voice event uses source-consistent stem, beam and temporal context;
- the high-evidence mutation resolves to the approved upper voice;
- the matched partial-evidence case remains `AMBIGUOUS`.

Webern, Op. 4 No. 4 *So ich traurig bin*:

- the valid irregular opening measure is explicitly preserved and is not treated as an error;
- staff 2, measure 4 supplies a 2/8 beamed upper-voice pair with an overlapping lower voice;
- the high-evidence mutation resolves to the approved upper voice;
- removing beam evidence keeps the paired guard case `AMBIGUOUS`.

Paradis, *An das Klavier*:

- staff 2, measure 3 supplies a source-verified beamed upper line in the 2/4 piano texture;
- stem, beam and temporal continuity support the high-evidence voice assignment;
- removing stem evidence keeps the paired guard case `AMBIGUOUS`.

Every E10I source-specific benchmark event records a source anchor for traceability. The pinned sources remain immutable. No new solver rule, confidence relaxation, dependency or production mutation was introduced.

Implementation PRs:

- PR #23 — Tárrega + Dowland source-specific guitar slice;
- PR #25 — Webern + Paradis source-specific piano slice.

Exact-main `test-and-build` run #44 passed at `dba302cc4082b1c159d042d422964b862c858f99`.

## Approved real-score corpus state

The pinned CC0 corpus contains six bounded, teacher-approved/gold-eligible excerpts:

1. Piano — Satie, *Je te veux*, measures 1–8.
2. Classical guitar — Sor Op. 35 No. 13, measures 1–8.
3. Piano — Paradis, *An das Klavier*, measures 1–8.
4. Piano — Webern, Op. 4 No. 4 *So ich traurig bin*, measures 1–8.
5. Classical guitar — Tárrega, *Lágrima*, measures 1–8.
6. Classical guitar — Dowland, *Fantasia Number 7*, measures 1–8.

Teacher approval provenance remains bounded to the reviewed excerpts.

## Safety boundary

Not implemented or authorized:

- E11 controlled automatic correction;
- production MusicXML overwrite;
- automatic application of correction proposals;
- Audiveris runtime modification;
- SesliTab production quality-gate bypass;
- provider/network execution from the core;
- inferred relation mutation without a relation model;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 remains deliberately **NOT STARTED** and requires separate explicit user approval. The readiness report is evidence for a future decision only; it is not authorization.

E12 visual second-opinion AI is also not started. Any future AI component must be optional evidence only.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
