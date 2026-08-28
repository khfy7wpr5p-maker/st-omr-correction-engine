# SesliTab Integration Compatibility Record

Date: 2026-08-28

This record is a bounded, documentation-only compatibility audit. It does not activate a runtime integration and does not authorize production correction.

## Pinned baselines

- ST OMR Correction Engine protected main: `a0730c8187b136c4a2f6fccacd0061eddaf4c24d`
- Correction Engine exact-main `test-and-build`: run #50 / `33164901031` — SUCCESS
- SesliTab Guitar Reader protected main: `95f11139929d1e3d65bd6c295794c316bb04ca84`
- SesliTab exact-main CI: run #237 / `33165513082` — SUCCESS
- Open PRs/issues were empty in both repositories before this audit issue was opened.

## Existing ownership boundary

SesliTab remains the host/product authority for:

- PDF / Audiveris / MusicXML acquisition;
- its canonical `NoteObject[]` and structured MusicXML representation;
- structural/rhythmic validation and quality reporting;
- application `ACCEPT / REVIEW / BLOCK` quality gates;
- teacher revision, teacher correction audit, and teacher approval semantics;
- playback, TTS, MIDI, TAB, violin, UI, persistence and sharing.

ST OMR Correction Engine remains the second-opinion intelligence authority for:

- bounded candidate generation/search;
- evidence scoring;
- candidate resolution;
- polyphonic voice-assignment proposals;
- immutable correction projection;
- the E11A controlled `CHANGE_VOICE` gate.

No duplicated SesliTab validator, quality gate, teacher-revision model, Audiveris provider or production pipeline should be introduced into this repository.

## 1. SesliTab canonical data -> Correction Engine `ScoreGraph`

### Compatible fields

The current models have a direct semantic mapping for the minimum voice-analysis core:

| SesliTab | Correction Engine |
|---|---|
| `measureKey` | `measureKey` |
| `startBeat` / exact structural timeline start | `onset` |
| `beats` / structural timeline duration | `duration` |
| `voice` | `voice` |
| `staff` | `staff` |
| `midi` or written pitch metadata | `pitch` |
| `isRest` | `isRest` |
| `isChordNote` | `isChordTone` |

Both systems already use stable physical measure identity rather than treating displayed measure number as a unique identifier.

### Blocking gap: event identity

`ScoreGraph` requires a non-empty unique event `id`. The flat SesliTab `NoteObject[]` contract does not currently expose a dedicated stable correction-event identifier. The structured MusicXML path has source-order `sequenceIndex` and stable `measureKey`, so a future bridge can create an exact-revision-local identity from structural source identity, but it must be deterministic and must preserve a reverse map to the exact SesliTab source item/path.

Do not use a newly invented random ID. Do not assume displayed measure number is unique. Do not apply a patch back to SesliTab unless the reverse mapping still targets the exact source revision and before-value.

**Result:** structurally compatible, but not yet runtime-ready.

## 2. SesliTab validator findings -> Correction Engine evidence

SesliTab structural findings currently expose rich host data including:

- `code`;
- `classification` (`structural_error` / `suspected_omr_error`);
- `severity`;
- `partId`, `measureKey`, `measureIndex`, `voice`, `staff`;
- `expected`, `actual`, `message`.

The existing Correction Engine shadow adapter accepts `validatorFindings`, but its current normalization only reads `finding.code`, optional `finding.weight`, and optional nested `finding.location`. SesliTab locations are represented as top-level fields, and SesliTab does not provide the adapter's weight directly.

Therefore the current adapter would lose useful location semantics and would assign its default validator weight instead of applying an explicit host-to-engine evidence policy.

### Blocking gap: ambiguous event selection

The voice solver requires exact `ambiguousEventIds`. Current SesliTab structural findings generally identify measure/voice/staff context, not a Correction Engine event ID. A future bridge must map host findings to exact structural events without broadening one measure-level warning into arbitrary note corrections.

The bridge must fail closed when one finding cannot be mapped to a unique bounded event set.

**Result:** compatible evidence concepts, incompatible current wire shape.

## 3. Correction Engine `CHANGE_VOICE` -> SesliTab revision/correction domain

Correction Engine voice proposals carry:

- `eventId`;
- `measureKey`;
- operation `CHANGE_VOICE`;
- exact `before` and `after` voice values;
- evidence and confidence.

SesliTab Package 8 supports immutable revisions and controlled existing-path `replace_value` correction operations. Mechanically, an exact `CHANGE_VOICE` can be represented as a replacement of the existing `voice` field when the integration owns a verified event-to-revision-path reverse map.

However **the current SesliTab correction audit is explicitly a teacher-correction domain**. An automatic engine proposal must not be mislabeled as a `TeacherCorrectionAuditEvent`, and quality-gate acceptance must not be converted into teacher approval.

A future integration needs an explicit provenance boundary. Safe options include a separate machine-proposal record or a shadow proposal that becomes a teacher correction only after an explicit teacher action. This audit does not choose or implement that production-domain extension.

**Result:** mechanical field mapping is possible; production provenance semantics are not yet compatible.

## 4. E11A revalidation -> SesliTab quality gate

Both systems use `ACCEPT / REVIEW / BLOCK`, but the words do not mean the same thing:

- E11A `ACCEPT` means the projected correction passed the E11A revalidation callback and may be returned as an accepted in-memory projection.
- SesliTab quality-gate `ACCEPT` means the exact host consumer data satisfies SesliTab's quality policy.
- Neither decision is teacher approval.

They must never be treated as interchangeable flags.

The current SesliTab production-facing quality adapter binds validation evidence to the exact `NoteObject[]` identity and raw MusicXML source. E11A projects an in-memory `ScoreGraph` and does not serialize/overwrite MusicXML. Therefore the current production SesliTab quality gate cannot simply be passed the projected graph as if it were the original MusicXML-backed note array.

A future shadow bridge can re-run read-only graph/structural checks for comparison, but production application requires a separately proven exact-revision revalidation path.

**Result:** decision vocabulary is compatible; production revalidation contract is not yet compatible.

## 5. Symbolic voice evidence gap

The E10E/E11A voice scorer reaches high-evidence thresholds through independent evidence such as:

- stem-direction prior;
- beam voice continuity;
- same-staff temporal voice continuity;
- validator evidence.

The inspected SesliTab MusicXML flat-note parser currently emits `voice`, `staff`, onset/duration/pitch/tie information but does not populate `stemDirection` or a Correction Engine-compatible `beamGroup` into its flat `NoteObject[]`. `canonicalNoteModel.js` can preserve a `beam` value when supplied, but the current parser path does not provide the symbolic metadata expected by the scorer.

Without a read-only symbolic-evidence extraction bridge, real SesliTab events must not be assumed capable of reaching E11A's fixed `0.90` correction threshold. The threshold must not be lowered to compensate for missing host evidence.

**Result:** this is a hard blocker for E11A production voice correction, not a reason to weaken policy.

## Compatibility decision

### Safe now

- Keep both existing architectures.
- Keep SesliTab validators and quality gates authoritative for the host.
- Keep Correction Engine candidate/search/resolver/voice solver authoritative for second-opinion analysis.
- Build only a bounded **shadow compatibility adapter** after this record, with no mutation and no product decision override.

### Required before any shadow adapter can be considered complete

1. deterministic exact-revision-local event IDs plus reverse mapping;
2. explicit SesliTab finding -> engine evidence normalization preserving location/classification/severity;
3. fail-closed ambiguous-event selection;
4. read-only extraction of stem direction and beam-group continuity from MusicXML evidence where actually present;
5. no fabricated stem/beam/voice evidence when source data is absent;
6. tests proving source `NoteObject[]`, raw MusicXML and teacher revisions are unchanged;
7. tests proving unsupported/unmapped cases abstain rather than broaden candidates.

### Still forbidden by this record

- production MusicXML overwrite;
- Audiveris/provider/runtime/Render changes;
- direct SesliTab quality-gate bypass;
- conversion of E11A `ACCEPT` into teacher approval;
- labeling automatic proposals as teacher corrections;
- automatic duration/onset/staff/tie/tuplet/pitch/beam/relation mutation;
- multiple-patch automatic transactions;
- confidence-threshold reduction;
- E12 Visual Second-Opinion AI.

## Next bounded stage

The next safe implementation stage is a **shadow-only SesliTab evidence bridge** in `st-omr-correction-engine`:

`pinned SesliTab-shaped structured input -> deterministic ScoreGraph + evidence mapping -> existing shadow candidate/resolver -> diagnostic result`

It must not apply E11A corrections, mutate SesliTab objects, serialize MusicXML, call Audiveris/Render/network, or claim production integration.
