# CE-STRUCT Browser Runtime Prerequisite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a bounded, pinned, browser-consumable CE-STRUCT runtime artifact from `st-omr-correction-engine` without widening automatic correction authority, adding a service, or duplicating Correction Engine logic inside SesliTab.

**Architecture:** Keep the existing CE-STRUCT implementation authoritative. Add a browser-only build seam that aliases only `node:crypto` to a synchronous SHA-256 compatibility shim, bundles the existing CE-STRUCT modules into one IIFE artifact, emits a signed-by-content manifest, and proves parity against the Node implementation. SesliTab will consume this artifact later from an exact engine commit; this plan does not modify SesliTab.

**Tech Stack:** Node.js 20 CI, ESM, node:test, esbuild 0.28.2, @noble/hashes 2.4.0 (build/runtime-bundle input only; bundled output has zero external imports).

**Spec:** `khfy7wpr5p-maker/seslitab-guitar-reader@8fafbbe274b4a4c955d811f4286a9280d974b0c9:docs/superpowers/specs/2026-09-29-ce-bridge-01-smoosic-structural-revalidation-design.md`

## Global Constraints

- Exact planning baseline: `st-omr-correction-engine/main@c11d35b35321c5d7761e7033ce4ce1d91cbeb1c2`.
- Preserve `TeacherStructuralPatchSetV1`, existing CE-STRUCT operation vocabulary, projection, revalidation, reversibility, and authority semantics.
- Do not modify E11A, resolver/candidate/readiness policy, automatic correction authority, OMR providers, persistence, authentication, student delivery, Render, domains, or deployment.
- Browser contract: `ST_OMR_CORRECTION_ENGINE_CE_STRUCT_BROWSER`.
- Contract version and runtime version: `1.0.0`.
- Artifact: `ce-struct-browser-runtime.js`.
- Manifest: `ce-struct-browser-runtime.manifest.json`.
- Global: `STOmrCorrectionCeStructRuntime`.
- Bundle target: browser / ES2022 / IIFE / minified / no sourcemap.
- `externalImports = 0`.
- `networkCapable = false`, `persistenceCapable = false`, `authenticationAuthority = false`, `automaticApplyAuthority = false`, `finalTeacherApprovalAuthority = false`, `studentShareAuthority = false`, `learningAuthority = false`, `musicXmlWriteBackAuthority = false`.
- The browser artifact may expose only the bounded CE-STRUCT construction + processing surface named in Task 2.
- No generated browser artifact is treated as source of truth; source modules remain authoritative.
- This prerequisite must qualify and merge separately before any SesliTab runtime pin is implemented.
- Merge and deploy remain separate explicit human gates.

## Review Focus

1. Unicode / object-key-order fingerprint inputs must produce the exact same lowercase SHA-256 as Node `fingerprintScoreGraph()`.
2. A malformed or capability-bearing manifest/bundle must fail the build, not degrade to a warning.
3. Browser and Node behavior must remain identical for insert/remove `eventIndex`, mixed structural patch order, stale fingerprint, and rollback.
4. The bundle must not accidentally pull automatic correction, provider, filesystem, process, network, or persistence code into the exported surface.
5. Authority flags must remain false even when projection and revalidation PASS.

---

### Task 1: Add a browser-only SHA-256 compatibility seam

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `browser/nodeCryptoSha256Shim.js`
- Create: `tests/ceStructBrowserHashParity.test.js`

**Interfaces:**
- Consumes: the exact `createHash('sha256').update(value).digest('hex')` usage in `src/contracts/teacherStructuralPatch.js`.
- Produces: a browser-build-only `createHash` compatibility export. Production Node source continues to import `node:crypto` unchanged.

- [ ] **Step 1: Write failing SHA-256 parity tests**

Test:
- the shim rejects algorithms other than `sha256`;
- `createHash('sha256').update('abc').digest('hex')` equals Node SHA-256;
- UTF-8 text including Turkish characters produces the same digest;
- a canonical ScoreGraph JSON string produces the same digest as Node;
- only `digest('hex')` is admitted.

Run: `node --test tests/ceStructBrowserHashParity.test.js`  
Expected: FAIL because `browser/nodeCryptoSha256Shim.js` does not exist.

- [ ] **Step 2: Add exact build dependencies**

Add exact devDependencies:
- `esbuild: "0.28.2"`
- `@noble/hashes: "2.4.0"`

Update `package-lock.json` with exact versions. Do not add production dependencies.

- [ ] **Step 3: Implement the minimal shim**

Create `browser/nodeCryptoSha256Shim.js` with:
- `createHash(algorithm)`;
- only `algorithm === 'sha256'`;
- `update(string | Uint8Array)` returning the same hasher object;
- `digest('hex')` returning lowercase hex;
- no random, network, storage, filesystem, process, or other crypto surface.

Use `@noble/hashes/sha2.js` and `@noble/hashes/utils.js`; do not implement a second handwritten hash algorithm.

- [ ] **Step 4: Run focused parity tests**

Run: `node --test tests/ceStructBrowserHashParity.test.js`  
Expected: PASS.

- [ ] **Step 5: Run the existing CE-STRUCT contract tests**

Run: `node --test tests/teacherStructuralPatchContract.test.js tests/teacherStructuralProjection.test.js tests/teacherStructuralRevalidation.test.js tests/teacherStructuralReverter.test.js`  
Expected: PASS; Node behavior remains unchanged.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json browser/nodeCryptoSha256Shim.js tests/ceStructBrowserHashParity.test.js
git commit -m "build: add CE-STRUCT browser sha256 seam"
```

### Task 2: Define the bounded browser runtime surface

**Files:**
- Create: `browser/ceStructBrowserEntry.js`
- Create: `tests/ceStructBrowserSurface.test.js`

**Interfaces:**
- Consumes:
  - `createMeasure`
  - `createScoreEvent`
  - `createScoreGraph`
  - `fingerprintScoreGraph`
  - `createTeacherEditAuthorization`
  - `createTeacherStructuralPatch`
  - `createTeacherStructuralPatchSet`
  - `processSesliTabTeacherStructuralEdit`
- Produces: global `STOmrCorrectionCeStructRuntime` with exactly those functions plus immutable metadata `contract`, `contractVersion`, `runtimeVersion`, and `patchSchemaVersion`.

- [ ] **Step 1: Write failing surface tests**

Assert:
- the entry exposes exactly the approved bounded functions and metadata;
- it does not expose controlled auto-correction, resolver, candidate, provider, persistence, approval, sharing, or MusicXML write-back functions;
- metadata values are `ST_OMR_CORRECTION_ENGINE_CE_STRUCT_BROWSER`, `1.0.0`, `1.0.0`, and `teacher-structural-patch-set-v1`.

Run: `node --test tests/ceStructBrowserSurface.test.js`  
Expected: FAIL because the entry does not exist.

- [ ] **Step 2: Implement the minimal entry**

Create `browser/ceStructBrowserEntry.js`. Import only the approved CE-STRUCT constructors/contracts and `adapters/seslitab/teacherStructuralEditAdapter.js`. Freeze the exported surface.

Do not import `src/index.js`; that would broaden the reachable graph.

- [ ] **Step 3: Run focused surface tests**

Run: `node --test tests/ceStructBrowserSurface.test.js`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add browser/ceStructBrowserEntry.js tests/ceStructBrowserSurface.test.js
git commit -m "feat: expose bounded CE-STRUCT browser surface"
```

### Task 3: Build the artifact and provenance manifest

**Files:**
- Create: `scripts/buildCeStructBrowserRuntime.mjs`
- Modify: `package.json`
- Create: `tests/ceStructBrowserBuild.test.js`
- Generated during build only: `dist/browser/ce-struct-browser-runtime.js`
- Generated during build only: `dist/browser/ce-struct-browser-runtime.manifest.json`

**Interfaces:**
- Consumes: `browser/ceStructBrowserEntry.js`, the Task 1 `node:crypto` alias shim, exact git HEAD.
- Produces: verified IIFE artifact + manifest for later SesliTab pinning.

- [ ] **Step 1: Write failing build-contract tests**

Assert the build result/manifest requires:
- exact contract/version/runtime/global/artifact fields;
- `engineSourceRevision` as lowercase 40-hex exact HEAD;
- `externalImports === 0`;
- `bytes > 0` and valid lowercase SHA-256 digest;
- every forbidden authority/capability flag is exactly false;
- bundler provenance `esbuild 0.28.2`;
- hash provider provenance `@noble/hashes 2.4.0`.

Also assert the bundle contains no forbidden tokens:
`node:`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, `fetch(`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `process.env`, `node:fs`.

Run: `node --test tests/ceStructBrowserBuild.test.js`  
Expected: FAIL because the builder does not exist.

- [ ] **Step 2: Implement `buildCeStructBrowserRuntime()`**

In `scripts/buildCeStructBrowserRuntime.mjs`:
- clean/create `dist/browser`;
- resolve exact HEAD with `git rev-parse HEAD`;
- bundle `browser/ceStructBrowserEntry.js` with esbuild;
- alias only `node:crypto` to `browser/nodeCryptoSha256Shim.js`;
- use `platform: 'browser'`, `target: ['es2022']`, `format: 'iife'`, global `STOmrCorrectionCeStructRuntime`, minified, no sourcemap, metafile enabled;
- reject any external import;
- scan the final bundle for forbidden capability tokens;
- compute artifact bytes + SHA-256 with Node `createHash`;
- write the exact manifest required by Global Constraints;
- return a frozen build summary.

- [ ] **Step 3: Wire the package script**

Add:
`"build:ce-struct-browser": "node scripts/buildCeStructBrowserRuntime.mjs"`

Do not change existing production runtime behavior.

- [ ] **Step 4: Run focused build tests and inspect manifest**

Run:
`npm run build:ce-struct-browser && node --test tests/ceStructBrowserBuild.test.js`

Expected:
- PASS;
- `dist/browser/ce-struct-browser-runtime.js` exists;
- manifest source revision equals the current branch HEAD;
- no external imports.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/buildCeStructBrowserRuntime.mjs tests/ceStructBrowserBuild.test.js
git commit -m "build: emit pinned CE-STRUCT browser runtime"
```

### Task 4: Prove Node/browser CE-STRUCT semantic parity

**Files:**
- Create: `tests/ceStructBrowserRuntimeParity.test.js`
- Reuse: existing CE-STRUCT tests/fixtures; do not fork the core algorithms.

**Interfaces:**
- Consumes: generated IIFE runtime and the existing Node CE-STRUCT exports.
- Produces: direct behavioral parity evidence over the full admitted structural operation vocabulary.

- [ ] **Step 1: Write parity harness tests**

Load the built IIFE in an isolated `node:vm` browser-like context and compare Node vs browser results for:
- `fingerprintScoreGraph`;
- authorization and patch-set construction;
- INSERT_EVENT at beginning/middle/end;
- REMOVE_EVENT with exact `eventIndex`;
- duration, voice, staff, tie, and meter changes;
- mixed ordered patch set;
- stale base fingerprint;
- stale `before`;
- unsupported operation;
- projection failure;
- revalidation PASS;
- revalidation FAIL on undeclared mutation;
- exact revert / event-order restoration;
- residual/resolved/new finding classification;
- all hard authority flags false.

Run: `npm run build:ce-struct-browser && node --test tests/ceStructBrowserRuntimeParity.test.js`  
Expected initially: FAIL on any missing parity behavior.

- [ ] **Step 2: Make only build-seam fixes needed for parity**

Fix the browser shim/entry/build configuration only. Do not fork or rewrite CE-STRUCT projection/revalidation behavior in browser-specific source.

- [ ] **Step 3: Run the full browser-runtime test slice**

Run:
```bash
npm run build:ce-struct-browser
node --test   tests/ceStructBrowserHashParity.test.js   tests/ceStructBrowserSurface.test.js   tests/ceStructBrowserBuild.test.js   tests/ceStructBrowserRuntimeParity.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add browser scripts tests package.json package-lock.json
git commit -m "test: prove CE-STRUCT browser runtime parity"
```

### Task 5: Integrate qualification into normal CI and document the boundary

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/CURRENT_STATUS.md`
- Modify only if needed to execute the new build in CI: `.github/workflows/test-and-build.yml`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: repeatable CI evidence and truthful browser-runtime documentation.

- [ ] **Step 1: Add CI-facing scripts**

Set:
- `test` to build the CE-STRUCT browser runtime before `node --test`, or add an equivalent dedicated script invoked by `test-and-build.yml`;
- `check` to retain `node --check src/index.js` and additionally syntax-check `browser/ceStructBrowserEntry.js`, `browser/nodeCryptoSha256Shim.js`, and `scripts/buildCeStructBrowserRuntime.mjs`.

Do not remove any existing check.

- [ ] **Step 2: Update documentation narrowly**

Document only:
- a bounded CE-STRUCT browser artifact now exists;
- it is derived from the same structural contract;
- source revision + digest are manifest-bound;
- it has no automatic apply, approval, sharing, learning, persistence, network, or MusicXML write-back authority;
- it exists solely as a prerequisite for a later SesliTab pin;
- no deploy/service was added.

Do not claim SesliTab integration is complete.

- [ ] **Step 3: Run exact-head qualification**

Run:
```bash
npm install --ignore-scripts
npm run build:ce-struct-browser
npm test
npm run check
```

Expected:
- all existing tests plus new runtime tests PASS;
- generated manifest revision equals exact HEAD;
- zero external imports;
- no authority/capability violation.

- [ ] **Step 4: Run Codex Engineering Guardrails whole-diff verification**

Verify independently:
- no E11A / resolver / readiness / candidate policy change;
- no provider/OMR behavior change;
- no persistence/auth/student delivery;
- no Render/deploy/config change;
- browser surface is bounded;
- SHA-256 parity is direct and reproducible;
- generated manifest is exact-head-bound;
- no unrelated refactor.

Critical or Important finding must be repaired test-first before qualification.

- [ ] **Step 5: Commit final qualification/docs**

```bash
git add package.json package-lock.json README.md docs/ARCHITECTURE.md docs/CURRENT_STATUS.md .github/workflows/test-and-build.yml
git commit -m "docs: qualify CE-STRUCT browser runtime boundary"
```

## Final PR Gate

Before opening the implementation PR:
1. Re-read exact branch HEAD.
2. Run `npm test` and `npm run check`.
3. Confirm manifest `engineSourceRevision` equals exact branch HEAD used for qualification.
4. Confirm the PR contains no SesliTab code.
5. Confirm no Render/deploy action occurred.
6. Open a bounded PR against `st-omr-correction-engine/main`.
7. STOP before merge.

## Downstream Gate

The SesliTab CE-BRIDGE implementation plan is intentionally not finalized by this document.

It may be written only after:
- this runtime prerequisite is merged and its exact engine commit is known;
- SES-68 / PR #277 is merged;
- `seslitab-guitar-reader/main` is fresh-read again after that merge.

At that point the SesliTab plan must pin the exact runtime commit/digest and name the reconciled write-back files from the merged SES-68 state.
