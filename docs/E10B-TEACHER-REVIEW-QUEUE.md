# E10B — Teacher Review Queue

E10B turns pinned reference sources into explicit, bounded review packets without declaring them correct benchmark gold.

## Initial pending packets

1. Piano — Satie, *Je te veux*, opening measures 1–8, piano staves 2–3.
2. Classical guitar — Sor Op. 35 No. 13, home-theme measures 1–8, staff 1.

Each packet records a source identity, bounded excerpt and review-focus tags. Both start `PENDING`.

A pending packet cannot promote its source to gold. Promotion requires an explicit teacher approval object and the packet must belong to the exact source being promoted. Approval creates new immutable objects; the original reference source and pending packet are not mutated.

Rejection is also explicit and records a review identifier plus reason.

This stage does not render excerpts, invent teacher decisions, modify source MusicXML or enable E11 automatic correction. Rendering/teacher UI can be connected later through a host application such as ScoreMosaic or SesliTab.
