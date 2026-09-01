# CE-MIDI-CORPUS-02 — Real OMR + MIDI Pair Readiness

Status: **REAL OMR INPUTS RECEIVED / CANONICAL SCOREGRAPH MATERIALIZATION PENDING**.

Two user-provided MusicXML files were inspected on 2026-09-01 and identified from their own encoding metadata as Audiveris 5.11.0 + ProxyMusic 4.0.3 outputs.

## Exact OMR identities

### Fernando Sor — Op.35 No.13

- source kind: Audiveris MusicXML
- exact SHA-256: `8c3aaf3d81495af92db2146194b36237cfa225716053e4bdc089aafe3fe0ed8b`
- bytes: 70,470
- observed measures: 32
- observed pitched notes: 175
- observed rests: 0
- observed voices: 1, 2
- observed staff domain: staff 1
- matched MIDI reference: `mutopia-sor-op35-no13-midi`
- exact MIDI SHA-256: `35ac900c3dd049272e670af166a443251e0a61d829a5badc17bf9cf564bcd527`

### J.S. Bach — BWV 846 Prelude No.1

- source kind: Audiveris MusicXML
- exact SHA-256: `684250fb632299a0df3664623a851ec149cf3952c76956f1d1ad9d4572779fdd`
- bytes: 265,350
- observed measures: 35
- observed pitched notes: 577
- observed rests: 132
- observed voices: 1, 2, 3, 4, 5, 6, 7
- observed staves: 1, 2
- matched MIDI reference: `asap-v1.1-bach-bwv846`
- exact MIDI SHA-256: `3e2f8b9f3cf6c710788f1963066b04850e0335e94a9558f642fa2cd6eb3fb45f`

## Important boundaries

The uploaded MusicXML bytes are not vendored by this package. Their exact hashes and structural observations are recorded only as provenance manifests.

The repository currently has no general MusicXML-to-ScoreGraph importer. Existing source-specific controlled mutation fixtures are not exact imported ScoreGraphs and therefore must not satisfy the real-pair gate.

`REAL_MIDI_SCOREGRAPH_ORIGIN.CONTROLLED_MUTATION` and `SOURCE_RECONSTRUCTION` are explicitly rejected for real-pair admission. Only an exact canonical graph with `OMR_CANONICAL` or `HOST_CANONICAL` provenance can reach `READY_FOR_ORACLE_REVIEW`.

The fact that a real OMR file and a same-work MIDI both exist does not make either one ground truth. No PITCH, ONSET, DURATION, MISSING or EXTRA label becomes verified until an independent/teacher note-level oracle decision exists.

Manual-edit status of the uploaded MusicXML is recorded as `UNKNOWN`; the code does not infer or fabricate a claim that the files were untouched.

## Next implementation step

Add a bounded, deterministic Audiveris MusicXML -> ScoreGraph adapter that preserves source bytes, processes MusicXML `backup` / `forward` / voice / staff / chord / rest / tie timing, records exact source identity, and fails closed on unsupported constructs. Only after the exact uploaded OMR content can be materialized into canonical ScoreGraph may these two candidates enter the oracle review queue.
