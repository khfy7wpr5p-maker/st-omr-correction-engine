# E10I — Source-Specific Benchmark Expansion

## Status

E10I is **in progress**. This document records only the first bounded guitar slice. It does not authorize E11 controlled automatic correction.

## Verified source basis

The slice uses only previously pinned CC0 sources and previously teacher-approved review excerpts.

### Francisco Tárrega — *Lágrima*

- source: `yawnoc/guitar`;
- pinned commit: `fe48dbba46be760fab453b3a72ef35746f20ea48`;
- pinned blob: `74fa494398f652a8e2f8e275d401a28f2fff66c7`;
- approved excerpt: measures 1–8, staff 1;
- source-specific benchmark anchor: measure 6 high-voice explicit beamed eighth-note line;
- simultaneous context preserves separate low and middle voice material from the same measure.

Two controlled cases were added:

1. high-evidence voice-assignment mutation — expected `RESOLVED` to voice 1;
2. matched guard mutation with stem evidence removed — expected `AMBIGUOUS`.

### John Dowland — *Fantasia Number 7*

- source: `yawnoc/guitar`;
- pinned commit: `fe48dbba46be760fab453b3a72ef35746f20ea48`;
- pinned blob: `35f4547b5ed79656fa2b99a13e3021864bc404ec`;
- approved excerpt: measures 1–8, staff 1;
- source-specific benchmark anchor: measure 7 high-voice quaver context under the source beam policy;
- simultaneous context preserves high, low, upper-middle and lower-middle voice layers.

Two controlled cases were added:

1. high-evidence voice-assignment mutation — expected `RESOLVED` to voice 1;
2. matched guard mutation with beam evidence removed — expected `AMBIGUOUS`.

Each source-specific benchmark event carries a source anchor for traceability. The pinned source files remain immutable.

## Verified benchmark after first slice

- total cases: 28;
- high-evidence: 14;
- guard / partial-evidence: 14;
- correct resolved: 14;
- incorrect resolved: 0;
- ambiguous: 14;
- controlled coverage: 0.50;
- precision among resolved cases: 1.00;
- piano cases: 12;
- classical-guitar cases: 16.

Per-source distribution:

- Satie: 12;
- Sor: 12;
- Tárrega: 2;
- Dowland: 2;
- Webern: 0 new mutation cases yet;
- Paradis: 0 new mutation cases yet.

This remains a controlled shadow benchmark and is not a universal OMR accuracy claim.

## Technical verification

- implementation PR: #23;
- merge method: squash;
- verified technical main: `d15446aef430ac46190b07f58d84348512c2a1bf`;
- exact-head `test-and-build`: run #39 (`33159355219`) — SUCCESS;
- exact-main `test-and-build`: run #40 (`33159385019`) — SUCCESS.

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

The current classical-guitar profile only has explicit stem soft-priors for `up → voice 1` and `down → voice 2`. This slice deliberately does not invent new voice-3/voice-4 stem priors merely to increase coverage.

## Next safe E10I work

Continue source-specific expansion in this order:

1. Webern Op. 4 No. 4 — preserve the irregular opening measure as valid source structure; derive only evidence-supported grand-staff/meter/voice cases.
2. Paradis, *An das Klavier* — derive bounded grand-staff, accompaniment, meter/rhythm and voice/staff cases.

Any benchmark case must remain tied to verified source structure and teacher-approved provenance. E11 requires separate explicit user approval even after E10I is eventually completed.
