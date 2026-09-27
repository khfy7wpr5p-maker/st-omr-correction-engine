# SEM-05 — OMR Correction Read-Only Semantic Consistency Architecture

Date: 2026-09-27  
Status: WRITTEN SPEC — USER REVIEW REQUIRED BEFORE IMPLEMENTATION PLAN  
Consumer: ST OMR Correction Engine  
Reference engine: ST Score Semantic Engine  
OMR baseline: `875717ebbb4bd07bab33082a809b7a12d1b6e9b7`  
Semantic Engine qualified head: `ffc997b242fa862e180e698385cc0afb52de47a1`

## 1. Purpose

Add a deterministic, read-only semantic consistency channel between ST OMR Correction Engine and ST Score Semantic Engine.

The purpose is to answer:

> Did the OMR ScoreGraph and the independent Partitura-based semantic interpretation of the exact same source MusicXML describe the same supported musical facts?

This is a consistency check, not a second source of musical truth.

The Semantic Engine output is derived from the same source MusicXML as the OMR ScoreGraph. Therefore it must **not** be treated as independent evidence capable of increasing candidate confidence, satisfying the resolver's independent-evidence-source threshold, promoting teacher-gold status, or widening automatic-correction authority.

## 2. Existing authority that remains unchanged

ST OMR Correction Engine remains authoritative for its existing contracts:

- `ScoreGraph` is the canonical correction-analysis graph inside this repository.
- Source MusicXML and OMR source artifacts remain immutable.
- Candidate generation and resolution remain bounded and fail closed.
- `AMBIGUOUS`, `UNSUPPORTED`, and `BLOCKED` remain valid safety outcomes.
- Correction patches remain reversible and auditable.
- Host-side revalidation remains mandatory where already required.
- REAL_OMR readiness and teacher-gold provenance rules remain unchanged.
- E11A remains the only authorized production automatic-correction slice: a narrowly gated single `CHANGE_VOICE` patch.

ST Score Semantic Engine remains an independent reference/validation engine.

Partitura remains a dependency of Semantic Engine only. Partitura and Python do not become OMR Correction Engine runtime dependencies.

## 3. Chosen architecture

Use a **host/artifact-provided, shadow-only semantic consistency bridge**.

The OMR repository does not execute Semantic Engine and does not call it over the network.

```text
exact source MusicXML bytes
       |
       +------------------------------+
       |                              |
       v                              v
existing OMR MusicXML path       ST Score Semantic Engine
       |                              |
       v                              v
     ScoreGraph                 SemanticSnapshot JSON
       |                        + provenance manifest
       |                              |
       +----------- compare ----------+
                    |
                    v
        SemanticConsistencyPacketV1
                    |
          +---------+---------+
          |                   |
          v                   v
   diagnostics/review     revalidation evidence
          |
          X  NOT candidate.evidence
          X  NOT resolver confidence
          X  NOT correction authority
```

The bridge accepts already-materialized semantic evidence plus provenance. It never starts Python, imports Partitura, or sends source data to a service.

## 4. Alternatives considered

### A. Feed Semantic Engine findings into `candidate.evidence` — rejected

The current resolver counts independent evidence classes using the `source` field, not evidence weight.

A semantic finding from the same MusicXML could therefore accidentally satisfy `minIndependentEvidenceSources` even at weight 0 if represented as a normal evidence object.

SEM-05 must not call `createEvidence()` for semantic-consistency findings and must never append them to `candidate.evidence`.

### B. Run Python/Partitura inside OMR Correction Engine — rejected

This creates a new runtime/deployment dependency and weakens repository boundaries without improving evidence independence.

### C. Call a Semantic Engine REST/network service — rejected

This creates availability, version-skew, authentication, privacy, deployment, and authority coupling. No service is required for the first consistency channel.

### D. Separate shadow-only consistency packet — selected

This keeps the two engines independent, deterministic, inspectable, and incapable of silently changing correction decisions.

## 5. Effective evidence weight and resolver isolation

SEM-05 semantic consistency has:

```text
effectiveWeight = 0
resolverEligible = false
candidateEvidenceEligible = false
automaticCorrectionAuthority = false
teacherGoldAuthority = false
readinessPromotionAuthority = false
```

These are hard architecture boundaries, not configuration defaults.

The implementation must use a separate contract such as `SemanticConsistencyPacketV1`. It must **not** reuse `createEvidence()` or expand `EVIDENCE_SOURCE`.

This avoids a subtle resolver bug: `resolveCandidates()` currently counts unique `evidence.source` values and does not exclude zero-weight evidence from the independent-source count.

## 6. Input contract

The bridge consumes three immutable inputs:

1. existing OMR `ScoreGraph`;
2. a validated Semantic Engine `st-semantic-snapshot-v1` JSON artifact;
3. a provenance manifest tying that snapshot to the exact source MusicXML.

The provenance manifest must contain at least:

```json
{
  "schemaVersion": "st-omr-semantic-consistency-provenance-v1",
  "sourceSha256": "<exact source MusicXML sha256>",
  "semanticEngineCommit": "ffc997b242fa862e180e698385cc0afb52de47a1",
  "semanticSnapshotSchema": "st-semantic-snapshot-v1",
  "partituraVersion": "1.9.0",
  "sourceId": "<stable host/source identity>",
  "divisionsPerQuarter": 4
}
```

The `sourceSha256` must identify the same MusicXML bytes from which the compared ScoreGraph was canonicalized.

A provenance mismatch is `UNSUPPORTED` / invalid input and can never produce PASS.

## 7. Source identity

The first implementation profile requires the OMR ScoreGraph to carry a source identity that can be linked to the provenance manifest.

Where the existing bounded MusicXML adapter is used, its returned SHA-256 is the preferred exact-byte provenance anchor.

The bridge must never infer that two artifacts belong to the same source from filename, title, measure count, or musical similarity.

## 8. First comparison profile

### Supported

- exactly one score part;
- normal pitched notes;
- two or more measures;
- one or more voices;
- one or more staves;
- fixed positive MusicXML divisions-per-quarter across the source;
- full non-implicit measures;
- pitch;
- measure membership;
- local onset within measure;
- duration;
- voice;
- staff;
- simple tie start/stop roles;
- measure count;
- time-signature/meter values already represented by ScoreGraph measures.

### Explicitly unsupported in the first tranche

- unpitched/percussion notes;
- grace notes;
- rests as semantic-note equality targets;
- cross-staff notation semantics;
- tuplets;
- beams;
- slurs;
- ornaments;
- non-controlling measures;
- pickup/implicit measures;
- mid-score divisions changes;
- transposing-instrument comparison requiring written/sounding conversion;
- arbitrary duplicate indistinguishable unison note coordinates;
- key-signature comparison;
- clef comparison;
- automatic correction derived from semantic findings.

Unsupported structures return `UNSUPPORTED`; they are never coerced into a match.

## 9. Why key signature and clef are excluded initially

Semantic Engine exposes explicit key-signature and clef contexts.

The current OMR `ScoreGraph` contract stores measure meter plus event-level timing, voice, staff, pitch and metadata, but it does not canonically represent key signature or clef.

SEM-05 must not invent new ScoreGraph fields merely to make the comparison richer.

A future separately approved ScoreGraph contract change may add those fields.

## 10. Structural matching rule

Raw cross-engine IDs are not equal authority.

OMR ScoreGraph event IDs may be generated by the canonicalization path, while Semantic Engine preserves source note IDs where available.

The first comparison therefore uses structural coordinates.

Initial pitched-note structural key:

```text
measure index
staff
voice
local onset
pitch MIDI
occurrence ordinal
```

The occurrence ordinal is a deterministic comparison tie-breaker only. It is not canonical event identity.

If two notes remain indistinguishable under the admitted structural profile, the result is `UNSUPPORTED`, not arbitrary ID-based pairing.

## 11. Timing normalization

The existing bounded MusicXML→ScoreGraph adapter stores:

```text
event.onset    = onsetDivisions / divisions
event.duration = durationDivisions / divisions
```

Those values are quarter-note beat units local to the measure.

Semantic Engine v1 exposes absolute `onset_div` and `duration_div`.

For the fixed-divisions profile, the bridge computes measure starts from semantic meter context and converts:

```text
semanticLocalOnsetQuarterBeats
  = (semantic.onset_div - semanticMeasureStartDiv) / divisionsPerQuarter

semanticDurationQuarterBeats
  = semantic.duration_div / divisionsPerQuarter
```

Comparison must avoid tolerant “close enough” matching where exact rational/integer conversion is available.

If the semantic measure-start timeline cannot be determined unambiguously, return `UNSUPPORTED`.

## 12. ScoreGraph event selection

The comparison includes pitched non-rest ScoreGraph events only.

A ScoreGraph event is eligible when:

- `isRest === false`;
- `pitch` is a valid supported MIDI integer;
- measure identity resolves to an ordered ScoreGraph measure;
- onset/duration are finite and non-negative;
- voice/staff are positive integers.

Rest events remain useful to existing OMR analysis but are not compared to SemanticSnapshot note rows in SEM-05 v1.

## 13. Tie-role comparison

ScoreGraph's bounded MusicXML adapter exposes source tie roles in event metadata:

- `metadata.tieStart`;
- `metadata.tieStop`.

Semantic Engine exposes:

- `tie_next != null` → start role;
- `tie_prev != null` → stop role.

SEM-05 compares only these boundary roles.

It does not compare raw tie endpoint IDs and does not generate `ADD_TIE` or `REMOVE_TIE` patches.

Ambiguous or unsupported tie topology returns `UNSUPPORTED`.

## 14. Meter comparison

For each ordered measure, compare:

- ScoreGraph `beats`;
- ScoreGraph `beatType`;

against the Semantic Engine time-signature context active at that measure start.

Inherited meter may be carried forward only when the semantic timeline provides an unambiguous active time signature.

No meter mismatch is allowed to trigger correction by itself.

## 15. Output contract

The first implementation may define:

```text
SemanticConsistencyStatusV1 =
  PASS
  MISMATCH
  UNSUPPORTED
```

and an immutable packet:

```text
SemanticConsistencyPacketV1
- mode: SHADOW_ONLY
- authority: SEMANTIC_CONSISTENCY_ONLY
- effectiveWeight: 0
- resolverEligible: false
- candidateEvidenceEligible: false
- automaticCorrectionAuthority: false
- teacherGoldAuthority: false
- readinessPromotionAuthority: false
- sourceGraph: exact original object
- provenance
- diagnostics
- invariants
```

The packet must expose no patch/apply/accept/corrected-score function.

## 16. Initial diagnostic vocabulary

At minimum:

- `SEMANTIC_SOURCE_MISMATCH`
- `SEMANTIC_PROFILE_UNSUPPORTED`
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
- `SEMANTIC_REFERENCE_DIAGNOSTIC`

Diagnostic ordering must be deterministic.

Semantic Engine's own non-PASS diagnostics must be preserved as reference diagnostics and must prevent the packet from being treated as an unconditional semantic PASS.

## 17. Interaction with correction candidates

SEM-05 diagnostics may be surfaced to:

- logs;
- benchmark analysis;
- teacher review;
- host review UI in a later integration;
- independent revalidation research.

SEM-05 diagnostics must not:

- be appended to candidate evidence;
- change candidate confidence;
- satisfy independent evidence-source count;
- change resolver thresholds;
- choose a candidate;
- produce a patch;
- promote a correction class;
- change E11A authorization.

If a future project wants semantic consistency to influence resolution, that requires separate teacher-gold calibration, independence analysis, resolver-contract redesign, and explicit architecture approval.

## 18. Interaction with E11A

E11A remains unchanged.

A semantic consistency PASS is not an additional acceptance criterion that grants authority.

A semantic consistency mismatch may be used only as a conservative shadow/revalidation warning in SEM-05.

SEM-05 cannot transform a result into an automatic correction, and it cannot widen E11A beyond the existing single `CHANGE_VOICE` slice.

## 19. Source immutability

Before comparison, fingerprint the source ScoreGraph deterministically.

After comparison, verify:

- same source graph content;
- same source identity;
- same event count/order/content;
- no source MusicXML write-back;
- no patch projection;
- no candidate mutation.

A source mutation is a hard invariant failure.

## 20. Repository ownership

The bridge belongs in **ST OMR Correction Engine** because it evaluates OMR ScoreGraph consistency.

Semantic Engine is consumed only through its public serialized snapshot contract and provenance.

No Semantic Engine source code is copied into OMR Correction Engine.

No Partitura source code is copied or forked.

## 21. Suggested implementation boundary

A later approved implementation plan may add a focused adapter such as:

```text
adapters/semantic/
  semanticConsistencyContract.js
  semanticConsistencyBridge.js
```

with tests under:

```text
tests/semanticConsistencyBridge.test.js
```

This is a design hint only; file creation is not authorized by this spec.

## 22. Reference fixture strategy

The first executable tranche should use repository-owned synthetic MusicXML fixtures or explicitly licensed/approved fixtures.

For each fixture:

1. source MusicXML bytes are fixed;
2. OMR ScoreGraph is produced through the existing bounded canonicalizer;
3. SemanticSnapshot JSON is produced by the pinned Semantic Engine;
4. provenance records exact source SHA and engine/dependency versions;
5. expected comparison results are independently specified.

Do not create expected results by serializing the bridge output under test.

## 23. Test strategy

Implementation must follow RED → GREEN → refactor while green.

Minimum evidence:

1. exact same source + matching ScoreGraph/SemanticSnapshot → `PASS`;
2. source SHA mismatch → `UNSUPPORTED`;
3. Semantic Engine commit/schema/Partitura provenance drift → `UNSUPPORTED`;
4. pitch mismatch detected;
5. onset mismatch detected;
6. duration mismatch detected;
7. voice mismatch detected;
8. staff mismatch detected;
9. tie-role mismatch detected;
10. meter mismatch detected;
11. ambiguous duplicate structural note → `UNSUPPORTED`;
12. excluded profile structure → `UNSUPPORTED`;
13. source ScoreGraph fingerprint unchanged;
14. no correction patches produced;
15. `resolverEligible === false`;
16. no `createEvidence()` object emitted;
17. passing the semantic packet near candidate/resolver code cannot alter the existing resolver result;
18. current full OMR test suite remains green.

## 24. Guardrails verification focus

Whole-branch verification must explicitly inspect:

- imports from `src/contracts/evidence.js` — semantic bridge must not call `createEvidence`;
- imports from resolver/candidate modules — bridge must not depend on them;
- patch projection/reverter imports — none allowed;
- E11A/production-readiness files — must remain unchanged;
- package dependencies — no Python/Partitura/network addition;
- source graph before/after fingerprint equality;
- exact provenance pinning;
- deterministic diagnostic ordering.

## 25. Deployment and product boundary

SEM-05 adds no:

- Render service;
- REST endpoint;
- domain;
- database;
- Python runtime;
- browser feature;
- provider modification;
- MusicXML serializer;
- production write-back;
- automatic correction;
- confidence-policy change.

The first tranche is shadow/reference infrastructure only.

## 26. Acceptance criteria

The architecture is accepted when:

- the same-source nature of Semantic Engine evidence is explicit;
- Semantic consistency can never count as independent resolver evidence;
- `createEvidence()` / `EVIDENCE_SOURCE` remain untouched;
- ScoreGraph remains the correction-analysis graph;
- source artifacts remain immutable;
- matching is structural, not raw-ID based;
- timing conversion is deterministic and bounded;
- unsupported cases fail closed;
- semantic diagnostics cannot produce patches;
- E11A and readiness policy remain unchanged;
- no runtime/deployment coupling exists.

## 27. Next gate

This written spec must be reviewed and explicitly approved by the user.

Only after written-spec approval may Superpowers `writing-plans` be invoked to create the implementation plan.

No implementation/test code is authorized by this document alone.
