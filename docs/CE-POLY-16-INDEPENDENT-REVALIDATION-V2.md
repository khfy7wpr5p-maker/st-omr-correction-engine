# CE-POLY-16 — Independent Revalidation v2

Status: RESEARCH/VALIDATION UTILITY

This stage adds a validator that is intentionally separate from candidate scoring and the polyphonic voice solver.

Checks include:

- sourceId and measure structure remain unchanged;
- event count and event identities remain stable;
- only the field declared by each supported patch may change;
- patch after-values are actually present in the projected graph;
- independent same-voice overlap detection;
- onset, duration, tie and tuplet anomaly checks on the projected graph;
- full patch reversibility back to the original score graph.

Safety boundaries:

- the voice solver is not called by this validator;
- E11A production correction policy is not modified;
- PASS does not by itself authorize automatic correction;
- unsupported patch operations fail validation rather than being guessed;
- the original source graph is never mutated.
