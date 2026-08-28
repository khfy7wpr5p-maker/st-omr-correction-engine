# Correction Contract

## Input

The core accepts structured score data, validator findings, an instrument-profile identifier and optional source identity. Raw provider execution is outside this contract.

## Output

The core returns one of:

- `NO_CHANGE`
- `RESOLVED`
- `AMBIGUOUS`
- `UNSUPPORTED`
- `BLOCKED`

A `RESOLVED` result is still a proposal until host-side revalidation succeeds. `AMBIGUOUS` requires an explicit abstention reason.

## Patch rules

Patches describe bounded semantic changes and must include stable event/measure identity, before/after values, evidence, confidence and solver version. The source document is never overwritten by the core.
