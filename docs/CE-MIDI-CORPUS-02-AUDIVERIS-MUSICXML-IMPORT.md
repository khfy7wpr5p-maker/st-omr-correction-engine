# CE-MIDI-CORPUS-02 — Bounded Audiveris MusicXML -> ScoreGraph Import

Status: **IMPLEMENTED FOR BOUNDED SINGLE-PART AUDIVERIS MUSICXML / SHADOW-EVALUATION ONLY**.

The adapter materializes canonical ScoreGraph data from exact MusicXML bytes without modifying the source. It exists to make real OMR + same-work MIDI pairs reviewable; it does not make either source ground truth.

## Supported v1 subset

- `score-partwise` MusicXML `4.0.3`
- exactly one `<part>`
- positive `divisions`
- inherited time signatures
- ordered `<note>`, `<backup>` and `<forward>` timing
- chord tones through `<chord/>`
- pitched notes and rests
- positive voice/staff values; staff defaults to 1 when omitted
- integral semitone `alter`
- direct `<tie type="start|stop">` metadata
- deterministic source IDs, event IDs and canonical graph SHA-256
- measure overflow/underfill preserved as warnings rather than silently repaired

The adapter fails closed on unsupported roots/versions, multipart scores, transpose elements, grace notes, time-modification/tuplets handled outside the v1 timing model, cue notes, malformed pitches/timing, negative measure cursors, source-hash mismatch and other unsupported XML structures.

No instrument-name inference is performed. Imported note pitch is marked `WRITTEN`; guitar written/sounding conversion remains the explicit CE-MIDI-EVIDENCE-03 host/reference contract.

## Exact user-provided OMR replay

The two uploaded Audiveris 5.11.0 + ProxyMusic 4.0.3 MusicXML files were replayed locally through the deterministic v1 importer. Their bytes are not committed to this repository.

### Fernando Sor — Op.35 No.13

- source SHA-256: `8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b`
- source bytes: 70,470
- canonical ScoreGraph SHA-256: `e93d2ac8f6488b986dc4fbd2ce2ef4d13531b389cd9c17c8786bf8d2716f49a2`
- measures: 32
- events: 175
- import warnings: 22 `MEASURE_EVENT_OVERFLOW`
- affected measures: 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 17, 20, 21, 25, 26, 27, 28, 29, 31, 32

### J.S. Bach — BWV 846 Prelude No.1

- source SHA-256: `684250fb632299a0df3664623a851ec149cf3952c76956f1d1ad9d4572779fdd`
- source bytes: 265,350
- canonical ScoreGraph SHA-256: `5c5b6bf8eb8f5c25ae37bfd4f5e2f5316e22248f37ab32776244fed6ba839b1e`
- measures: 35
- events: 709 (577 pitched + 132 rests)
- import warnings: 9
  - 5 `MEASURE_EVENT_OVERFLOW`: measures 1, 2, 4, 5, 6
  - 4 `MEASURE_EVENT_UNDERFILL`: measures 21, 23, 25, 28

These warning counts are observations of the exact OMR encoding. They are **not teacher-verified OMR error labels** and must not be promoted to MIDI gold, reliability calibration or automatic correction decisions.

## Real-pair materialization boundary

`USER_PROVIDED_REAL_OMR_MANIFESTS` pins the exact source byte identity and expected deterministic canonical graph identity. `materializeRealMidiPairCandidate` accepts an import only if source SHA-256, byte length, importer revision, canonical graph SHA-256, event count and warning count all match the pinned manifest.

After successful materialization, a pair may become `READY_FOR_ORACLE_REVIEW`; it still has `automaticCorrectionAuthority=false`. Verified PITCH/ONSET/DURATION/MISSING/EXTRA labels require the separate teacher/independent-reference oracle review gate.
