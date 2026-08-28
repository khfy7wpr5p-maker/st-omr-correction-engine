# Current Status

Last verified technical main baseline: `d15446aef430ac46190b07f58d84348512c2a1bf`

## Verified autonomous boundary

Stages E0-E10H are completed. E10I is now in progress with its first bounded source-specific guitar benchmark slice merged and exact-main CI verified through workflow run #40 (`33159385019`). The engine remains non-authoritative and shadow-first.

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
- all six bounded review excerpts are explicitly teacher-approved and `GOLD_ELIGIBLE`;
- controlled voice benchmark expanded from 24 to 28 cases using source-specific Tárrega and Dowland structure without changing solver policy.

## Current controlled benchmark result

The resolver threshold remains unchanged at 0.90.

- total controlled cases: 28;
- piano cases: 12;
- classical-guitar cases: 16;
- high-evidence cases: 14;
- high-evidence correctly resolved: 14 / 14;
- partial-evidence guard cases: 14;
- guard cases safely `AMBIGUOUS`: 14 / 14;
- incorrect resolved corrections: 0;
- overall controlled coverage: 0.50;
- precision among resolved controlled cases: 1.00.

Per-source mutation-case distribution:

- Satie, *Je te veux*: 12 cases — 6 high-evidence + 6 guard;
- Sor Op. 35 No. 13: 12 cases — 6 high-evidence + 6 guard;
- Tárrega, *Lágrima*: 2 cases — 1 high-evidence + 1 guard;
- Dowland, *Fantasia Number 7*: 2 cases — 1 high-evidence + 1 guard;
- Webern Op. 4 No. 4: 0 mutation cases in this slice;
- Paradis, *An das Klavier*: 0 mutation cases in this slice.

This is a controlled shadow benchmark, not a universal OMR accuracy claim.

## E10I first source-specific slice

The first E10I slice is limited to already teacher-approved measures 1–8 from the two new classical-guitar sources.

Tárrega, *Lágrima*:

- measure 6 uses the source's explicit high-voice beamed eighth-note line;
- the controlled context retains separate low and middle voice material from the same measure;
- one high-evidence mutation resolves to the approved upper voice;
- the matched guard case removes a required symbolic evidence class and remains `AMBIGUOUS`.

Dowland, *Fantasia Number 7*:

- measure 7 is represented with simultaneous high, low, upper-middle and lower-middle layers from the source;
- the high-voice event is evaluated with source-consistent stem/beam and temporal context;
- one high-evidence mutation resolves to the approved upper voice;
- the matched guard case removes beam evidence and remains `AMBIGUOUS`.

Each source-specific benchmark event records a source anchor for traceability. These cases do not mutate the pinned source and do not add new solver rules.

PR #23 was squash-merged. Exact-main `test-and-build` run #40 passed at `d15446aef430ac46190b07f58d84348512c2a1bf`.

E10I remains **in progress**. The next bounded work is source-specific evidence from Webern and then Paradis. Confident voice-3/voice-4 correction behavior must not be added by inventing new guitar stem priors; any such solver-policy expansion requires separate evidence and review.

## Approved real-score corpus state

The pinned CC0 corpus contains six bounded, teacher-approved/gold-eligible excerpts:

1. Piano — Satie, *Je te veux*, measures 1–8.
2. Classical guitar — Sor Op. 35 No. 13, measures 1–8.
3. Piano — Paradis, *An das Klavier*, measures 1–8.
4. Piano — Webern, Op. 4 No. 4 *So ich traurig bin*, measures 1–8.
5. Classical guitar — Tárrega, *Lágrima*, measures 1–8.
6. Classical guitar — Dowland, *Fantasia Number 7*, measures 1–8.

Teacher approval provenance remains unchanged and bounded to the reviewed excerpts.

## Safety boundary

Not implemented or authorized:

- production MusicXML overwrite;
- automatic application of correction proposals;
- Audiveris runtime modification;
- provider/network execution from the core;
- inferred relation mutation without a relation model;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 controlled automatic correction is deliberately NOT STARTED. E10I completion does not authorize E11.

E12 visual second-opinion AI is also not started. Any future AI component must be optional evidence only.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
