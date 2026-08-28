# E11 Readiness Report

## Authorization status

**E11 — Controlled Automatic Correction is NOT STARTED and is NOT AUTHORIZED.**

This report is a decision checkpoint after E10I. It does not enable automatic correction, production MusicXML overwrite, or quality-gate bypass.

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
- blocked / unsupported in this controlled set: 0;
- controlled coverage: 0.50;
- precision among resolved cases: 1.00;
- ambiguity / abstention rate: 0.50.

These metrics describe the controlled benchmark only. They are not an estimate of general OMR accuracy or production false-positive rate.

## False-positive analysis

Observed controlled false-positive count: **0**.

The strongest safety signal is the matched guard behavior: all 16 partial-evidence cases remain `AMBIGUOUS` rather than crossing the unchanged 0.90 confidence threshold. The system therefore preserved fail-closed behavior when a required evidence component was intentionally removed.

This does not prove a zero false-positive rate on unseen scores. The current evidence base is still bounded and teacher-approved rather than population-scale.

## Correction classes with current evidence

The controlled benchmark currently provides the strongest evidence for **voice-assignment proposals** when multiple independent signals agree, including combinations of:

- validator suspicion;
- source-consistent stem direction;
- beam grouping;
- same-staff temporal voice continuity;
- absence of hard temporal conflicts;
- instrument-profile constraints.

Even this class is only a candidate for a future narrowly gated E11 design. It is not yet authorized for automatic production application.

## Classes that still require REVIEW / additional evidence

The current benchmark does not justify broad automatic correction for:

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
- any proposal below threshold or without independent evidence classes.

Webern demonstrates a specific guardrail: a valid irregular opening measure must remain valid source structure rather than being normalized simply because it does not fill the nominal meter.

Tárrega and Dowland demonstrate another guardrail: guitar fingering/string information and physical fret/string choice are not OMR voice-authority signals and must not be conflated with the separate Guitar TAB physical solver.

## E11 decision boundary

Current evidence supports considering, at most, a **narrowly scoped voice-assignment-only controlled-correction design** in a future E11 stage, with revalidation and host quality gate remaining mandatory.

Before implementation, explicit user approval is still required for E11. Any approved E11 design must preserve:

- `minConfidence = 0.90` unless future benchmark evidence separately justifies a change;
- independent evidence requirements;
- immutable raw source;
- reversible patches;
- post-correction revalidation;
- `ACCEPT / REVIEW / BLOCK` quality gate;
- no Audiveris runtime mutation;
- no SesliTab quality-gate bypass;
- no silent invention of musical information.

## Conclusion

E10I provides a stronger and more diverse controlled evidence base, but it does **not** justify broad automatic correction. E11 remains closed pending separate explicit authorization.
