# CE-AUDIO-MIDI-EVIDENCE-01 — Audio-Derived MIDI Reference Evidence

Status: **SHADOW_ONLY**. This program adds an optional audio-to-note/MIDI provider boundary and a MIDI second-opinion evidence path. It does not authorize automatic correction.

Fresh Correction Engine baseline: `0ba70dcc9f5fbd8cf7036270c84bc36f180f104e` (2026-09-01).

Fresh Basic Pitch reference: `spotify/basic-pitch@fa5997af0a8210982619003269994a1be25eddf3`; package contract pinned to `basic-pitch==0.4.0`.

## Product flow

The default user flow no longer requires the user to locate a MIDI file:

1. the host supplies a user-controlled `.mp3`, `.ogg`, `.wav`, `.flac` or `.m4a` source;
2. the optional `providers/basic-pitch` worker invokes Spotify Basic Pitch outside Correction Engine core;
3. original audio SHA-256, provider version/model/runtime/config, note events and generated MIDI provenance are preserved;
4. generated MIDI is always labeled `AUDIO_DERIVED`;
5. `adapters/midi` normalizes the MIDI and aligns it read-only to the existing ScoreGraph;
6. pitch/onset/duration/missing/extra diagnostics are emitted as zero-weight symbolic shadow evidence.

A user-supplied trusted/reference MIDI remains an optional advanced path; it is not required for the audio flow.

## Ownership and dependency boundary

Correction Engine core does not depend on Python, TensorFlow, Basic Pitch or any host playback/runtime implementation. The dependency direction is:

- `providers/basic-pitch` owns optional audio inference and subprocess/file-contract handling;
- `adapters/midi` owns MIDI binary parsing, normalization, alignment and evidence bridging;
- `src/contracts` remains provider-agnostic;
- host UI/playback/deployment remains outside this repository's semantic authority.

Removing the Basic Pitch provider leaves the MIDI/core correction engine usable. Provider unavailability is a fail-closed runtime state, not a reason to mutate or weaken core behavior.

## Basic Pitch provider boundary

The V1 provider uses the official Python Basic Pitch API through `basic_pitch.inference.predict()`. The worker is intentionally isolated behind JSON/stdin-stdout and generated-file boundaries.

Pinned provider facts for this implementation:

- repository: `spotify/basic-pitch`;
- fresh-read SHA: `fa5997af0a8210982619003269994a1be25eddf3`;
- Python package: `basic-pitch==0.4.0`;
- license: Apache-2.0;
- default model: Basic Pitch `ICASSP_2022_MODEL_PATH` resolved by the installed package;
- accepted host extensions: `.mp3`, `.ogg`, `.wav`, `.flac`, `.m4a`.

The worker records the installed package version, Python/platform/runtime, exact resolved model serialization, model fingerprint when available, thresholds/configuration, note events, generated MIDI SHA-256 and a deterministic summary/fingerprint of raw model outputs. If an artifact directory is supplied, generated MIDI and compressed model output are preserved there.

Original audio bytes are hashed before inference. Basic Pitch may internally load/down-mix/resample audio; those provider transformations never replace the original source identity.

The repository's normal Node CI does not install the Python ML stack. The provider contract is tested with a deterministic worker stub, while missing Python/Basic Pitch is an explicit `PROVIDER_UNAVAILABLE` outcome. A deployed host that enables audio transcription must provision `providers/basic-pitch/requirements.txt` in its isolated worker environment.

## AUDIO_DERIVED authority rule

Every Basic Pitch result is `AUDIO_DERIVED`, including a generated MIDI file that happens to agree perfectly with the OMR score. It is never silently promoted to `TRUSTED_REFERENCE`, teacher evidence, gold evidence or automatic-correction authority.

Audio-derived disagreement can reflect performance variation, ornaments, improvisation, tuning, rubato, recording mismatch or transcription error. Therefore:

- missing MIDI note != proven extra score note;
- extra MIDI note != proven missing OMR note;
- pitch/onset/duration disagreement remains a diagnostic;
- agreement may strengthen a suspicion but cannot alone authorize a patch.

## MIDI parser dependency

`@tonejs/midi` is pinned to `2.0.28` with an exact lockfile resolution. It is used only in the adapter layer to parse MIDI bytes and expose note/timing/track metadata. No audio/ML package is added to npm dependencies.

Supported initial MIDI input:

- `.mid` / `.midi` file paths;
- `Buffer` / `Uint8Array` MIDI bytes;
- MIDI format 0 and 1 with PPQ timing;
- non-percussion 12-TET note events whose MIDI pitch can be compared directly with score pitch;
- C-instrument / sounding-pitch contexts, or explicitly declared comparable pitch domains.

Fail-closed MIDI exclusions:

- MIDI Type 2;
- SMPTE timing;
- malformed or timing-incomplete MIDI;
- percussion pitch comparison;
- unresolved written-vs-sounding transposition;
- microtonal/pitch-bend interpretation as notation authority;
- underdetermined or wrong-piece alignment.

## Normalization and performance semantics

Every normalized MIDI note preserves deterministic source-local identity plus source ID/type, SHA-256, track/channel/program/instrument metadata, MIDI pitch/name/velocity, tick/seconds/beat timing, bar position, nearby tempo/time-signature context and raw source order.

Overlapping same-pitch events remain separate. CC64 sustain is preserved only as context and never silently extends notated duration. Pitch bends are retained as context and are not converted into notation corrections. Velocity is performance metadata, not notation-dynamic authority.

## Alignment policy

Alignment is solved before event matching. Priority is:

1. explicit host beat/measure anchors or supplied global/pickup beat offset;
2. bounded affine fit from unambiguous pitch/time anchors;
3. deterministic same-pitch offset voting for repeated-note material;
4. fail closed as `MIDI_UNALIGNED` when evidence is insufficient.

Inferred time scale is bounded and remains shadow diagnostics only. Matching uses a configurable local beat window, bounded candidate-edge budget, pitch/onset/duration costs, optional part-to-track constraints and deterministic tie-breaking. Near-equal candidates become `MIDI_AMBIGUOUS_MATCH`; no arbitrary winner is selected.

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

`MIDI_SCORE_NOTE_MISSING` and `MIDI_EXTRA_NOTE` are diagnostics only.

## Evidence bridge

Diagnostics use the existing `createEvidence` contract with:

- `source: EVIDENCE_SOURCE.SYMBOLIC`;
- `details.provider: 'midi_reference'`;
- MIDI source/event provenance and deltas;
- `weight: 0` in V1;
- `details.authority: 'SHADOW_EVIDENCE_ONLY'`.

The `EVIDENCE_SOURCE` enum is not expanded. Teacher, validator and visual evidence semantics are unchanged. The bridge exposes no patch/apply/accept/corrected-score surface and never materializes MusicXML changes.

## Immutability and determinism

The MIDI bridge fingerprints ScoreGraph structure before/after analysis and snapshots in-memory MIDI bytes. The audio provider snapshots/hashes source bytes and writes byte inputs only to isolated temporary files. Any observed source mutation is an invariant failure.

Repeated identical audio/provider responses and identical MIDI inputs must preserve source hashes, generated MIDI hashes, normalized identities and comparison output deterministically.

## Metrics

The audio + MIDI path reports, where applicable:

- `audio_provider_success_rate`;
- `audio_to_note_event_output_rate`;
- `alignment_success_rate`;
- `event_match_coverage`;
- `pitch_agreement_rate`;
- `onset_agreement_rate`;
- `duration_agreement_rate`;
- `ambiguous_match_rate`;
- `unaligned_rate`;
- `wrong_piece_rejection_rate`;
- `audio_derived_vs_trusted_reference_delta` when a trusted comparison is available.

These are descriptive shadow metrics. No production precision threshold, correction threshold or calibrated MIDI/audio evidence weight is authorized.

## Full-mix policy

Solo/isolated piano or guitar is the preferred first pilot. Full pop/jazz/rock mixes may be passed to Basic Pitch for research diagnostics, but they are not high-confidence score evidence in this stage. Source separation/stem transcription remains the separate future program `CE-AUDIO-STEM-01`.

## Test boundary

Repository tests use deterministic, programmatically generated MIDI and a deterministic stub for the Basic Pitch worker contract. No copyrighted commercial MIDI or recording is scraped. Coverage verifies parser/timing/alignment/matching edge cases, evidence provenance, `AUDIO_DERIVED` enforcement, provider-unavailable behavior, source immutability, wrong-piece rejection and absence of correction authority.

Merge remains blocked until the PR workflow passes `npm test` and `npm run check`, the diff remains within this program, and there is no unresolved review/architecture blocker.
