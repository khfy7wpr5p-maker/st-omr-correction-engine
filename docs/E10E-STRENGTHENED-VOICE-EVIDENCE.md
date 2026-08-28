# E10E — Strengthened Voice Evidence

E10E strengthens the shadow voice solver without weakening the resolver threshold and without enabling production correction.

## New deterministic evidence

The solver now recognizes **same-staff temporal voice continuity**: if a candidate voice has a non-rest event that ends exactly where the ambiguous event begins, or begins exactly where it ends, that adjacency contributes bounded symbolic evidence.

This evidence is deliberately conservative:

- same measure only;
- same staff only;
- same candidate voice only;
- direct temporal adjacency only;
- rests do not trigger the continuity boost;
- overlap remains a hard violation;
- it is still only one symbolic evidence class.

Weights remain explicit and reviewable. Stem prior contributes 0.20, beam continuity 0.20 and same-staff temporal continuity 0.15 on top of the 0.35 alternative-voice base. The resolver threshold remains **0.90**.

## Expanded approved mutation benchmark

The teacher-approved Satie and Sor excerpts are reused without changing their source files. Eight controlled mutation variants are created from those approved structures:

- 4 high-evidence cases: stem + beam + temporal continuity;
- 4 guard cases: one of stem or beam evidence is intentionally absent.

## Verified result

Exact-main workflow run #26 (`33155843705`) passed on technical main `a53ad5cde7709fa6d2c5e4c02c40d74970fc6b02`.

- 8 / 8 cases ranked the teacher-approved correction direction first.
- 4 / 4 high-evidence cases resolved correctly at the unchanged 0.90 threshold.
- 4 / 4 guard cases remained `AMBIGUOUS` below threshold.
- incorrect resolved corrections: 0.
- overall controlled coverage: 0.50.
- precision among resolved controlled cases: 1.00.
- removing validator evidence still forces `AMBIGUOUS` even when symbolic confidence reaches 0.90.

This is a controlled shadow benchmark, not a universal OMR accuracy claim. No source MusicXML is written or modified, no threshold was weakened, and E11 automatic application remains NOT STARTED.
