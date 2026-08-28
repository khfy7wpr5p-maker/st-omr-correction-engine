# E10I — Source-Specific Benchmark Expansion

## Status

E10I is **completed** as a bounded shadow benchmark expansion across all four newly teacher-approved excerpts. It does not authorize E11 controlled automatic correction.

## Verified source basis

Only previously pinned CC0 sources and previously teacher-approved review excerpts were used.

### Francisco Tárrega — *Lágrima*

- source: `yawnoc/guitar`;
- pinned commit: `fe48dbba46be760fab453b3a72ef35746f20ea48`;
- pinned blob: `74fa494398f652a8e2f8e275d401a28f2fff66c7`;
- approved excerpt: measures 1–8, staff 1;
- benchmark anchor: measure 6 high-voice explicit beamed eighth-note line;
- simultaneous context preserves separate low and middle voice material.

Cases:

1. high-evidence voice-assignment mutation — `RESOLVED` to voice 1;
2. matched guard with stem evidence removed — `AMBIGUOUS`.

### John Dowland — *Fantasia Number 7*

- source: `yawnoc/guitar`;
- pinned commit: `fe48dbba46be760fab453b3a72ef35746f20ea48`;
- pinned blob: `35f4547b5ed79656fa2b99a13e3021864bc404ec`;
- approved excerpt: measures 1–8, staff 1;
- benchmark anchor: measure 7 high-voice quaver context under the source beam policy;
- simultaneous context preserves high, low, upper-middle and lower-middle voice layers.

Cases:

1. high-evidence voice-assignment mutation — `RESOLVED` to voice 1;
2. matched guard with beam evidence removed — `AMBIGUOUS`.

### Anton Webern — Op. 4 No. 4, *So ich traurig bin*

- source: `OpenScore/Lieder`;
- pinned commit: `6b2dc542ce2e8aa4b78c8ee62103b210efc07015`;
- pinned blob: `27013a1c414ad16ec614e541d172620af5b84549`;
- approved excerpt: measures 1–8, piano staves;
- the opening `Measure len="1/8"` / irregular measure is valid source structure and is deliberately not mutated;
- benchmark anchor: piano staff 2, measure 4, where the source has a 2/8 beamed upper-voice pair and a simultaneous lower voice.

Cases:

1. high-evidence voice-assignment mutation — `RESOLVED` to voice 1;
2. matched guard with beam evidence removed — `AMBIGUOUS`.

### Maria Theresia von Paradis — *An das Klavier*

- source: `OpenScore/Lieder`;
- pinned commit: `6b2dc542ce2e8aa4b78c8ee62103b210efc07015`;
- pinned blob: `426510fd9f5984a7b397702d4609bc53a8499d7f`;
- approved excerpt: measures 1–8, piano staves;
- source confirms 2/4 and grand-staff piano structure;
- benchmark anchor: piano staff 2, measure 3, source beamed upper line with `StemDirection=up`.

Cases:

1. high-evidence voice-assignment mutation — `RESOLVED` to voice 1;
2. matched guard with stem evidence removed — `AMBIGUOUS`.

Every E10I source-specific benchmark event carries a source anchor for traceability. Pinned source files remain immutable.

## Final verified benchmark

- total cases: 32;
- high-evidence: 16;
- guard / partial-evidence: 16;
- correct resolved: 16;
- incorrect resolved: 0;
- ambiguous: 16;
- controlled coverage: 0.50;
- precision among resolved cases: 1.00;
- piano cases: 16;
- classical-guitar cases: 16.

Per-source distribution:

- Satie: 12 — 6 high-evidence + 6 guard;
- Sor: 12 — 6 high-evidence + 6 guard;
- Tárrega: 2 — 1 high-evidence + 1 guard;
- Dowland: 2 — 1 high-evidence + 1 guard;
- Webern: 2 — 1 high-evidence + 1 guard;
- Paradis: 2 — 1 high-evidence + 1 guard.

This remains a controlled shadow benchmark and is not a universal OMR accuracy claim.

## Technical verification

### Guitar slice

- implementation PR: #23;
- exact-head `test-and-build`: run #39 (`33159355219`) — SUCCESS;
- exact-main `test-and-build`: run #40 (`33159385019`) — SUCCESS.

### Piano slice

- implementation PR: #25;
- exact-head `test-and-build`: run #43 (`33159881693`) — SUCCESS;
- verified technical main: `dba302cc4082b1c159d042d422964b862c858f99`;
- exact-main `test-and-build`: run #44 (`33159925397`) — SUCCESS.

## Safety invariants preserved

- `minConfidence = 0.90` unchanged;
- fail-closed behavior unchanged;
- independent evidence requirement unchanged;
- source mutation: none;
- production MusicXML mutation: none;
- solver architecture: unchanged;
- public API: no breaking change;
- external dependencies: none added;
- E11: NOT STARTED;
- E12: NOT STARTED.

The current piano and classical-guitar profiles only have explicit stem soft-priors for `up → voice 1` and `down → voice 2`. E10I deliberately does not invent new voice-3/voice-4 priors merely to increase coverage.

## Completion boundary

E10I's bounded objective was to derive genuinely source-specific controlled mutations from the four newly approved excerpts rather than cloning the existing Satie/Sor cases. That objective is now met with one high-evidence and one matched guard case from each new source.

The 32-case set is intentionally not inflated to 40 without additional musically distinct evidence. Ties, tuplets, cross-staff behavior, duration/onset ambiguity and broader voice-3/voice-4 correction remain future evidence areas rather than artificial benchmark expansion.

E11 remains a separate explicit authorization boundary.
