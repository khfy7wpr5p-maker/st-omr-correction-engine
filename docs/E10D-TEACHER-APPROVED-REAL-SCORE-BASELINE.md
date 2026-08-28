# E10D — Teacher-Approved Real-Score Baseline

E10D records the explicit musical approval supplied on 2026-08-28 for the two bounded E10 review packets and promotes only those pinned sources to `GOLD_ELIGIBLE`.

Approved excerpts:

1. Piano — Satie, *Je te veux*, measures 1–8, piano staves 2–3.
2. Classical guitar — Sor Op. 35 No. 13, measures 1–8, staff 1.

The approval does not authorize production score mutation. Source files remain immutable and pinned by repository commit and blob SHA.

## Controlled mutation baseline

For each approved source, E10D creates one small synthetic voice-assignment mutation in the engine's canonical event model. The mutation is not written back to the source score.

The benchmark checks two separate properties:

- whether the shadow voice solver ranks the teacher-approved correction direction first;
- whether the default resolver remains fail-closed when confidence is below the production-resolution threshold.

## Verified result

Exact-main workflow run #22 (`33152779505`) passed.

- 2 / 2 cases ranked the teacher-approved correction direction first.
- 0 / 2 cases were automatically resolved.
- 2 / 2 cases remained `AMBIGUOUS` because confidence stayed below the default 0.90 threshold.
- 0 incorrect automatic corrections were produced.

This is deliberately a safety baseline, not an OMR accuracy claim. A correct top-ranked candidate with an `AMBIGUOUS` final decision demonstrates useful evidence without authorizing a low-confidence automatic correction.

E11 remains NOT STARTED. Before E11, the benchmark corpus must expand and resolver confidence must be justified by additional independent evidence rather than threshold weakening.
