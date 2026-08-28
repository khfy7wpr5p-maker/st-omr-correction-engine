# E10G — Reference Corpus Expansion

E10G expands the pinned real-score corpus from 2 to 6 CC0 sources while preserving the teacher-approval gate.

## Existing teacher-approved sources

- Piano — Erik Satie, *Je te veux*, measures 1–8.
- Classical guitar — Fernando Sor, Op. 35 No. 13, measures 1–8.

These remain the only teacher-approved/gold-eligible real-score sources.

## New reference-only sources

### Piano

1. Maria Theresia von Paradis — *An das Klavier*.
   - OpenScore/Lieder, CC0.
   - Two-staff Pianoforte part, 2/4 opening.
2. Anton Webern — Op. 4 No. 4, *So ich traurig bin*.
   - OpenScore/Lieder, CC0.
   - Two-staff grand-piano part; irregular opening measure in a 3/8 score.

### Classical guitar

3. Francisco Tárrega — *Lágrima*.
   - yawnoc/guitar, CC0.
   - Explicit high, low and middle voices; treble-8, 3/4, fingering/string/barre/glissando material.
4. John Dowland — *Fantasia Number 7*.
   - yawnoc/guitar, CC0.
   - Four explicit voice layers on one staff; treble-8, 2/2, tuplets, ties, arpeggios and guitar annotations.

All files are pinned by repository commit and blob SHA. They are not copied into the repository and remain `REFERENCE_ONLY`.

## Review boundary

Each new source has a bounded measures 1–8 teacher-review packet in `PENDING` state. No source can become gold merely because it is CC0 or structurally inspected. Explicit musical approval must match the exact source and review packet.

E10G does not change solver confidence, resolver thresholds, Audiveris/provider behavior, MusicXML, or production correction policy. E11 remains NOT STARTED.
