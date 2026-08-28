# CE-EVIDENCE-03 — Calibration / Final-Evaluation Split Guard

Status: scientific evidence infrastructure only.

## Purpose

Confidence calibration and final evaluation must not reuse the same events or the same source score bytes. Reusing events from one source across both partitions would create optimistic evidence and could make readiness decisions unreliable.

## Fail-closed rules

`createRealOmrEvidenceSplit` rejects:

- duplicate event IDs inside either partition;
- any event ID appearing in both calibration and final evaluation;
- any exact source SHA-256 appearing in both partitions;
- records without pinned source revision, teacher approval and engine-version provenance.

The split unit is therefore stricter than event identity: different events from the same exact source bytes cannot be divided across calibration and final evaluation.

## Reporting

`summarizeRealOmrEvidenceSplit` reports composition only:

- calibration/final-evaluation event counts;
- source counts;
- error-class counts;
- engine counts.

It intentionally does not define a minimum sample count, target precision, confidence threshold or production-readiness rule. Those policies must be derived later from a sufficiently large, teacher-reviewed REAL_OMR corpus and explicit governance approval.

## Safety boundaries

- controlled mutations remain outside REAL_OMR evidence;
- synthetic examples remain outside REAL_OMR evidence;
- no teacher decision is generated;
- no threshold is updated;
- no production correction class is promoted;
- no automatic training feedback loop is created.

## Evidence bottleneck after this stage

The repository now has contracts for REAL_OMR observation intake, explicit teacher annotation, calibration eligibility and leakage-free splitting. The remaining limiting resource is not another correction heuristic: it is actual provenance-pinned OMR outputs plus event-level teacher decisions.
