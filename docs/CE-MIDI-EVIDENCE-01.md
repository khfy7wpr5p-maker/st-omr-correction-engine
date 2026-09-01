# CE-MIDI-EVIDENCE-01 — MIDI Reference Evidence Provider

Status: **SHADOW_ONLY**. This stage adds a second-opinion symbolic evidence provider; it does not authorize automatic correction.

Fresh implementation baseline: `0ba70dcc9f5fbd8cf7036270c84bc36f180f104e` (2026-09-01).

## Ownership boundary

The correction engine does not own MIDI playback, host UI, MP3 ingestion, Basic Pitch, Audiveris runtime, deployment, or product-side MIDI generation. MIDI binary parsing and MIDI-specific handling live under `adapters/midi`. Core sees only the provider-agnostic MIDI evidence contract in `src/contracts/midiReferenceEvidence.js` and the existing `EVIDENCE_SOURCE.SYMBOLIC` contract.

Dependency direction remains unchanged: adapters may depend on core contracts; core does not depend on adapters.

## Parser dependency

`@tonejs/midi` is pinned to `2.0.28` with an exact lockfile resolution. It is used only to parse MIDI bytes and expose note/timing/track metadata. No audio or ML dependency is added.

Supported initial input:

- `.mid` / `.midi` file paths;
- `Buffer` / `Uint8Array` MIDI bytes;
- MIDI format 0 and 1 with PPQ timing;
- non-percussion 12-TET note events whose MIDI pitch can be compared directly with score pitch;
- C-instrument / sounding-pitch contexts, or explicitly declared comparable pitch domains.

Fail-closed initial exclusions:

- MIDI Type 2;
- SMPTE timing;
- malformed or timing-incomplete MIDI;
- percussion pitch comparison;
- unresolved written-vs-sounding transposition;
- microtonal/pitch-bend interpretation as notation authority;
- underdetermined or wrong-piece alignment.

## Normalized MIDI evidence

Every normalized note preserves deterministic source-local identity plus source ID/type, SHA-256 when bytes are available, track/channel/program/instrument metadata, MIDI pitch/name/velocity, tick/seconds/beat timing, bar position, nearby tempo/time-signature context and raw source order.

Overlapping same-pitch events remain separate events. CC64 sustain is preserved only as context and never silently extends notated duration. Pitch bends are retained as MIDI context and are not converted into notation corrections. Velocity is performance metadata, not dynamic-marking authority.

## Alignment policy

Alignment is solved before event matching. Priority is:

1. explicit host beat/measure anchors or supplied global/pickup beat offset;
2. bounded affine fit from unambiguous pitch/time anchors;
3. deterministic same-pitch offset voting for repeated-note material;
4. fail closed as `MIDI_UNALIGNED` when evidence is insufficient.

Inferred time scale is bounded and remains shadow diagnostics only. Matching uses a configurable local beat window, bounded candidate-edge budget, pitch/onset/duration costs, optional part-to-track constraints and deterministic tie-breaking. One-to-one matching maximizes cardinality before minimizing total cost. Ambiguity is evaluated against competing complete assignments rather than local candidate lists.

## Comparison diagnostics

The provider may emit:

- `MIDI_EXACT_MATCH`;
- `MIDI_PITCH_MATCH`;
- `MIDI_PITCH_CONFLICT`;
- `MIDI_ONSET_CONFLICT`;
- `MIDI_DURATION_CONFLICT`;
- `MIDI_SCORE_NOTE_MISSING`;
- `MIDI_EXTRA_NOTE`;
- `MIDI_AMBIGUOUS_MATCH`;
- `MIDI_UNALIGNED`;
- `MIDI_UNSUPPORTED_CONTEXT`.

`MIDI_SCORE_NOTE_MISSING` does not prove that the score note is wrong. `MIDI_EXTRA_NOTE` does not prove that OMR omitted a note. Both remain diagnostics only.

## Evidence bridge and authority

Diagnostics are projected through the existing `createEvidence` contract with:

- `source: EVIDENCE_SOURCE.SYMBOLIC`;
- `details.provider: 'midi_reference'`;
- full source/event provenance and deltas;
- `weight: 0` in V1;
- `details.authority: 'SHADOW_EVIDENCE_ONLY'`.

The `EVIDENCE_SOURCE` enum is not expanded. Teacher, validator and visual semantics are unchanged. `TRUSTED_REFERENCE`, `USER_PROVIDED_REFERENCE`, `AUDIO_DERIVED` and `UNKNOWN` describe provenance only; none grants teacher-gold or automatic-correction authority. In particular, `AUDIO_DERIVED` remains non-authoritative.

The bridge exposes no patch/apply/accept/corrected-score surface and never materializes MusicXML changes.

## Immutability and determinism

The bridge fingerprints the ScoreGraph representation before and after analysis and snapshots in-memory MIDI bytes. Any observed source mutation is an invariant failure. Repeated identical inputs must produce identical normalized identities, diagnostics and public output fingerprints.

## V1 metrics

The analysis reports:

- `alignment_success_rate`;
- `event_match_coverage`;
- `pitch_agreement_rate`;
- `onset_agreement_rate`;
- `duration_agreement_rate`;
- `ambiguous_match_rate`;
- `unaligned_rate`;
- `extra_note_diagnostic_rate`;
- `missing_note_diagnostic_rate`.

These metrics are descriptive shadow metrics. No production precision threshold, automatic correction threshold, or calibrated MIDI evidence weight is authorized by this stage.

## Test boundary

Tests use deterministic programmatically generated MIDI bytes; no commercial/copyrighted MIDI corpus is scraped. Coverage includes parser failures, format/timing guards, tempo/time-signature maps, deterministic normalization, score immutability, MIDI byte immutability, exact/offset/scale alignment, wrong-piece negative control, chords, repeated/overlapping notes, two-voice material, near-tie ambiguity, pitch/onset/duration conflicts, missing/extra diagnostics, percussion, sustain, program metadata, pitch bend, unresolved transposition, evidence provenance, review regressions for synchronized multi-part timelines, affine-scaled durations, cardinality-first matching, global ambiguity, and absence of correction authority.

Merge remains blocked until the repository PR workflow passes `npm test` and `npm run check` with no unresolved review or scope blocker.
