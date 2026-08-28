# CE-EVIDENCE-02 — Real OMR Annotation Queue

Status: evidence preparation only. Teacher authority remains explicit.

## Purpose

The existing `teacherReviewPacket` operates at reference-source/excerpt level. This stage adds a separate event-level queue for real OMR observations so evidence can be prepared for teacher review without pre-filling a musical answer.

## Pending observation contract

A pending observation records only observed/reproducible context:

- source, revision and exact source SHA-256;
- OMR engine and engine version;
- page/system/measure/staff/voice location;
- suspected taxonomy class;
- original OMR value;
- optional correction candidate and its reported confidence;
- evidence references and optional visual/source-quality/polyphony metadata.

A pending observation deliberately contains no `teacherDecision` and no `teacherGoldValue`.

## Deterministic batching

`buildRealOmrAnnotationBatch` sorts observations deterministically by source and musical location, checks duplicate observation identities, and supports a bounded review batch size. Batching creates zero teacher decisions.

## Teacher annotation boundary

`annotateRealOmrObservation` requires all teacher-owned fields explicitly:

- teacher approval/decision identity;
- teacher decision;
- teacher gold value, including explicit `null` when ambiguity is the decision;
- correction-needed judgment;
- correction-safe judgment;
- evidence-available judgment.

No defaults are supplied for those fields. The function then creates a provenance-bearing `REAL_OMR` teacher-gold event.

An `AMBIGUOUS` teacher decision remains valid review evidence but CE-EVIDENCE-01 excludes it from confidence calibration.

## Safety boundaries

- no automated teacher decision;
- no candidate-as-truth behavior;
- no gold-count inflation;
- no production correction expansion;
- no training feedback loop;
- no automatic threshold update.

The next safe step is evidence split/leakage control so reviewed real OMR events cannot be reused across calibration and final evaluation by accident.
