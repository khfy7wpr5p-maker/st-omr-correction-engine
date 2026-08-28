# Current Status

Last verified technical main baseline: `0e0e70b7d70bd6b527b0d2b3357ad5ba48a151d5`

## Verified autonomous boundary

Stages E0-E10I are completed. E11 has started only through the explicitly authorized, narrowly bounded E11A voice-only controlled automatic correction gate. E11A implementation is merged and exact-main CI is verified through workflow run #48 (`33164701779`).

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
- 32-case balanced controlled benchmark using source-specific structure from Tárrega, Dowland, Webern and Paradis;
- E11A controlled in-memory automatic application for a single high-confidence `CHANGE_VOICE` patch only after mandatory host revalidation returns `ACCEPT`.

## E10I controlled benchmark baseline

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

This remains a controlled benchmark and is not a universal OMR accuracy claim.

## E11A controlled automatic correction

E11A was explicitly authorized by the user on 2026-08-28 and implemented in PR #29. Issue #27 is closed as completed.

A correction reaches the automatic in-memory apply path only when all of these conditions hold:

- resolver status is `RESOLVED`;
- result confidence is at least `0.90`;
- result carries at least two independent evidence sources;
- exactly one patch is proposed;
- operation is `CHANGE_VOICE`;
- patch confidence is at least `0.90`;
- patch carries at least two independent evidence sources;
- immutable projection succeeds;
- post-correction revalidation is supplied and succeeds;
- host quality gate explicitly returns `ACCEPT`.

`REVIEW` or `BLOCK` revalidation retains the exact source graph. Missing or failed revalidation fails closed to `BLOCK`. The raw source graph is never overwritten.

Controlled E11A regression result:

- 16 / 16 high-evidence teacher-approved cases reached controlled apply only after explicit `ACCEPT` revalidation;
- 16 / 16 guard cases remained unapplied and did not enter revalidation;
- incorrect controlled automatic applications: 0;
- non-voice automatic operations remain rejected;
- `minConfidence = 0.90` remains unchanged.

Technical verification:

- implementation PR: #29;
- implementation head: `2734fb9f2b1600b315346b1b929ed826fa4d370d`;
- exact-head `test-and-build`: run #47 (`33164669931`) — SUCCESS;
- squash-merged main: `0e0e70b7d70bd6b527b0d2b3357ad5ba48a151d5`;
- exact-main `test-and-build`: run #48 (`33164701779`) — SUCCESS.

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

Still not implemented or authorized by E11A:

- production MusicXML overwrite;
- SesliTab production integration or quality-gate bypass;
- Audiveris runtime modification;
- automatic duration correction;
- automatic onset correction;
- automatic staff/cross-staff reassignment;
- automatic tie or tuplet mutation;
- automatic pitch correction;
- automatic beam/relation/arpeggio/glissando mutation;
- multiple-patch automatic transactions;
- pickup or irregular-measure normalization;
- provider/network execution from the core;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 expansion beyond the verified E11A voice-only gate requires a separate bounded evidence/design decision. E12 visual second-opinion AI is not started and remains a separate approval boundary.

## Repository governance

`main` is protected by active repository ruleset `main` (id `21713803`). Pull requests are required, `test-and-build` is a strict required status check, branch deletion and non-fast-forward updates are blocked, and no bypass actor is configured.
