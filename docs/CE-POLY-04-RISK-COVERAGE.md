# CE-POLY-04 — Selective Prediction / Risk-Coverage Metrics

The benchmark layer now supports threshold-sweep evaluation of candidate predictions without changing the production resolver threshold.

For each threshold it reports:

- coverage
- precision
- recall
- risk (`1 - precision`)
- abstention rate
- false correction rate
- false corrections per 1000 correction candidates

The report also computes a deterministic risk-coverage AUC over usable coverage points.

This stage is evaluation-only. It does not reinterpret confidence as calibrated probability and does not modify the existing `0.90` production policy.
