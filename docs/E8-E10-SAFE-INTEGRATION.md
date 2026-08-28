# E8-E10 Safe Projection, Adapter and Benchmark

## E8 — reversible projection

Correction patches are projected onto a new score graph. The source graph stays immutable. Patch application requires an exact `before` value match; stale patches fail closed. `CHANGE_RELATION` remains unsupported until a relation model exists, rather than inventing relation semantics. Revert creates another new graph from inverse patches.

## E9 — SesliTab shadow adapter

The adapter is a pure contract bridge. It accepts host-provided score/validator evidence and returns generated candidates plus a resolver result. It does not execute Audiveris, parse/write MusicXML, call network services or expose an apply function.

## E10 — teacher evidence and benchmark

Gold benchmark cases require explicit teacher-approved provenance. The benchmark reports correction coverage and precision among resolved cases separately. It does not convert a small corpus result into a universal OMR accuracy claim.

No production automatic correction is enabled. E11 remains a separate explicit authorization gate.
