# CE-POLY-19 — External Benchmark Intake

Status: SAFE INTAKE GATE

This stage expands external-benchmark capability by requiring explicit metadata before an external source can be used.

Required manifest fields:

- dataset
- source
- version
- license
- licenseVerified
- redistribution
- commercialUse
- trainingAllowed
- evaluationAllowed
- SHA-256 checksum

Safety behavior:

- unverified licenses fail closed;
- evaluation permission is separate from training permission;
- repository copy additionally requires redistribution permission;
- training eligibility never follows automatically from evaluation eligibility;
- no external bytes or datasets with uncertain rights are copied by this stage.

This stage intentionally does not fabricate new teacher-gold events or count synthetic cases as real OMR errors. Corpus growth still requires separately sourced, licensed and teacher-verified data.
