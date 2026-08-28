# SesliTab Shadow-Only Evidence Bridge

Date: 2026-08-28

Authorization: explicit user approval after the SesliTab integration compatibility audit.

## Pinned baselines

- ST OMR Correction Engine protected main at stage start: `acb663eb62a8d065ee0966c4c7e9e3cd6bfbb33a`
- Correction Engine exact-main `test-and-build`: run #52 / `33166129425` — SUCCESS
- SesliTab Guitar Reader protected main: `95f11139929d1e3d65bd6c295794c316bb04ca84`
- SesliTab exact-main CI: run #237 / `33165513082` — SUCCESS

This stage is diagnostic-only. It does not authorize or invoke E11A automatic application.

## Existing SesliTab components reused

No MusicXML parser, validator or quality gate is duplicated here.

The bridge consumes the already existing SesliTab shapes:

- the exact host `NoteObject[]`;
- `validateMusicXmlStructuralRhythm(...)` output;
- its read-only `timeline`;
- its structural `findings`;
- its `evidence.noteEvidence` produced by `musicXmlStructuralEvidence.js`.

The existing SesliTab structural-evidence extractor already provides note-local beam evidence (`number`, `value`) and tuplet evidence without mutating the production parser result. This bridge reuses that beam evidence. It does not parse raw MusicXML itself.

Current SesliTab structural evidence does **not** provide stem direction. The bridge therefore leaves `stemDirection` absent/null unless a valid source-provided structural-evidence field is explicitly present. It never invents `up` or `down` and never lowers the resolver threshold to compensate.

## Bridge input

`analyzeSesliTabEvidenceShadow(...)` accepts:

- `sourceRevisionId`: required exact revision identity;
- `notes`: exact SesliTab source note array;
- `structuralResult`: successful read-only SesliTab structural validation result;
- `instrumentProfile`: one existing built-in profile only (`generic`, `classical-guitar`, `piano`).

No custom profile object or resolver-policy override is accepted by this bridge.

## Deterministic event identity

Each correction event ID is exact-revision-local and deterministic:

`seslitab:<encoded revision>:<encoded measureKey>:seq:<sequenceIndex>`

The bridge also returns an immutable reverse map containing:

- source revision;
- exact source note-array index;
- note ordinal inside the physical measure;
- stable `measureKey`;
- structural `sequenceIndex`;
- source `beforeVoice`.

Random IDs and displayed measure numbers are not used as correction identity.

## Fail-closed note/timeline/evidence binding

The bridge associates one host note only when the three existing host views agree:

1. exact source `NoteObject[]` order inside a stable `measureKey`;
2. timeline note event order/`sequenceIndex`;
3. structural-evidence `noteIndex` order.

It blocks before candidate generation on count mismatch, invalid divisions, invalid sequence identity, voice/staff/chord/grace mismatch or incompatible duration identity.

Onset and duration are taken from the existing SesliTab timeline in divisions and converted to quarter-beat units. The source note array is never changed.

## Beam continuity policy

Only primary beam (`number=1`) `begin -> continue* -> end` sequences are eligible for a Correction Engine `beamGroup`.

No beam continuity is created when:

- the group is incomplete;
- a transition is unsupported;
- SesliTab reports `INVALID_BEAM_VALUE`, `BEAM_WITHOUT_BEGIN`, `BEAM_RESTARTED` or `UNCLOSED_BEAM_GROUP` for that measure.

Beam grouping follows the source beam sequence rather than the current voice number. This is necessary because a wrong OMR voice assignment may occur inside an otherwise coherent visual beam group.

## Validator evidence mapping

Only `VOICE_OVERLAP` is currently allowed to select a voice-assignment target.

The mapping is exact and code-specific. A `VOICE_OVERLAP` finding must uniquely identify one non-rest, non-chord, non-grace timed event by:

- `measureKey`;
- `voice`;
- `staff`;
- finding `actual` onset.

Zero or multiple matches cause an `AMBIGUOUS` bridge result and no target analysis.

Other structural findings are retained as ignored diagnostics but do not trigger voice candidates.

Mapped validator findings preserve host classification, severity, expected/actual values and message in evidence details. The solver change in this stage only propagates already-supplied `details`; it does not change scoring.

Validator evidence weights are bounded and explicit:

- error: `0.7`;
- warning: `0.5`;
- other: `0.4`.

These weights do not raise the voice-assignment score. Voice confidence remains governed by the existing scorer and the fixed resolver threshold remains `0.90`.

## Independent per-target analysis

Each uniquely mapped event is analyzed separately through the existing `analyzeSesliTabShadow` path with only the validator findings mapped to that exact event.

This prevents an unrelated finding for one event from becoming validator evidence for another event.

The bridge does not expose resolver options, patch application, E11A revalidation or any write-back callback.

## Expected current-host behavior

With the currently pinned SesliTab host evidence, beam continuity can be available but stem direction is normally absent. A voice-2 alternative with beam continuity plus same-staff temporal continuity reaches at most `0.70` from those symbolic signals (`0.35 + 0.20 + 0.15`). It therefore remains `AMBIGUOUS` under the unchanged `0.90` resolver threshold.

If a future trusted SesliTab structural-evidence field supplies an explicit valid stem direction, the bridge can pass it through. A case with stem + beam + same-staff temporal continuity can then reach the already-existing `0.90` high-evidence boundary. This is still shadow analysis only and does not authorize automatic application.

## Safety boundary

Still forbidden after this stage:

- calling `applyControlledVoiceCorrection` from the bridge;
- writing or serializing corrected MusicXML;
- mutating SesliTab `NoteObject[]`;
- changing Audiveris/provider/Render/network/deployment behavior;
- bypassing SesliTab quality gates;
- translating shadow `RESOLVED` into teacher approval;
- labeling machine proposals as teacher corrections;
- automatic duration/onset/staff/tie/tuplet/pitch/beam/relation changes;
- multi-patch production transactions;
- threshold reduction;
- E12 Visual Second-Opinion AI.

## Next boundary

A later production-facing step is not authorized by this stage. Before any write-back or E11A host integration, SesliTab needs an explicit machine-proposal provenance/revision path and an exact-revision post-projection revalidation design. A separate bounded decision is required.
