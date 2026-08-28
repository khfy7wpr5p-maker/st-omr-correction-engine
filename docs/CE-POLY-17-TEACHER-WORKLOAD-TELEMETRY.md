# CE-POLY-17 — Teacher Workload Telemetry Contract

Status: METRICS CONTRACT

This stage exposes downstream-reportable teacher workload metrics without making the Correction Engine a review UI.

Metrics include:

- teacherAcceptedCorrections
- teacherRejectedCorrections
- teacherOverrideRate
- correctionCandidatesPerPage
- falseCorrectionsPerPage
- manualEditsSaved
- reviewSecondsPerPage

The contract stores aggregate counts and durations only. It does not identify teachers, change teacher decisions, or grant correction authority. Zero-denominator rates remain defined as zero, and aggregation recomputes rates from summed counts rather than averaging percentages.
