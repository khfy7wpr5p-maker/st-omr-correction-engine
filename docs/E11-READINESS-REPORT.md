# E11 Readiness and Authorization Record

## Authorization status

E11 was explicitly authorized by the user on 2026-08-28 after the E10I readiness checkpoint.

The authorization was implemented conservatively as **E11A — a narrowly scoped voice-assignment-only controlled automatic correction gate**. E11A is completed and verified. This does not authorize broad automatic correction, production MusicXML overwrite, or quality-gate bypass.

## Teacher-approved real-source evidence

- total gold-eligible teacher-approved sources: 6;
- piano: 3;
- classical guitar: 3;
- review scope: bounded excerpts only, generally measures 1–8 and the recorded staff scope;
- source licenses: pinned CC0 corpus with recorded provenance.

Sources:

1. Satie — *Je te veux*;
2. Sor — Op. 35 No. 13;
3. Paradis — *An das Klavier*;
4. Webern — Op. 4 No. 4 *So ich traurig bin*;
5. Tárrega — *Lágrima*;
6. Dowland — *Fantasia Number 7*.

## Controlled benchmark evidence

- total cases: 32;
- piano: 16;
- classical guitar: 16;
- high-evidence cases: 16;
- guard / partial-evidence cases: 16;
- correctly resolved: 16;
- incorrect resolved: 0;
- ambiguous: 16;
- controlled coverage: 0.50;
- precision among resolved cases: 1.00;
- ambiguity / abstention rate: 0.50.

These metrics describe the controlled benchmark only. They are not an estimate of general OMR accuracy or production false-positive rate.

## E11A implemented gate

The automatic in-memory apply path accepts only a correction satisfying every condition below:

- resolver result is `RESOLVED`;
- result confidence is at least `0.90`;
- at least two independent evidence sources are retained;
- exactly one patch is proposed;
- operation is `CHANGE_VOICE`;
- patch confidence is at least `0.90`;
- patch itself retains at least two independent evidence sources;
- immutable projection succeeds;
- post-correction revalidation is present and succeeds;
- host quality gate explicitly returns `ACCEPT`.

`REVIEW` or `BLOCK` keeps the exact original source graph selected. Projection failure, missing revalidation, invalid revalidation, or a revalidation exception fails closed to `BLOCK`.

E11A has no raw MusicXML write path and does not modify the Audiveris or SesliTab production runtime.

## Controlled E11A verification

- 16 / 16 high-evidence teacher-approved cases became eligible only after explicit `ACCEPT` revalidation;
- 16 / 16 guard cases remained unapplied and did not call the revalidation apply path;
- incorrect controlled automatic applications: 0;
- non-voice automatic mutation remains rejected;
- missing or failed revalidation is blocked;
- `minConfidence = 0.90` remains unchanged.

Technical verification:

- issue: #27 — completed;
- implementation PR: #29 — squash merged;
- implementation head: `2734fb9f2b1600b315346b1b929ed826fa4d370d`;
- exact-head `test-and-build`: run #47 (`33164669931`) — SUCCESS;
- verified implementation main: `0e0e70b7d70bd6b527b0d2b3357ad5ba48a151d5`;
- exact-main `test-and-build`: run #48 (`33164701779`) — SUCCESS.

## Correction classes still requiring REVIEW / additional evidence

E11A does not justify or authorize automatic correction for:

- duration changes;
- onset changes;
- tie creation/removal;
- tuplet creation/removal or ratio changes;
- beam mutation as a semantic correction target;
- staff reassignment and cross-staff hand inference;
- relation/arpeggio/glissando mutation;
- pickup or irregular-measure normalization;
- voice-3/voice-4 assignment where no independently supported prior exists;
- guitar fingering or string-number interpretation;
- pitch correction not backed by a dedicated evidence model;
- multiple-patch automatic transactions;
- any proposal below threshold or without independent evidence classes.

Webern remains a specific guardrail: a valid irregular opening measure must remain valid source structure rather than being normalized simply because it does not fill the nominal meter.

Tárrega and Dowland remain another guardrail: guitar fingering/string information and physical fret/string choice are not OMR voice-authority signals and must not be conflated with the separate Guitar TAB physical solver.

## Current decision boundary

E11A is complete. Expansion beyond the verified voice-only gate requires a new bounded evidence/design decision before implementation. The following invariants remain mandatory:

- `minConfidence = 0.90` unless future benchmark evidence separately justifies a change;
- independent evidence requirements;
- immutable raw source;
- reversible patches;
- post-correction revalidation;
- `ACCEPT / REVIEW / BLOCK` quality gate;
- no Audiveris runtime mutation;
- no SesliTab quality-gate bypass;
- no silent invention of musical information.

E12 visual second-opinion AI remains not started and is a separate approval boundary.
