# CE-MIDI-CORPUS-07 — Real OMR shadow oracle-review batch

Status: `PENDING_ORACLE_REVIEW` / evaluation only.

This package converts the exact user-provided Audiveris OMR comparisons into a bounded review workload without creating teacher-gold labels or correction authority.

## Exact inputs

- Sor Op.35 No.13 OMR SHA-256 `8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b`; canonical ScoreGraph `e93d2ac8f6488b986dc4fbd2ce2ef4d13531b389cd9c17c8786bf8d2716f49a2`; trusted MIDI `35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527`.
- Bach BWV 846 OMR SHA-256 `684250fb632299a0df3664623a851ec149cf3952c76956f1d1ad9d4572779fdd`; canonical ScoreGraph `5c5b6bf8eb8f5c25ae37bfd4f5e2f5316e22248f37ab32776244fed6ba839b1e`; trusted MIDI `3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f`.

The uploaded MusicXML bytes are not vendored.

## Comparison policy

The full-score auto-align path abstained on repeated polyphonic material. The evaluation therefore uses deterministic measure windows with the already verified score start anchor (`knownGlobalBeatOffset=0`). Matcher safety/resource defaults are not raised.

Sor uses the explicit contract `WRITTEN -> SOUNDING = -12 semitones`; this is the normal classical-guitar octave relationship and is supplied as host context, not inferred automatically. Bach uses direct sounding pitch.

All 32 Sor measures and all 35 Bach measures align under this bounded policy.

Descriptive totals:

| Work | Exact | Pitch match | Pitch conflict | Onset conflict | Duration conflict | Score-note-missing | Extra MIDI witness | Ambiguous |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Sor | 108 | 8 | 50 | 9 | 25 | 5 | 164 | 4 |
| Bach | 356 | 69 | 89 | 26 | 84 | 59 | 31 | 4 |

These are shadow diagnostics, not verified OMR-error counts.

## Bounded queue

Each work contributes exactly 20 review specifications:

- 16 localized score-event conflicts, ordered first by number of distinct conflict codes and then by measure diagnostic density;
- 4 measure-level unmatched-MIDI witness groups.

The ordering is only a teacher/oracle workload ordering. It is not confidence, reliability, severity, or correction authority.

`MIDI_EXTRA_NOTE` is deliberately stored as an unmatched MIDI witness. It does **not** mean that the OMR has a proven missing note. Likewise `MIDI_SCORE_NOTE_MISSING`, pitch/onset/duration conflicts, and ambiguity remain unverified until explicit teacher or independent-reference review.

## Safety gates

- `SHADOW_ONLY`
- `weight: 0`
- `teacherGold: false`
- `measuredReliability: false`
- `automaticCorrectionAuthority: false`
- no source mutation
- no production threshold/calibration claim
- queue materialization still requires the existing `READY_FOR_ORACLE_REVIEW` real-pair gate
- every materialized item starts `PENDING`, `verifiedLabel: null`

Batch fingerprint: `fe2ba6369e4c16a8b18a011fa3bbf6954a67b0cc4165d3ac2276436e5e4c43e7`.
