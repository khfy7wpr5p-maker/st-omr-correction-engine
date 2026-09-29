# CE-STRUCT-01 Teacher-Authorized Structural OMR Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a teacher-authorized structural correction lane that can represent explicit teacher edits for missing/extra note or rest events, duration/voice/staff/tie changes, and meter changes as exact-revision-bound, atomic, reversible ScoreGraph patches with independent structural revalidation and a read-only SesliTab host packet.

**Architecture:** Keep CE-STRUCT-01 isolated from the existing automatic/shadow `PATCH_OPERATION` path. Add a separate immutable `TeacherStructuralPatchSetV1` contract, dedicated projector/reverter, independent structural revalidator, and read-only SesliTab adapter. The source graph stays immutable; E11A, resolver/candidate authority, REAL_OMR readiness, MusicXML write-back, persistence and deployment remain unchanged.

**Tech Stack:** Node.js >=20, ES modules, `node:test`, existing `ScoreGraph` / `ScoreEvent` / `Measure` constructors, Node `crypto` SHA-256, no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-29-ce-struct-01-teacher-structural-correction-design.md`

## Global Constraints

- Repository baseline is `589c996ee0945ab6fb1169e7f0c7abfeb56add35`.
- Raw/source MusicXML and OMR source artifacts remain immutable.
- Teacher intent is explicit and host-supplied; the engine never infers missing musical content.
- Structural topology operations must not be added to `PATCH_OPERATION`.
- Existing `projectCorrectionPatches()`, `revalidateProjectedRevisionV2()`, resolver/candidate logic, REAL_OMR readiness, and E11A policy remain unchanged.
- E11A remains exactly one high-confidence `CHANGE_VOICE` automatic slice with its current evidence/revalidation rules.
- Teacher edit authorization is not final teacher approval.
- Structural revalidation PASS is integrity proof, not musical-correctness proof.
- No MusicXML serializer/write-back is added.
- No database, object storage, persistent learning corpus, authentication provider, student-delivery authority, Render service/domain, REST endpoint, or browser UI is added.
- No new package dependency.
- Fail closed on stale base revision, missing authorization, ambiguous target, unsupported operation, invalid patch value, or failed rollback.
- Mixed patch sets are atomic: any failed patch leaves the exact source graph authoritative.
- Final implementation must stop before merge and deployment.

## Review Focus

1. **Authority leakage:** teacher structural operations must never enter the automatic `PATCH_OPERATION`/E11A lane; Tasks 1 and 6 own explicit regression tests.
2. **Stale revision replay:** a valid patch set replayed against a different graph fingerprint or source identity must fail closed; Tasks 1 and 3 own this.
3. **Partial projection:** a mixed patch set with one invalid late patch must not expose a partially modified graph; Task 3 owns the atomicity regression.
4. **Revalidation semantics:** pre-existing unrelated findings may remain residual, while newly introduced blocking findings fail; Task 5 owns normalized before/after finding comparison.
5. **Authorization vs approval confusion:** adapter output must keep `automaticApplyAuthority=false`, `finalTeacherApproval=false`, `studentShareEligible=false`, and `learningAuthority=false`; Task 6 owns this.

---

### Task 1: Define the isolated teacher structural patch contract

**Files:**
- Create: `src/contracts/teacherStructuralPatch.js`
- Create: `tests/teacherStructuralPatchContract.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces `TEACHER_STRUCTURAL_PATCH_SCHEMA_VERSION = 'teacher-structural-patch-set-v1'`.
- Produces `TEACHER_STRUCTURAL_OPERATION` with exactly:
  - `INSERT_EVENT`
  - `REMOVE_EVENT`
  - `CHANGE_EVENT_DURATION`
  - `CHANGE_EVENT_VOICE`
  - `CHANGE_EVENT_STAFF`
  - `CHANGE_EVENT_TIE`
  - `CHANGE_MEASURE_METER`
- Produces `createTeacherEditAuthorization({ actionId })`.
- Produces `createTeacherStructuralPatch({...})`.
- Produces `createTeacherStructuralPatchSet({ patchSetId, baseSourceId, baseGraphFingerprint, authorization, patches })`.
- Every returned contract object is frozen.
- Patch sets always expose:
  - `automaticApplyAuthority: false`
  - `finalTeacherApproval: false`
  - `studentShareEligible: false`

- [ ] **Step 1: Write RED contract tests**

Assert:
- authorization requires non-empty `actionId`;
- patch set requires explicit authorization;
- patch set requires non-empty `patchSetId`, `baseSourceId`, 64-char lowercase SHA-256 `baseGraphFingerprint`, and non-empty patch array;
- structural operation enum contains exactly the seven approved values;
- unsupported operation is rejected;
- all contract objects are deeply immutable enough that patches/arrays cannot be modified;
- patch-set authority flags are always false;
- `PATCH_OPERATION` remains byte-for-byte behaviorally limited to its pre-existing values and does not contain any `INSERT_EVENT`, `REMOVE_EVENT`, or `CHANGE_MEASURE_METER` value.

Run:
```bash
node --test tests/teacherStructuralPatchContract.test.js
```

Expected: FAIL because the teacher structural contract does not exist.

- [ ] **Step 2: Implement exact operation validation**

`createTeacherStructuralPatch()` accepts:
- `operation`;
- `measureKey`;
- optional `eventId`;
- `before`;
- `after`.

Operation-specific shape rules:
- `INSERT_EVENT`: `eventId` is required, `before === null`, `after` is an object.
- `REMOVE_EVENT`: `eventId` is required, `before` is an object, `after === null`.
- event field changes: `eventId` required and both `before` and `after` required.
- `CHANGE_MEASURE_METER`: no event target; both `before` and `after` are complete meter-state objects.

Do not validate musical correctness here; validate only contract shape.

- [ ] **Step 3: Add base-graph fingerprint helper**

Add to the same focused contract module:

`fingerprintScoreGraph(scoreGraph) -> lowercase SHA-256`

Use deterministic `JSON.stringify(scoreGraph)` over the existing frozen canonical graph shape.

Assert repeated calls are stable and a one-field graph change changes the hash.

- [ ] **Step 4: Export only the public structural contract from `src/index.js`**

Do not modify any existing export semantics.

- [ ] **Step 5: GREEN verification**

Run:
```bash
node --test tests/teacherStructuralPatchContract.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```text
feat: define teacher structural patch contract
```

---

### Task 2: Validate and materialize exact structural edit payloads

**Files:**
- Create: `src/correction/teacherStructuralPatchValidation.js`
- Create: `tests/teacherStructuralPatchValidation.test.js`

**Interfaces:**
- Consumes a `ScoreGraph` and one `TeacherStructuralPatchV1`.
- Produces:
  - `validateTeacherStructuralPatchAgainstGraph({ scoreGraph, patch })`
  - frozen success result `{ ok: true, normalizedPatch }`
  - frozen fail-closed result `{ ok: false, code, patch }`
- Uses existing `createScoreEvent()` and `createMeasure()` constructors as domain validators.
- Does not mutate the graph.

- [ ] **Step 1: Write RED insertion tests**

Build a one-measure source graph and assert:
- explicit inserted note event is accepted;
- explicit inserted rest event is accepted;
- insertion with incomplete ScoreEvent payload fails `INVALID_INSERT_EVENT`;
- duplicate event id fails `INSERT_EVENT_ID_ALREADY_EXISTS`;
- unknown target measure fails `INSERT_MEASURE_NOT_FOUND`.

The test must prove the validator does not derive pitch, onset, duration, voice, staff, or rest state from neighboring events or meter.

- [ ] **Step 2: Implement insertion validation**

Materialize `after` only by passing the explicit payload through `createScoreEvent()`.

Require:
- `after.id === patch.eventId`;
- `after.measureKey === patch.measureKey`;
- no duplicate id in source graph.

Return the constructor-produced event as normalized `after`.

- [ ] **Step 3: Write RED removal tests**

Assert:
- remove note/rest is accepted only when the target exists and the full declared `before` snapshot equals the exact current event;
- changed duration/pitch/metadata in the declared `before` causes `STALE_STRUCTURAL_BEFORE_MISMATCH`;
- unknown event causes `STRUCTURAL_TARGET_NOT_FOUND`.

- [ ] **Step 4: Implement exact removal validation**

Use deterministic deep value equality, not object identity and not fuzzy matching.

No nearest-note, pitch-only, or measure-number-only fallback.

- [ ] **Step 5: Write and implement event-field change validation**

Cover:
- duration through `createScoreEvent()`;
- voice through `createScoreEvent()`;
- staff through `createScoreEvent()`;
- tie through the existing bounded `metadata.tieTypes` start/stop representation.

Reject:
- negative duration;
- non-positive/non-integer voice/staff;
- arbitrary tie values;
- arbitrary metadata mutation.

- [ ] **Step 6: Write and implement meter-change validation**

Validate complete meter snapshots through `createMeasure()`.

Require:
- existing measure key;
- exact current `before` state for `beats`, `beatType`, `implicit`, `pickup`;
- same immutable measure key;
- `expectedQuarterBeats` is constructor-derived, never independently accepted from patch input.

- [ ] **Step 7: GREEN verification**

Run:
```bash
node --test tests/teacherStructuralPatchValidation.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 8: Commit**

```text
feat: validate teacher structural edits
```

---

### Task 3: Project teacher structural patch sets atomically and immutably

**Files:**
- Create: `src/correction/teacherStructuralProjection.js`
- Create: `tests/teacherStructuralProjection.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes exact base `ScoreGraph` + `TeacherStructuralPatchSetV1`.
- Produces:
  - `projectTeacherStructuralPatchSet(scoreGraph, patchSet)`
- Success:
  - `{ ok: true, code: 'TEACHER_STRUCTURAL_PROJECTED', sourceGraph, graph, audit }`
- Failure:
  - `{ ok: false, code, sourceGraph, graph: sourceGraph, audit: [] }`
- Projection is all-or-nothing.

- [ ] **Step 1: Write RED revision-binding tests**

Assert fail closed when:
- `scoreGraph.sourceId !== patchSet.baseSourceId`;
- `fingerprintScoreGraph(scoreGraph) !== patchSet.baseGraphFingerprint`;
- authorization missing/invalid.

Expected codes:
- `STRUCTURAL_SOURCE_ID_MISMATCH`
- `STRUCTURAL_BASE_FINGERPRINT_MISMATCH`
- `STRUCTURAL_TEACHER_AUTHORIZATION_REQUIRED`

- [ ] **Step 2: Write RED single-operation projection tests**

Independently prove:
- insert note;
- insert rest;
- remove note;
- remove rest;
- duration change;
- voice change;
- staff change;
- tie change;
- meter change.

For every case assert:
- `sourceGraph` is the exact original object;
- source content unchanged;
- projected graph is a new graph;
- projected `sourceId` equals base `sourceId`;
- audit records exact operation, measure/event target, before/after and order.

- [ ] **Step 3: Implement atomic working-copy projection**

Algorithm boundary:
1. validate revision binding before any working copy;
2. validate and apply each patch sequentially to private arrays;
3. rebuild changed events/measures with existing constructors;
4. if any patch fails, discard working state and return exact source graph;
5. only after all patches pass, call `createScoreGraph()`.

Do not call `projectCorrectionPatches()`.

- [ ] **Step 4: Write RED mixed-patch atomicity test**

Use a patch set where the first patch is valid and the second is stale.

Assert:
- result `ok === false`;
- result graph is exact source object;
- source unchanged;
- no partial audit is exposed as authoritative;
- no inserted/changed event survives.

- [ ] **Step 5: Add replay/staleness regression**

Project once, then replay the same patch set against the projected graph.

Assert fingerprint/source revision guard blocks replay.

- [ ] **Step 6: GREEN verification**

Run:
```bash
node --test tests/teacherStructuralProjection.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```text
feat: project teacher structural patch sets atomically
```

---

### Task 4: Add deterministic inverse and exact rollback

**Files:**
- Create: `src/correction/teacherStructuralReverter.js`
- Create: `tests/teacherStructuralReverter.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces:
  - `invertTeacherStructuralPatch(patch)`
  - `invertTeacherStructuralPatchSet(patchSet, { projectedGraph })`
  - `revertTeacherStructuralPatchSet(projectedGraph, patchSet)`
- Reversal uses inverse patches in reverse order.

- [ ] **Step 1: Write RED inverse-contract tests**

Assert exact inverses:
- INSERT ↔ REMOVE;
- REMOVE ↔ INSERT;
- duration/voice/staff/tie before/after swapped;
- meter before/after swapped.

- [ ] **Step 2: Implement inverse patches**

For INSERT→REMOVE, the declared inserted event becomes exact removal `before`.
For REMOVE→INSERT, the removed event snapshot becomes exact insertion `after`.

Preserve original measure/event targets.

- [ ] **Step 3: Write RED exact rollback tests**

For each single operation and one mixed patch set:
1. project base;
2. revert projected graph;
3. assert `deepEqual(reverted.graph, sourceGraph)`;
4. assert original source and projected graph remain unchanged.

- [ ] **Step 4: Implement revert using the structural projector**

Build an inverse patch set bound to the exact projected graph fingerprint/source identity, then call `projectTeacherStructuralPatchSet()`.

Do not bypass normal stale checks.

- [ ] **Step 5: Add failure test**

Tamper with projected graph before revert.

Assert reversion fails closed and does not claim exact rollback.

- [ ] **Step 6: GREEN verification**

Run:
```bash
node --test tests/teacherStructuralReverter.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```text
feat: add exact structural patch rollback
```

---

### Task 5: Independently revalidate teacher structural revisions

**Files:**
- Create: `src/validation/teacherStructuralRevalidation.js`
- Create: `tests/teacherStructuralRevalidation.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces:
  - `revalidateTeacherStructuralRevision({ sourceGraph, projectedGraph, patchSet, tolerance = 0.01 })`
- Returns frozen:
  - `mode: 'TEACHER_STRUCTURAL_REVALIDATION_V1'`
  - `integrityDecision: 'PASS'|'FAIL'`
  - `findings`
  - `resolvedFindings`
  - `residualFindings`
  - `newFindings`
  - `reversibilityVerified`
  - `sourceMutationDetected`
  - `musicalCorrectnessProven: false`
  - `finalTeacherApproval: false`

- [ ] **Step 1: Write RED declared-diff tests**

For an admitted insert/remove/field/meter patch set, assert revalidator verifies exactly the declared diff and returns PASS.

Also assert PASS does not set musical correctness or final teacher approval.

- [ ] **Step 2: Implement independent structural diff verification**

Verify independently from the projector:
- same source id;
- same measure key/order/count;
- only declared meter fields changed;
- declared inserted event exists exactly once with exact payload;
- declared removed event is absent;
- unchanged events remain byte/value-equivalent;
- declared event-field changes match exact `after`;
- no undeclared metadata or event mutation exists.

Do not call the candidate resolver.

- [ ] **Step 3: Write RED undeclared-change regressions**

Assert FAIL for:
- undeclared inserted event;
- undeclared removed event;
- undeclared pitch change;
- undeclared metadata change;
- undeclared meter change;
- measure reordering/key change.

- [ ] **Step 4: Reuse deterministic anomaly detectors only as post-edit validators**

Run the existing admitted checks against both source and projected graph:
- pitch anomaly detector;
- onset anomaly detector;
- duration anomaly detector;
- staff anomaly detector;
- tie anomaly detector;
- tuplet anomaly detector;
- same-voice overlap check equivalent to current independent revalidation.

Normalize findings deterministically so source/projected sets can be compared.

- [ ] **Step 5: Write RED finding-classification tests**

Create a source with one unrelated pre-existing finding and a teacher patch that fixes a different problem.

Assert:
- pre-existing unrelated finding appears in `residualFindings`;
- fixed declared finding may appear in `resolvedFindings`;
- no new blocking finding → PASS;
- newly introduced overlap/tie/duration structural finding appears in `newFindings` and → FAIL.

Do not treat “measure arithmetic now balances” as proof of correctness.

- [ ] **Step 6: Add exact rollback proof**

Call `revertTeacherStructuralPatchSet()`.

Require exact deep equality with source graph; otherwise add `STRUCTURAL_REVERSIBILITY_MISMATCH` and FAIL.

- [ ] **Step 7: Add source-mutation guard**

Fingerprint source before/after revalidation.

Any mutation is a hard FAIL with `STRUCTURAL_SOURCE_MUTATION_DETECTED`.

- [ ] **Step 8: GREEN verification**

Run:
```bash
node --test tests/teacherStructuralRevalidation.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 9: Commit**

```text
feat: independently revalidate structural teacher edits
```

---

### Task 6: Add read-only SesliTab structural-edit adapter and authority isolation

**Files:**
- Create: `adapters/seslitab/teacherStructuralEditAdapter.js`
- Create: `tests/teacherStructuralEditAdapter.test.js`
- Create: `tests/teacherStructuralAuthorityIsolation.test.js`
- Modify: `src/index.js`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/CURRENT_STATUS.md`

**Interfaces:**
- Produces:
  - `processSesliTabTeacherStructuralEdit({ scoreGraph, patchSet })`
- Internally runs:
  1. structural projection;
  2. structural revalidation when projection succeeds.
- Returns immutable host packet with:
  - `mode: 'TEACHER_AUTHORIZED_STRUCTURAL_EDIT'`
  - exact `sourceGraph`
  - `patchSet`
  - `projection`
  - `revalidation`
  - `teacherCorrectedRevisionEligible` only when projection succeeds and integrityDecision is PASS
  - `automaticApplyAuthority: false`
  - `finalTeacherApproval: false`
  - `studentShareEligible: false`
  - `musicXmlWriteBackAuthority: false`
  - `learningAuthority: false`

- [ ] **Step 1: Write RED adapter contract tests**

Assert:
- successful projection + PASS revalidation → `teacherCorrectedRevisionEligible === true`;
- any projection failure → false;
- revalidation FAIL → false;
- all authority flags remain false;
- packet exposes no automatic apply, MusicXML serializer, student delivery, or persistence function;
- source graph remains exact original identity.

- [ ] **Step 2: Implement minimal adapter**

Do not infer Smoosic intent from arbitrary edited MusicXML.

Adapter accepts only explicit patch sets produced from an exact teacher action payload.

- [ ] **Step 3: Write static authority-isolation regression**

Read the new structural modules and assert:
- no structural operation added to `src/contracts/correctionPatch.js`;
- `src/correction/controlledAutoCorrection.js` is unchanged relative to main;
- no structural projector import in `controlledAutoCorrection.js`;
- no resolver/candidate import in structural projector/revalidator/adapter;
- no readiness module import;
- no MusicXML serializer/write-back module;
- no network/Render/database dependency;
- `package.json` dependencies remain exactly `{ "@tonejs/midi": "2.0.28" }`.

- [ ] **Step 4: Add direct E11A regression**

Assert:
- `E11A_CONTROLLED_POLICY.minConfidence === 0.9`;
- `minIndependentEvidenceSources === 2`;
- `maxPatches === 1`;
- `allowedOperations` remains exactly `[PATCH_OPERATION.CHANGE_VOICE]`;
- a teacher structural patch set cannot be passed as an E11A correction patch and cannot widen automatic apply.

- [ ] **Step 5: Update repository documentation truthfully**

README / ARCHITECTURE / CURRENT_STATUS may state only:
- explicit teacher-authored structural edits can be represented as reversible ScoreGraph revisions;
- source remains immutable;
- structural integrity is independently revalidated;
- edit authorization is not final teacher approval;
- automatic correction is not widened;
- no MusicXML write-back, persistence or deployment is added.

Do not claim:
- automatic missing-note/rest correction;
- musical correctness from revalidation;
- teacher-corrected equals teacher-approved;
- student delivery authority.

- [ ] **Step 6: Focused verification**

Run:
```bash
node --test \
  tests/teacherStructuralPatchContract.test.js \
  tests/teacherStructuralPatchValidation.test.js \
  tests/teacherStructuralProjection.test.js \
  tests/teacherStructuralReverter.test.js \
  tests/teacherStructuralRevalidation.test.js \
  tests/teacherStructuralEditAdapter.test.js \
  tests/teacherStructuralAuthorityIsolation.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 7: Full repository verification**

Run:
```bash
npm test
npm run check
```

Require all existing tests plus new structural tests GREEN.

- [ ] **Step 8: Exact-head CI qualification**

Push the branch and require fresh GitHub Actions test/build checks PASS at the exact branch head.

Do not qualify from an older workflow run.

- [ ] **Step 9: Whole-diff Codex Engineering Guardrails review**

Review exact `main...branch` diff and verify:
- only approved structural contract/validation/projection/reversion/revalidation/adapter/tests/docs changed;
- `src/contracts/correctionPatch.js` unchanged;
- `src/correction/controlledAutoCorrection.js` unchanged;
- resolver/candidate/readiness behavior unchanged;
- no MusicXML write-back;
- no heuristic reconstruction of teacher intent;
- no persistence/auth/student-delivery/Render changes;
- no new dependency;
- source immutability, atomicity, exact rollback, and authority flags proven;
- no Important/Critical finding remains.

Any Important/Critical finding requires a RED test before the fix.

- [ ] **Step 10: Commit**

```text
test: qualify teacher structural correction lane
```

---

## Completion report

Use:

```text
COMPLETED: CE-STRUCT-01 — teacher-authorized structural OMR correction lane
RESULT: <observable structural edit/projection/revalidation behavior>
VERIFICATION: <focused tests + full suite + exact-head CI + whole-diff review>
NOTION: <updated page>
LINEAR: SES-107 <state>
RENDER: UNCHANGED
MERGE: NOT PERFORMED
DEPLOY: NOT PERFORMED
BLOCKERS: <none or exact blocker>
NEXT: <merge decision or next approved package>
NEXT START CONDITION: explicit user approval
```

## Merge boundary

Approval of this implementation plan authorizes isolated branch execution only.

It does **not** authorize:
- merge to `main`;
- deployment;
- new Render service/domain;
- automatic structural correction;
- MusicXML write-back;
- database/object storage or persistent learning;
- authentication changes;
- student delivery;
- E11A expansion;
- readiness-policy expansion.

## Execution recommendation

**Native execution is recommended** because Tasks 1–6 form one sequential structural contract with tightly coupled exact interfaces, while the critical risk is authority leakage into the automatic correction path. The plan therefore keeps implementation local to one branch and requires an independent whole-diff Guardrails review before any merge decision.
