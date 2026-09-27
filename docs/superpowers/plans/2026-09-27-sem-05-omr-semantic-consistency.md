# SEM-05 OMR Read-Only Semantic Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, shadow-only bridge that compares an existing OMR `ScoreGraph` with a provenance-pinned ST Score Semantic Engine snapshot from the exact same MusicXML without affecting candidate resolution, correction authority, teacher-gold, readiness, or source state.

**Architecture:** Add a focused `adapters/semantic` boundary that validates pinned Semantic Engine artifacts, normalizes the admitted snapshot profile, structurally compares it with the existing immutable `ScoreGraph`, and returns a separate `SemanticConsistencyPacketV1`. The packet is intentionally outside `createEvidence()`, `EVIDENCE_SOURCE`, candidate evidence, resolver inputs, patch projection, E11A, and production-readiness code.

**Tech Stack:** Node.js >=20, ES modules, `node:test`, existing `ScoreGraph` / bounded MusicXML canonicalizer, Node `crypto` SHA-256, no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-27-sem-05-omr-semantic-consistency-design.md`

## Global Constraints

- OMR baseline is `875717ebbb4bd07bab33082a809b7a12d1b6e9b7`.
- Semantic Engine reference is pinned to commit `ffc997b242fa862e180e698385cc0afb52de47a1`.
- Semantic snapshot schema is exactly `st-semantic-snapshot-v1`.
- Partitura provenance is exactly `1.9.0`.
- `ScoreGraph` remains the OMR correction-analysis graph.
- Raw/source MusicXML and source OMR artifacts remain immutable.
- `AMBIGUOUS`, `UNSUPPORTED`, and `BLOCKED` safety outcomes remain unchanged.
- `EVIDENCE_SOURCE` must not be expanded.
- Semantic bridge code must not import or call `createEvidence()`.
- Semantic consistency findings must never be appended to `candidate.evidence`.
- `resolveCandidates()`, candidate confidence, independent-evidence thresholds, E11A, REAL_OMR readiness, and teacher-gold policy remain unchanged.
- Effective semantic consistency weight is always 0 through isolation, not through a normal evidence object.
- No Python, Partitura, REST/network service, Render, database, browser feature, MusicXML write-back, correction patch, or automatic-correction surface is added.
- First profile is exactly one part, pitched non-rest notes, fixed positive divisions-per-quarter, full non-implicit/non-pickup measures, supported voice/staff, simple tie boundary roles, and meter comparison.
- Unpitched, grace, cross-staff semantics, tuplets, beams, slurs, ornaments, non-controlling measures, pickup/implicit measures, divisions changes, transposing-instrument comparison, ambiguous duplicate unisons, key signature, and clef comparison fail closed as `UNSUPPORTED`.

## Review Focus

1. **Zero-weight evidence leakage:** a semantic packet must never become a normal evidence object or satisfy the resolver's independent-source count; Task 3 owns both static-import and behavior regressions.
2. **Source identity drift:** matching music with a different SHA/source identity must be `UNSUPPORTED`; Task 1 owns exact provenance tests.
3. **Absolute-vs-local timing:** Semantic Engine absolute division timing must be converted to ScoreGraph local quarter-beat timing from an unambiguous semantic measure timeline; Task 2 owns multi-measure tests.
4. **Duplicate unison ambiguity:** indistinguishable structural coordinates must return `UNSUPPORTED`, never arbitrary ID pairing; Task 2 owns the negative test.
5. **Reference-side diagnostics:** a snapshot carrying Semantic Engine diagnostics must not yield unconditional `PASS`; Task 1 validates the field and Task 2 preserves it as `SEMANTIC_REFERENCE_DIAGNOSTIC`.

---

### Task 1: Pin and validate the Semantic Engine reference bundle

**Files:**
- Create: `tests/fixtures/sem-05-semantic-consistency/semantic-baseline.musicxml`
- Create: `tests/fixtures/sem-05-semantic-consistency/semantic-baseline.semantic-snapshot.json`
- Create: `tests/fixtures/sem-05-semantic-consistency/provenance.json`
- Create: `adapters/semantic/semanticConsistencyContract.js`
- Create: `adapters/semantic/semanticReference.js`
- Test: `tests/semanticConsistencyReference.test.js`

**Interfaces:**
- Produces constants:
  - `SEMANTIC_CONSISTENCY_STATUS = { PASS, MISMATCH, UNSUPPORTED }`
  - `SEMANTIC_CONSISTENCY_MODE = 'SHADOW_ONLY'`
  - `SEMANTIC_CONSISTENCY_AUTHORITY = 'SEMANTIC_CONSISTENCY_ONLY'`
- Produces:
  - `validateSemanticConsistencyReference({ provenance, semanticSnapshot, observedSourceSha256, observedSourceId })`
  - `analyzeSemanticConsistencyProfile({ semanticSnapshot, provenance })`
- Valid reference result contains only frozen provenance + the validated minimal snapshot fields consumed by SEM-05.
- Invalid provenance throws a dedicated `SemanticConsistencyReferenceError` with code `INVALID_SEMANTIC_REFERENCE`.
- Unsupported musical profile returns a frozen `UNSUPPORTED` profile result rather than throwing.

- [ ] **Step 1: Copy only repository-owned reference artifacts from the pinned Semantic Engine commit**

Use the exact synthetic baseline source/snapshot from:
- `st-score-semantic-engine@ffc997b242fa862e180e698385cc0afb52de47a1:tests/fixtures/semantic_baseline.musicxml`
- `st-score-semantic-engine@ffc997b242fa862e180e698385cc0afb52de47a1:tests/fixtures/semantic_baseline.expected.json`

If the MusicXML must be minimally requalified to satisfy the existing OMR bounded canonicalizer, change only the repository-owned fixture and then regenerate the Semantic Engine snapshot from the exact changed bytes before qualification. Never edit expected semantic JSON by copying bridge output.

The provenance file pins:
- `schemaVersion: "st-omr-semantic-consistency-provenance-v1"`
- exact source SHA-256;
- exact `semanticEngineCommit`;
- `semanticSnapshotSchema: "st-semantic-snapshot-v1"`;
- `partituraVersion: "1.9.0"`;
- stable `sourceId`;
- positive integer `divisionsPerQuarter`.

- [ ] **Step 2: Write RED provenance/reference tests**

Tests must assert:
- exact valid bundle is accepted and deeply frozen;
- wrong source SHA is rejected;
- wrong source ID is rejected;
- wrong Semantic Engine commit is rejected;
- wrong snapshot schema is rejected;
- wrong Partitura version is rejected;
- non-positive/non-integer divisions is rejected;
- snapshot header mismatch is rejected;
- snapshot diagnostics are preserved, not discarded.

Run:
```bash
node --test tests/semanticConsistencyReference.test.js
```

Expected: FAIL because the semantic reference modules do not exist.

- [ ] **Step 3: Implement the minimal frozen reference contract**

Validate only fields SEM-05 consumes:
- `part_count`, `measure_count`;
- note `source_id`, `part_id`, `measure_index`, `pitch_midi`, `onset_div`, `duration_div`, `voice`, `staff`, `tie_prev`, `tie_next`, `is_grace`;
- time signature `part_id`, `onset_div`, `beats`, `beat_type`;
- `diagnostics` as immutable reference records sufficient to surface `SEMANTIC_REFERENCE_DIAGNOSTIC`.

Do not import `src/contracts/evidence.js`.

- [ ] **Step 4: Implement profile admission**

`analyzeSemanticConsistencyProfile()` returns `UNSUPPORTED` when:
- part count is not exactly 1;
- grace notes exist;
- note voice/staff is missing or non-positive;
- pitched-note fields are invalid;
- semantic timing is negative;
- semantic meter timeline is absent/invalid;
- fixture provenance declares invalid/floating divisions;
- reference diagnostics contain `UNSUPPORTED_STRUCTURE`.

Source-level exclusions not encoded by `SemanticSnapshot` (beam/slur/ornament/non-controlling/transposition) remain owned by Task 4's source-profile check before bridge comparison.

- [ ] **Step 5: GREEN verification**

Run:
```bash
node --test tests/semanticConsistencyReference.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```text
test: pin semantic consistency reference bundle
```

---

### Task 2: Compare ScoreGraph with the admitted SemanticSnapshot

**Files:**
- Create: `adapters/semantic/semanticConsistencyComparison.js`
- Test: `tests/semanticConsistencyComparison.test.js`

**Interfaces:**
- Consumes:
  - existing immutable `scoreGraph`;
  - validated reference from Task 1.
- Produces:
  - `compareScoreGraphWithSemanticReference({ scoreGraph, reference })`
  - frozen result `{ status: 'PASS'|'MISMATCH'|'UNSUPPORTED', diagnostics }`.
- Comparison diagnostics use only the SEM-05 vocabulary:
  - `SEMANTIC_REFERENCE_DIAGNOSTIC`
  - `SEMANTIC_PART_COUNT_MISMATCH`
  - `SEMANTIC_MEASURE_COUNT_MISMATCH`
  - `SEMANTIC_NOTE_COUNT_MISMATCH`
  - `SEMANTIC_PITCH_MISMATCH`
  - `SEMANTIC_ONSET_MISMATCH`
  - `SEMANTIC_DURATION_MISMATCH`
  - `SEMANTIC_VOICE_MISMATCH`
  - `SEMANTIC_STAFF_MISMATCH`
  - `SEMANTIC_TIE_ROLE_MISMATCH`
  - `SEMANTIC_METER_MISMATCH`
  - `SEMANTIC_PROFILE_UNSUPPORTED`.

- [ ] **Step 1: Write RED exact-match comparison test**

Construct a two-measure ScoreGraph that independently matches the pinned snapshot.

Assert:
- status `PASS`;
- diagnostics empty;
- repeated comparison serializes identically.

Run:
```bash
node --test tests/semanticConsistencyComparison.test.js
```

Expected: FAIL because comparator does not exist.

- [ ] **Step 2: Implement semantic measure timeline normalization**

Compute ordered semantic measure starts from:
- `measure_count`;
- time-signature contexts;
- provenance `divisionsPerQuarter`.

For measure `i`, derive the active meter at its absolute start and require an integer division-domain measure duration:
```text
measureDurationDiv =
  beats * 4 * divisionsPerQuarter / beat_type
```

If a measure start/meter cannot be resolved unambiguously, return `UNSUPPORTED`.

- [ ] **Step 3: Normalize Semantic Engine notes to ScoreGraph units**

For each supported semantic note:
```text
localOnsetQuarterBeats =
  (onset_div - measureStartDiv) / divisionsPerQuarter

durationQuarterBeats =
  duration_div / divisionsPerQuarter
```

Use exact integer/rational comparison internally rather than floating tolerance. ScoreGraph numeric onset/duration must be converted to exact rational form only when representable under the fixture divisions; otherwise `UNSUPPORTED`.

- [ ] **Step 4: Normalize eligible ScoreGraph events**

Include only events with:
- `isRest === false`;
- integer MIDI `pitch`;
- known ordered measure;
- finite non-negative onset/duration;
- positive integer voice/staff.

Tie roles come from `metadata.tieStart` / `metadata.tieStop`.

Return `UNSUPPORTED` for invalid eligible-event structure.

- [ ] **Step 5: Implement deterministic structural pairing**

Primary key:
```text
measure index
staff
voice
local onset
pitch MIDI
occurrence ordinal
```

Use a two-pass diagnostic strategy:
1. exact pairing with full structural key;
2. for one-field mismatch classification, a unique structural-slot fallback may omit exactly the field being classified.

If multiple candidates are possible in a fallback or duplicate unison coordinates are indistinguishable, return `UNSUPPORTED`.

Raw ScoreGraph event IDs and Semantic Engine `source_id` are never equality keys.

- [ ] **Step 6: Add independent mismatch tests**

Mutate independent test data one field at a time and assert:
- measure count;
- note count;
- pitch;
- onset;
- duration;
- voice;
- staff;
- tie role;
- meter.

Also assert duplicate-unison ambiguity → `UNSUPPORTED`.

- [ ] **Step 7: Preserve Semantic Engine diagnostics**

If the reference carries diagnostics:
- emit deterministic `SEMANTIC_REFERENCE_DIAGNOSTIC` entries;
- status cannot be unconditional `PASS`;
- a reference `UNSUPPORTED_STRUCTURE` diagnostic makes the comparison `UNSUPPORTED`.

- [ ] **Step 8: GREEN verification**

Run:
```bash
node --test tests/semanticConsistencyComparison.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 9: Commit**

```text
feat: compare ScoreGraph with semantic reference
```

---

### Task 3: Build the isolated shadow packet and prove resolver non-interference

**Files:**
- Create: `adapters/semantic/semanticConsistencyBridge.js`
- Test: `tests/semanticConsistencyBridge.test.js`
- Test: `tests/semanticConsistencyResolverIsolation.test.js`

**Interfaces:**
- Consumes:
  - `scoreGraph`;
  - validated reference or raw reference bundle inputs accepted by Task 1.
- Produces:
  - `analyzeSemanticConsistency({ scoreGraph, provenance, semanticSnapshot, observedSourceSha256, observedSourceId })`.
- Returns frozen `SemanticConsistencyPacketV1` with:
  - `mode: 'SHADOW_ONLY'`
  - `authority: 'SEMANTIC_CONSISTENCY_ONLY'`
  - `effectiveWeight: 0`
  - `resolverEligible: false`
  - `candidateEvidenceEligible: false`
  - `automaticCorrectionAuthority: false`
  - `teacherGoldAuthority: false`
  - `readinessPromotionAuthority: false`
  - exact original `sourceGraph`
  - frozen provenance
  - comparison `status` and `diagnostics`
  - invariants proving no source mutation and no patch production.

- [ ] **Step 1: Write RED packet contract test**

Assert exact authority fields, frozen output, exact `sourceGraph` object identity, no patch/apply/accept/corrected-score fields, and deterministic serialization.

Expected: FAIL because bridge does not exist.

- [ ] **Step 2: Implement deterministic source fingerprint guard**

Fingerprint `JSON.stringify(scoreGraph)` before and after comparison using SHA-256.

If content changes, throw a hard invariant error.

Return invariants:
- `scoreUnchanged: true`
- `sourceMutation: false`
- `correctionPatchesProduced: false`
- `automaticCorrectionAuthority: false`
- `resolverEligible: false`.

- [ ] **Step 3: Write static authority-boundary regression**

Read `adapters/semantic/*.js` source and assert no import/reference to:
- `src/contracts/evidence.js`;
- `createEvidence`;
- `EVIDENCE_SOURCE`;
- `src/resolver/`;
- `src/candidates/`;
- `src/correction/patchProjection.js`;
- `src/correction/patchReverter.js`;
- readiness / E11A modules;
- network APIs.

Assert `package.json` dependencies remain exactly:
```json
{ "@tonejs/midi": "2.0.28" }
```

- [ ] **Step 4: Write RED resolver-isolation behavior test**

Create the same existing candidate set twice.

Flow:
1. resolve candidates and capture exact result JSON;
2. run `analyzeSemanticConsistency(...)`;
3. resolve the original candidate set again;
4. assert exact result JSON is unchanged;
5. assert packet object is never inserted into candidate evidence;
6. assert `EVIDENCE_SOURCE` remains exactly `VALIDATOR/SYMBOLIC/VISUAL/TEACHER`.

The test must specifically prove a semantic packet cannot turn a one-source candidate from `AMBIGUOUS` into `RESOLVED`.

- [ ] **Step 5: GREEN verification**

Run:
```bash
node --test   tests/semanticConsistencyBridge.test.js   tests/semanticConsistencyResolverIsolation.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```text
feat: add isolated semantic consistency shadow bridge
```

---

### Task 4: Qualify the bridge through the real bounded MusicXML canonicalizer

**Files:**
- Create: `tests/semanticConsistencyE2E.test.js`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/CURRENT_STATUS.md`

**Interfaces:**
- Consumes:
  - exact fixture bytes;
  - existing `parseBoundedMusicXmlScoreGraph(...)`;
  - Task 1 reference/provenance;
  - Task 3 bridge.
- Produces no product mutation API; qualification evidence only.

- [ ] **Step 1: Write RED real-path PASS test**

Flow:
1. read exact fixture bytes;
2. call `parseBoundedMusicXmlScoreGraph(bytes, { sourceId })`;
3. assert canonicalizer SHA equals provenance source SHA;
4. run a source-profile guard on the exact MusicXML bytes for SEM-05 exclusions not visible in SemanticSnapshot;
5. analyze semantic consistency;
6. assert `PASS`;
7. assert ScoreGraph object/content unchanged;
8. assert no patch/apply/corrected-score surface.

If the pinned Semantic Engine fixture is not accepted by the existing bounded OMR canonicalizer, requalify only the synthetic fixture as described in Task 1 and regenerate the independent snapshot/provenance before continuing.

- [ ] **Step 2: Implement source-profile guard**

Add a focused helper in `adapters/semantic/semanticSourceProfile.js` and test through the E2E surface.

Fail closed on:
- multiple parts;
- `<unpitched>`;
- `<grace>`;
- `<beam>`;
- `<slur>`;
- `<tuplet>`;
- tremolo/ornament markup;
- `non-controlling`;
- `implicit="yes"`;
- more than one distinct `<divisions>` value;
- non-zero `<transpose><chromatic>`.

Use the existing bounded MusicXML parser/canonicalizer assumptions where possible; do not add a new external XML dependency.

- [ ] **Step 3: Add source-profile negative tests**

At minimum:
- mixed divisions → `UNSUPPORTED`;
- grace → `UNSUPPORTED`;
- non-zero transposition → `UNSUPPORTED`;
- implicit/pickup measure → `UNSUPPORTED`.

- [ ] **Step 4: Add exact-source mismatch test**

Use the correct musical fixture with one byte/text change that changes SHA but not the intended notes.

Assert provenance/source mismatch prevents `PASS`.

- [ ] **Step 5: Update repository documentation truthfully**

README / ARCHITECTURE / CURRENT_STATUS must state:
- SEM-05 is shadow/reference consistency only;
- same-source Semantic Engine output is not independent evidence;
- `createEvidence`, resolver confidence, readiness, teacher-gold and E11A are unchanged;
- no runtime Python/Partitura/network service exists;
- no automatic correction or MusicXML write-back is authorized.

Do not claim general OMR accuracy improvement.

- [ ] **Step 6: Focused verification**

Run:
```bash
node --test   tests/semanticConsistencyReference.test.js   tests/semanticConsistencyComparison.test.js   tests/semanticConsistencyBridge.test.js   tests/semanticConsistencyResolverIsolation.test.js   tests/semanticConsistencyE2E.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 7: Full repository verification**

Run:
```bash
npm test
npm run check
```

Require fresh exact-head GitHub Actions `test-and-build` PASS on Node 20 before qualification.

- [ ] **Step 8: Whole-branch Codex Engineering Guardrails review**

Inspect exact diff from main and verify:
- only approved semantic adapter/tests/fixtures/docs changed;
- `src/contracts/evidence.js` unchanged;
- `src/resolver/candidateResolver.js` unchanged;
- candidate modules unchanged;
- patch projection/reverter unchanged;
- E11A/readiness modules unchanged;
- package dependencies unchanged;
- no network/service/Render configuration;
- no Semantic Engine/Partitura source copied;
- source graph fingerprints unchanged in tests;
- deterministic diagnostics;
- no generated expected output from bridge implementation.

Important/Critical findings require test-first correction before qualification.

- [ ] **Step 9: Commit**

```text
test: qualify OMR semantic consistency shadow bridge
```

---

## Completion report

Use:

```text
COMPLETED: SEM-05 — OMR read-only semantic consistency
RESULT: <observable PASS/MISMATCH/UNSUPPORTED behavior>
VERIFICATION: <focused tests + full suite + exact-head CI>
NOTION: <updated spec/plan>
LINEAR: <updated issues>
RENDER: UNCHANGED
BLOCKERS: <none or exact blocker>
NEXT: <next consumer architecture gate, if separately approved>
NEXT START CONDITION: separate explicit user approval
```

## Merge boundary

Implementation-plan approval authorizes isolated branch execution only.

It does **not** authorize:
- merging docs PR #93 or a later implementation PR to `main`;
- deployment or Render changes;
- Semantic Engine REST/runtime integration;
- adding Python/Partitura to OMR dependencies;
- candidate/resolver integration;
- confidence-policy changes;
- teacher-gold/readiness promotion;
- E11A expansion;
- MusicXML write-back or automatic correction.

## Execution recommendation

**Native execution is recommended** because Tasks 1–4 are sequentially coupled through one small immutable reference/comparison contract, while the most important safety property is whole-branch isolation from resolver/evidence/apply authority. A final Guardrails review is mandatory before any merge decision.
