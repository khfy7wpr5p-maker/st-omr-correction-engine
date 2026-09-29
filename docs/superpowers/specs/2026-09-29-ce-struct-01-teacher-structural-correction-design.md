# CE-STRUCT-01 — Teacher-Authorized Structural OMR Correction Architecture

Date: 2026-09-29  
Status: WRITTEN SPEC — USER REVIEW REQUIRED BEFORE IMPLEMENTATION PLAN  
Repository: `khfy7wpr5p-maker/st-omr-correction-engine`  
Baseline: `589c996ee0945ab6fb1169e7f0c7abfeb56add35`  
Linear: SES-107

## 1. Purpose

CE-STRUCT-01 adds a **teacher-authorized structural correction lane** for real OMR failures that cannot be represented safely as the current bounded automatic/event-value correction path.

Target cases are limited to the SES-107 contract:

- missing note/event;
- extra note/event;
- missing rest;
- extra rest;
- wrong note/rest duration;
- wrong meter/time signature;
- wrong tie boundary;
- wrong voice assignment;
- wrong staff assignment.

The engine does not infer the missing musical content. The teacher supplies the intended edit explicitly. The engine's job is to represent that edit as a deterministic, reversible patch, project it without mutating source data, independently revalidate the resulting structure, and return a host-consumable result.

## 2. Existing authority that remains unchanged

The following boundaries are unchanged:

- raw/source MusicXML remains immutable;
- the correction engine is not an OMR recognizer;
- current detector/candidate/resolver behavior remains bounded and fail-closed;
- `AMBIGUOUS` / abstention remains a valid outcome;
- proposal authority is not automatic-apply authority;
- E11A remains the only automatic-correction slice;
- E11A remains a single high-confidence `CHANGE_VOICE` correction with its existing independent-evidence and revalidation requirements;
- automatic DURATION correction remains blocked;
- teacher-gold/readiness rules remain unchanged;
- no production MusicXML write-back is added;
- no student sharing authority is added;
- no database, object storage, Render service, domain, authentication system, or learning pipeline is added.

CE-STRUCT-01 must not modify `E11A_CONTROLLED_POLICY`, `applyControlledVoiceCorrection()`, the resolver threshold, candidate evidence counting, REAL_OMR readiness, or current automatic-correction policy.

## 3. Critical semantic distinction: edit authorization is not final teacher approval

CE-STRUCT-01 needs proof that a structural edit came from an explicit teacher action. That proof authorizes **this edit operation only**.

It does **not** mean:

- the whole score is musically correct;
- the revision is teacher-approved for student use;
- the revision may be shared with a student;
- the edit may be learned from automatically;
- the same change may be applied unattended to future scores.

The output of a successful CE-STRUCT-01 operation is at most eligible to become a **teacher-corrected revision** in the host application. Final `teacher_approved` state remains a separate explicit host action.

The correction engine does not authenticate a person. SesliTab owns user/session authorization. The engine only requires an explicit host-supplied teacher-edit authorization record and preserves its opaque action identifier for audit.

## 4. Chosen architecture

Use a dedicated structural lane, separate from the existing automatic correction patch enum.

```text
Teacher action in SesliTab/Smoosic
        |
        v
explicit edit payload + teacher-edit authorization
        |
        v
TeacherStructuralPatchSetV1
        |
        v
structural contract validation
        |
        v
atomic immutable projection
        |
        v
independent structural diff + validator revalidation
        |
        +---- FAIL / REVIEW -> source remains authoritative
        |
        v
PASS integrity result
        |
        v
read-only host packet
        |
        v
host may materialize a teacher-corrected revision
(final teacher approval remains separate)
```

The existing `PATCH_OPERATION` / `projectCorrectionPatches()` lane remains unchanged. Structural topology edits do not get added to the automatic E11A path.

## 5. Why a separate structural patch contract is required

The current `CorrectionPatch` model targets one existing event by `eventId + measureKey` and changes one field. The current independent revalidator also assumes event count and measure structure remain unchanged.

Missing/extra events and meter changes violate those assumptions.

Adding insert/remove/meter operations directly to `PATCH_OPERATION` would unnecessarily broaden a contract consumed by automatic and shadow correction code. CE-STRUCT-01 therefore uses a separate teacher-only contract so structural edit capability cannot silently become automatic correction authority.

## 6. Structural patch-set contract

The first implementation defines an immutable `TeacherStructuralPatchSetV1`.

Required patch-set fields:

```text
schemaVersion: "teacher-structural-patch-set-v1"
patchSetId: non-empty stable action id
baseSourceId: non-empty ScoreGraph source identity
baseGraphFingerprint: SHA-256 of exact base ScoreGraph content
authorization:
  mode: "EXPLICIT_TEACHER_EDIT"
  actionId: non-empty opaque host action id
patches: ordered non-empty structural patch array
automaticApplyAuthority: false
finalTeacherApproval: false
studentShareEligible: false
```

The host must provide the explicit edit intent. The engine must never manufacture the authorization record.

The patch set is bound to the exact ScoreGraph revision by both source identity and graph fingerprint. Filename, title, measure number, visual similarity, or musical similarity are insufficient identity.

## 7. Structural operation vocabulary

Define a separate `TEACHER_STRUCTURAL_OPERATION` with only:

- `INSERT_EVENT`
- `REMOVE_EVENT`
- `CHANGE_EVENT_DURATION`
- `CHANGE_EVENT_VOICE`
- `CHANGE_EVENT_STAFF`
- `CHANGE_EVENT_TIE`
- `CHANGE_MEASURE_METER`

No generic `CHANGE_RELATION` and no arbitrary metadata mutation are allowed.

### 7.1 INSERT_EVENT

Used only when the teacher explicitly supplies a complete event.

Rules:

- `before = null`;
- `after` contains a complete event payload accepted by the existing `createScoreEvent()` contract;
- event id is explicit and must be unique;
- target measure must already exist;
- note/rest identity is explicit through `isRest`;
- pitch, onset, duration, voice, staff and supported metadata come from the teacher edit payload;
- the engine does not derive missing values from meter arithmetic or neighboring notes.

### 7.2 REMOVE_EVENT

Rules:

- target event must exist;
- `before` is an exact full snapshot of the event being removed;
- `after = null`;
- any stale mismatch fails closed.

### 7.3 CHANGE_EVENT_DURATION / VOICE / STAFF / TIE

These operations are teacher-authorized structural edits, not automatic corrections.

Rules:

- exact `eventId + measureKey` target;
- exact `before` match required;
- `after` must satisfy the existing ScoreEvent domain constraints;
- tie value is limited to the existing bounded start/stop representation;
- no arbitrary metadata write.

Existing automatic/shadow field-patch code is not widened by these operations.

### 7.4 CHANGE_MEASURE_METER

Rules:

- target measure key must already exist;
- measure insertion/removal is out of scope;
- `before` and `after` contain the complete supported meter state: `beats`, `beatType`, `implicit`, `pickup`;
- measure key is immutable;
- `expectedQuarterBeats` is derived by the existing `createMeasure()` constructor, not supplied as independent authority.

A mathematically balanced measure after the edit is evidence of structural consistency only, never proof of musical correctness.

## 8. Explicit exclusions

CE-STRUCT-01 does not add:

- automatic missing-note/rest generation;
- automatic event insertion or deletion;
- automatic meter correction;
- arbitrary relation/metadata changes;
- measure insertion, deletion, reordering or renumbering;
- part insertion/removal;
- automatic pitch/onset authority expansion;
- beam, slur, ornament, tuplet-topology or cross-staff mutation;
- MusicXML serialization/write-back;
- Smoosic UI implementation;
- suspicious-measure coloring (SES-106 owns that);
- persistence, revision database, object storage or teacher-learning dataset;
- student delivery or approval;
- new Render service/domain;
- any E11A or readiness-policy expansion.

If an edit cannot be represented exactly by the admitted operation vocabulary, the lane returns unsupported/abstains.

## 9. Atomic immutable projection

Add a dedicated projection function conceptually equivalent to:

```text
projectTeacherStructuralPatchSet(scoreGraph, patchSet)
```

Required behavior:

1. verify source identity;
2. verify exact base graph fingerprint;
3. verify teacher-edit authorization;
4. validate all patch shapes;
5. apply patches in declared order to private working copies;
6. validate every exact `before` value/snapshot;
7. rebuild changed events/measures through existing constructors;
8. build a new `ScoreGraph`;
9. preserve the original graph by identity and content;
10. return a deterministic audit record.

Projection is **atomic**. If any patch is stale, ambiguous, unsupported or invalid, the operation returns the exact source graph and no partial corrected graph is authoritative.

The source `sourceId` is preserved.

## 10. Reversibility

Every admitted structural operation has a deterministic inverse.

- `INSERT_EVENT` ↔ `REMOVE_EVENT`
- `REMOVE_EVENT` ↔ `INSERT_EVENT`
- field change ↔ same field change with before/after swapped
- meter change ↔ meter change with before/after swapped

Reversion applies inverse patches in reverse order.

A structural patch set is not eligible for a teacher-corrected revision unless reverting the projected graph reproduces the exact base ScoreGraph content.

Undo in SesliTab remains a host workflow, but the correction engine supplies the deterministic inverse/revert contract.

## 11. Independent structural revalidation

The current `revalidateProjectedRevisionV2()` intentionally treats event-count and measure changes as failures. CE-STRUCT-01 therefore adds a separate structural revalidator rather than weakening that existing validator.

Conceptual entrypoint:

```text
revalidateTeacherStructuralRevision({
  sourceGraph,
  projectedGraph,
  patchSet
})
```

The revalidator must independently verify:

- source identity unchanged;
- measure count, order and keys unchanged;
- only explicitly authorized meter fields changed;
- event insertions exactly equal declared `INSERT_EVENT` patches;
- event removals exactly equal declared `REMOVE_EVENT` patches;
- existing event fields changed only where an explicit structural patch permits them;
- inserted event payloads equal the declared teacher payload;
- no undeclared event or metadata mutation occurred;
- existing deterministic validators are rerun on the projected graph where applicable;
- no new deterministic structural finding is introduced silently;
- reverse application reproduces the exact source graph.

The revalidator must not call the candidate resolver or reuse automatic correction decisions.

## 12. Revalidation result semantics

Structural revalidation answers **integrity**, not musical truth.

The result may expose:

```text
integrityDecision: PASS | FAIL
newFindings: [...]
residualFindings: [...]
resolvedFindings: [...]
reversibilityVerified: boolean
sourceMutationDetected: boolean
```

A `PASS` means:

- the teacher's declared edit was represented exactly;
- no undeclared structural mutation occurred;
- deterministic revalidation found no newly introduced blocking integrity failure;
- exact reversal is proven.

A `PASS` does **not** mean the score is musically correct.

Pre-existing unrelated findings may remain as `residualFindings`; they must not be hidden. This allows a teacher to correct one issue at a time without pretending all other issues disappeared.

Any patch-integrity failure, stale revision, undeclared mutation, failed reversal, or newly introduced blocking structural violation produces `FAIL`.

## 13. Finding comparison rule

To distinguish new findings from pre-existing findings, the structural revalidator runs the same admitted deterministic checks on both source and projected graphs and compares normalized finding identities.

The comparison must be deterministic and must not treat changed error text/order as semantic difference.

No finding is auto-resolved merely because measure duration arithmetic now balances.

## 14. Host/SesliTab integration boundary

CE-STRUCT-01 adds a read-only adapter packet for SesliTab/Smoosic.

The host provides:

- exact base ScoreGraph;
- explicit teacher edit action(s);
- teacher-edit authorization record;
- any existing validator findings needed for review context.

The correction engine returns:

- source graph;
- patch set;
- projection result;
- audit;
- structural revalidation result;
- whether the result is eligible to materialize as a `teacher_corrected` revision.

The adapter must expose hard authority flags:

```text
mode = "TEACHER_AUTHORIZED_STRUCTURAL_EDIT"
automaticApplyAuthority = false
finalTeacherApproval = false
studentShareEligible = false
musicXmlWriteBackAuthority = false
learningAuthority = false
```

The engine does not set `teacher_approved`.

## 15. Smoosic boundary

Smoosic remains presentation/editor infrastructure, not semantic authority.

For this milestone:

- an exact teacher action log/payload may be translated into structural patches;
- arbitrary edited MusicXML is not diffed heuristically to infer teacher intent;
- if exact teacher action provenance is unavailable, the correction engine abstains rather than reconstructing intent from a final score.

This prevents an editor export from silently becoming trusted teacher provenance.

## 16. Relationship to CE-UX-01 / SES-106

SES-106 highlights suspicious measures in the editor.

CE-STRUCT-01 begins after a teacher acts on that suspicious region.

```text
OMR / MusicXML
  -> Correction Engine findings
  -> SES-106 measure highlight
  -> teacher edits in editor
  -> explicit teacher action payload
  -> CE-STRUCT-01 reversible structural patch set
  -> projection + independent revalidation
  -> teacher-corrected revision candidate
  -> separate final teacher approval
```

Neither package grants automatic correction authority.

## 17. Source and revision safety

Every structural patch set is bound to an exact base graph fingerprint.

Fail closed when:

- `sourceId` is missing or mismatched;
- base graph fingerprint differs;
- target measure/event no longer exists;
- `before` snapshot does not match;
- insertion event id already exists;
- target measure for insertion does not exist;
- operation order creates an ambiguous/stale target;
- the host replays a patch set against a newer revision;
- authorization record is missing or invalid.

No nearest-match, pitch-based, measure-number-only, or heuristic target fallback is allowed.

## 18. Audit requirements

The audit record is deterministic and contains only structural facts required to explain the change:

- patch-set id;
- authorization action id;
- base source id/fingerprint;
- operation;
- measure key;
- event id where applicable;
- exact before/after values;
- operation order;
- projection result;
- revalidation decision.

The correction engine does not create personal identity, authentication claims, or student data.

## 19. Test strategy

Implementation must use RED → GREEN → refactor while green.

Minimum required tests:

1. patch set without explicit teacher-edit authorization is rejected;
2. patch set is bound to exact source identity and fingerprint;
3. insert note works only with complete explicit event payload;
4. insert rest works only with complete explicit event payload;
5. duplicate inserted event id fails closed;
6. unknown insert measure fails closed;
7. remove note/rest requires exact full `before` snapshot;
8. stale removal fails closed;
9. teacher duration change is reversible;
10. teacher voice change is reversible;
11. teacher staff change is reversible;
12. teacher tie change is reversible;
13. teacher meter change is reversible;
14. mixed patch set is atomic;
15. any failing patch leaves source authoritative;
16. source graph remains unchanged;
17. projected graph has same `sourceId`;
18. revalidator accepts only declared diff footprint;
19. undeclared event field mutation fails;
20. undeclared event insertion/removal fails;
21. undeclared meter mutation fails;
22. failed revert fails revalidation;
23. new blocking structural finding fails revalidation;
24. pre-existing unrelated findings remain visible as residual findings;
25. measure arithmetic alone never creates musical-correctness/approval authority;
26. host adapter marks automatic authority false;
27. host adapter marks final teacher approval false;
28. host adapter marks student sharing false;
29. existing E11A policy remains exactly one `CHANGE_VOICE` automatic slice;
30. existing `projectCorrectionPatches()` behavior remains unchanged;
31. existing full test suite passes;
32. `npm run check` passes.

## 20. Guardrails whole-diff focus

Before any merge decision, independent review must verify:

- `src/correction/controlledAutoCorrection.js` unchanged unless only a test references it;
- E11A policy unchanged;
- resolver/candidate authority unchanged;
- REAL_OMR readiness unchanged;
- no automatic path imports the teacher structural projector;
- no teacher structural operation was added to `PATCH_OPERATION`;
- source MusicXML/write-back code was not added;
- no new dependency;
- no Render/deployment/config change;
- no persistence/auth/student-delivery expansion;
- no heuristic inference of missing music;
- atomicity and exact rollback proven;
- teacher-edit authorization is not conflated with final teacher approval.

Critical or Important review findings require test-first correction before qualification.

## 21. Documentation and product truth

After implementation, README/architecture/current-status documents may state only:

> The engine can safely represent explicit teacher-authored structural edits as reversible, independently revalidated ScoreGraph revisions without mutating source data.

They must not state:

- automatic structural correction is enabled;
- missing notes/rests are inferred automatically;
- a revalidation PASS proves musical correctness;
- teacher-corrected equals teacher-approved;
- student delivery is authorized.

## 22. Deployment boundary

CE-STRUCT-01 adds no:

- Render service/domain;
- backend endpoint;
- database/object storage;
- authentication provider;
- Python/Partitura runtime;
- OMR/Audiveris modification;
- browser/editor UI;
- MusicXML serializer;
- production deployment.

Merge and deploy remain separate explicit human approval gates.

## 23. Acceptance criteria

The architecture is accepted when:

- teacher intent is explicit, never inferred;
- structural topology operations are isolated from automatic `PATCH_OPERATION`;
- missing/extra note/rest edits are explicit and reversible;
- duration/voice/staff/tie/meter teacher edits are exact and reversible;
- source graph and MusicXML remain immutable;
- patch sets are exact-revision-bound and atomic;
- independent structural revalidation checks the actual diff footprint;
- exact revert proves rollback;
- revalidation PASS is explicitly not musical correctness;
- teacher edit authorization is explicitly not final teacher approval;
- host adapter cannot grant automatic apply, final approval, student sharing or learning authority;
- E11A remains unchanged;
- no persistence/deployment scope is added.

## 24. Next gate

This written specification must be reviewed and explicitly approved by the user.

Only after written-spec approval may a Superpowers implementation plan be written.

No production code, test code, merge, or deploy is authorized by this specification alone.
