# CE-MIDI-CORPUS-05 — Bach BWV 846 ASAP MusicXML ↔ score MIDI

This stage adds a bounded deterministic generic MusicXML-to-ScoreGraph canonicalizer for MusicXML 3.1 reference evaluation and uses it for a third real reference work: J.S. Bach, BWV 846 Prelude No.1 from ASAP v1.1.

Pinned sources:
- repository: `fosfrancesco/asap-dataset`
- commit: `fad8d1e8078d0ae47ad2f280b5d022bd2de24784`
- score MusicXML SHA-256: `1572209d1e24e600cc7758a3407a9ad3cb4cfbc5d55b821d452490d98a68307b`
- score MIDI SHA-256: `3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f`
- license: CC BY-NC-SA 4.0; evaluation allowed, repository redistribution/training remain disallowed by the existing external manifest.

The adapter preserves MusicXML note order, `backup`, `forward`, chord onset sharing, duration divisions, voice, staff, rests, ties and measure/time structure. It fails closed on score-timewise, multiple parts and non-zero transposition.

This generic reference adapter does not replace or weaken the dedicated Audiveris MusicXML 4.0.3 OMR canonicalization path. ASAP input is not labeled as Audiveris/OMR provenance.

The benchmark is evaluation-only. The score MusicXML and score MIDI are upstream same-score representations, not independent ground truth. `independenceVerified=false`, `teacherVerification=null`, measured reliability is not promoted and automatic correction authority stays false.
