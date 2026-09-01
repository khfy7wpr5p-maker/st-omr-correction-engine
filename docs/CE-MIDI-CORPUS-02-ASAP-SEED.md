# CE-MIDI-CORPUS-02 — ASAP v1.1 Reference Seed

Status: **REFERENCE_ONLY / EVALUATION_ONLY**. This package does not create teacher gold, benchmark labels, calibration evidence, production thresholds, evidence weight, or correction authority.

## Source

A first real external same-work symbolic reference has been pinned from the public ASAP dataset:

- dataset: ASAP (Aligned Scores and Performances)
- upstream repository: `fosfrancesco/asap-dataset`
- release: `v1.1`
- exact commit: `fad8d1e8078d0ae47ad2f280b5d022bd2de24784`
- work: J.S. Bach, Prelude in C major, BWV 846
- upstream folder: `Bach/Prelude/bwv_846`
- license: CC BY-NC-SA 4.0

Repository policy for this seed is deliberately narrower than the upstream license: evaluation use is enabled, while repository copying, commercial use and training use are disabled. The upstream bytes are not vendored into this repository.

## Exact source identity

| Asset | SHA-256 | Bytes |
| --- | --- | ---: |
| `midi_score.mid` | `3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f` | 3525 |
| `xml_score.musicxml` | `1572209d1e24e600cc7758a3407a9ad3cb4cfbc5d55b821d452490d98a68307b` | 267546 |
| `midi_score_annotations.txt` | `a3faa7727013d73caea9d08480402d79d985fea44e7c9e9bd89917931b741306` | 1645 |
| `Shi05M.mid` | `0e98c7ff76e11e3c75df36897e2b5bf32127fb737bbf6625a666970fe103d371` | 11595 |
| `Shi05M_annotations.txt` | `43e179e671f049442dd45654a9be2aa3a5eb28fd1a2a10cf27038cc27150df81` | 3519 |

The verification workflow downloads only these exact commit-pinned paths and fails if a SHA-256 or byte-size check changes.

## Observed structure

The repository parser successfully reads the upstream score MIDI as format 1, PPQ 480, 549 note events on two note tracks (416 + 133). The aligned performance MIDI parses as format 1, PPQ 384, 548 note events.

The MusicXML contains one piano part, 35 measures, 619 pitched `<note>` elements, 132 rests, two staves and voices 1, 2, 5 and 6. These counts describe the source representation only. They must not be interpreted as a one-to-one MIDI diagnostic oracle because MusicXML tie/repetition/chord representation can differ from MIDI note-event representation.

## Admission boundary

The source is useful for real-data research and provides observed polyphony, repeated-pitch and score/performance-alignment challenges. However it is **not yet a `createMidiEvaluationCase` gold/oracle case**.

Current blockers are explicit:

- `NOTE_LEVEL_ORACLE_NOT_VERIFIED`
- `VERIFIED_DIAGNOSTIC_LABELS_REQUIRED`

The fact that the performance MIDI has 548 events while the score MIDI has 549 events is not promoted to a `MIDI_SCORE_NOTE_MISSING` label. Doing that without independent note-level verification would be circular or speculative.

## What this advances

This seed removes the source-discovery, license-identification, exact-revision and exact-byte-identity blockers for one real piano reference pair. It does **not** close Issue #67 because the required scenario coverage and verified diagnostic labels are still incomplete.

The next safe step is to add further rights/provenance-pinned real pairs and obtain independent or teacher-verified note-level labels before any real-source precision/recall, calibration or ScoreMosaic reliability gate can be opened.
