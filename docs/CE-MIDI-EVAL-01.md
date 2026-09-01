# CE-MIDI-EVAL-01 — MIDI Evidence Evaluation Benchmark

## Purpose

Measure the shadow MIDI evidence provider on controlled and later real evaluation corpora without granting correction authority.

## Safety boundary

- Evaluation only.
- `SHADOW_ONLY` evidence remains non-authoritative.
- No automatic correction authority is introduced.
- `AUDIO_DERIVED` MIDI cannot be used as its own independent ground-truth oracle.
- Agreement-only codes (`MIDI_EXACT_MATCH`, `MIDI_PITCH_MATCH`) are observations, not error labels.
- Real-world data must satisfy the repository's existing provenance, rights and gold-eligibility gates before it is treated as verified ground truth.

## Oracle classes

- `PROGRAMMATIC_ORACLE`: rights-clean deterministic synthetic/regression cases with known injected truth.
- `TEACHER_VERIFIED`: independently reviewed human ground truth.
- `INDEPENDENT_REFERENCE`: trusted external symbolic reference that is independent of the evaluated provider.

## Required source stratification

Results are reported separately for at least:

- `TRUSTED_REFERENCE`
- `USER_PROVIDED_REFERENCE`
- `AUDIO_DERIVED`

These strata must not be pooled into a single confidence claim without also publishing the per-source results.

## Metrics

The benchmark reports:

- alignment success rate
- abstention rate
- diagnostic precision
- diagnostic recall
- exact case label-set rate
- true-positive / false-positive / false-negative counts

Metrics are emitted overall and per MIDI source type.

## Diagnostic labels

Benchmarkable error/abstention labels are:

- `MIDI_PITCH_CONFLICT`
- `MIDI_ONSET_CONFLICT`
- `MIDI_DURATION_CONFLICT`
- `MIDI_SCORE_NOTE_MISSING`
- `MIDI_EXTRA_NOTE`
- `MIDI_AMBIGUOUS_MATCH`
- `MIDI_UNALIGNED`
- `MIDI_UNSUPPORTED_CONTEXT`

## Next corpus expansion

Programmatic oracle cases should cover pickup offsets, affine tempo drift, polyphony, repeated pitches, part-to-track mapping, ambiguity, missing/extra events and wrong-piece negative controls. Real corpus admission follows existing rights/provenance/teacher-review gates and must remain distinct from audio-derived evidence quality measurements.
