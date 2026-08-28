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

Expected safety behavior:

- high-evidence cases may resolve only if the approved correction reaches the unchanged threshold and has independent validator + symbolic evidence;
- guard cases must remain `AMBIGUOUS` below threshold;
- removing validator evidence must still force abstention even when symbolic confidence reaches the threshold;
- no source MusicXML is written or modified.

E10E is still a controlled shadow benchmark. It is not an OMR accuracy claim and does not authorize E11 automatic application.
