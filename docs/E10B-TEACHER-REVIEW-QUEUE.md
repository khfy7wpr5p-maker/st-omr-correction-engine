# E10B — Teacher Review Queue

E10B turns pinned reference sources into explicit, bounded review packets without declaring them correct benchmark gold.

## Initial pending packets

1. Piano — Satie, *Je te veux*, opening measures 1–8, piano staves 2–3.
   - Source inspection confirms multiple voices on the upper piano staff plus ties and arpeggiated chord material.
   - Review focus: grand staff, meter/rhythm, voice assignment, multi-voice upper staff, ties and arpeggiated chords.
2. Classical guitar — Sor Op. 35 No. 13, home-theme measures 1–8, staff 1.
   - Source inspection confirms three simultaneous notated layers: upper melody, sustained bass and a middle sixteenth-note arpeggio voice.
   - Review focus: three-voice polyphony, fingering/string-number notation, treble-8, 2/4 meter and voice assignment.

These observations refine what the reviewer must check; they do **not** constitute teacher approval. Both packets remain `PENDING`.

Each packet records a source identity, bounded excerpt and review-focus tags. A pending packet cannot promote its source to gold. Promotion requires an explicit teacher approval object and the packet must belong to the exact source being promoted. Approval creates new immutable objects; the original reference source and pending packet are not mutated.

Rejection is also explicit and records a review identifier plus reason.

This stage does not invent teacher decisions, modify source MusicXML or enable E11 automatic correction. Rendering/teacher UI can be connected later through a host application such as ScoreMosaic or SesliTab.
