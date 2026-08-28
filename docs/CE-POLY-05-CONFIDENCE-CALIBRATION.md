# CE-POLY-05 — Confidence Calibration Research Harness

This stage adds evaluation diagnostics only. Existing confidence values are not declared probabilities and the production `0.90` resolver threshold is unchanged.

Implemented diagnostics:

- reliability-bin data suitable for reliability diagrams;
- Brier score;
- expected calibration error (ECE);
- before/after evaluation for explicitly supplied research transforms.

Research transform labels include isotonic regression, Platt scaling, temperature scaling and conformal methods. The engine intentionally does not fit or deploy a calibrator in production at this stage. Fitting requires a sufficiently large, held-out teacher-gold corpus and leakage-safe train/calibration/test separation.

Selective-prediction risk/coverage evaluation is provided separately by CE-POLY-04.

Any future change to production confidence policy remains a separate explicit approval boundary.
