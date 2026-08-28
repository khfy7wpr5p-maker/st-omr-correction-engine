# CE-EVIDENCE-04 — Approved Real OMR Seed

Status: research evidence only. No production correction authority is introduced.

## Purpose

This package anchors the first exact-hash teacher-approved REAL_OMR evidence seed used by the correction engine. The evidence remains owned by the SesliTab repository and is referenced by immutable repository revision, file paths and SHA-256 values.

Pinned evidence chain:

- repository: `khfy7wpr5p-maker/seslitab-guitar-reader`
- commit: `7cdf08f784a38b9e50cfb465eab87cb65a6622a1`
- source PDF SHA-256: `df4b8ea20b6420ebdf6b3e1d625016090105fed0c2f60a4e03874d3c3be2b9b9`
- Audiveris MusicXML SHA-256: `009dd2fd4439a4138ed62cd0e0945a5611add8db38c58c7b0f90429ccd9970f6`
- Audiveris project SHA-256: `7424e684825b51e8fd31596c94acd5ef008a84fbaecb5c0524222aaec8f8a21a`
- approval record SHA-256: `4cda4b23b71c738e0b7117d84a4d1256656e010359c5a4b9f1f1db474ad8dfc3`
- OMR engine: Audiveris `5.11.0`
- license/right record: CC0-1.0, repository-owner approved

The SesliTab approval states that the exact source PDF, Audiveris `.omr` artifact and MusicXML were reviewed as one evidence chain, that source PDF and MusicXML are musically equivalent, that the pickup is intentional, and that tie recognition is explicitly included in the approval.

## Bounded event snapshot

The package records the 22 note events present in the exact approved MusicXML. The snapshot preserves pitch, duration, voice, staff, onset and tie flags needed by the correction-engine research validators. It does not rewrite or replace the original MusicXML.

The approved snapshot is used as a real-world negative regression:

- tie anomaly detector must produce no findings;
- duration anomaly detector must produce no findings;
- onset anomaly detector must produce no findings.

A failure means the research detector is producing a false positive against a teacher-approved real Audiveris result.

## Whole-score approval projection

The exact whole-score approval may be projected only into `NO_CORRECTION_NEEDED` gold labels for facts covered by that approval:

- pitch: 22 labels;
- duration: 22 labels;
- ties: 10 labels, because tie recognition is explicitly named in the approval.

Total projected labels: 54 from one independent source.

This projection cannot produce `ACCEPT_CORRECTION`, cannot invent an alternative musical value, and cannot create a production patch. The report therefore keeps `independentSourceCount=1` separate from `goldLabelCount=54` so one score cannot be presented as 54 independent scores.

## Scientific boundary

This seed is useful evidence but is not sufficient for calibration or production readiness by itself. In particular:

- it is a single independent source;
- it is primarily monophonic and does not validate Voice 3/4 or cross-staff polyphony;
- it contains no known correction-needed event;
- no correction-engine confidence is invented for these labels;
- no precision, coverage, calibration or false-correction claim is derived from this seed alone.

The next required evidence for expanded correction readiness remains diverse real OMR material with exact provenance and explicit teacher decisions, especially correction-needed polyphonic examples.
