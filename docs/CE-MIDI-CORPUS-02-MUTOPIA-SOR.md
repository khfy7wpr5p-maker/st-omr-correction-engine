# CE-MIDI-CORPUS-02 — Mutopia Sor Op.35 No.13 Reference Admission

Status: **ADMISSIBLE_REFERENCE_ONLY**. This package advances Issue #67 but does not create gold labels, teacher verification, independent-reference verification, measured reliability, evidence weight, or correction authority.

## Exact MIDI bytes

Source page: Mutopia catalog entry 1945.

MIDI URL: `https://www.mutopiaproject.org/ftp/SorF/O35/sorf_op35_no13/sorf_op35_no13.mid`

Verified by GitHub Actions:

- SHA-256: `35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527`
- bytes: `2862`
- Standard MIDI format: 1
- tracks: 2
- PPQ: 384
- parsed note events: 334
- note-bearing track: track 1, 334 notes
- MIDI program: 24 (nylon acoustic guitar family)
- meter: 2/4

The exact-byte verification gate re-downloads the URL and fails on a SHA-256, byte-size, MIDI-header, parser, event-count, track-structure, program or meter mismatch.

## Same-work verification

The Mutopia source is pinned to:

- repository: `MutopiaProject/MutopiaProject`
- commit: `2144afd6f52d56c5b6995b8b589ef1268b3139f0`
- path: `ftp/SorF/O35/sorf_op35_no13/sorf_op35_no13.ly`
- Git blob: `bb5d652f6ea5f284c901607d4c323c8710a0f7d2`

The existing Correction Engine guitar reference source is pinned to:

- repository: `yawnoc/guitar`
- commit: `fe48dbba46be760fab453b3a72ef35746f20ea48`
- path: `sor-c-major-35-13/sor-c-major-35-13.ly`
- Git blob: `c96155e3693c4963c1ebf669ed8e54d17c075e77`

The same-work gate verifies the exact source blobs and establishes:

1. both identify Fernando Sor, Op.35 No.13 / Study No.13;
2. both trace their source lineage to the 1924 Boije 482 / N. Simrock material;
3. both encode C major, 2/4, treble-8 guitar notation;
4. pinned source inspection confirms matching opening upper-, lower- and middle-voice material.

The scope is deliberately `WORK_IDENTITY_AND_SHARED_SOURCE_LINEAGE`. **Edition identity is not asserted.** Differences in editorial fingering, engraving or individual notation details therefore remain possible and must not be interpreted as OMR errors.

## Authority boundary

This admission means the MIDI is a usable real **reference-only** candidate for same-work research. It does not mean the MIDI is ground truth.

Still false/unavailable:

- `independenceVerified`
- teacher verification
- gold eligibility
- measured reliability eligibility
- production threshold
- evidence weight
- automatic correction authority

The reference may not produce verified PITCH/ONSET/DURATION/MISSING/EXTRA labels until an independent or teacher-verified note-level oracle is supplied. Any edition-level disagreement remains diagnostic-only and must abstain from correctness claims.
