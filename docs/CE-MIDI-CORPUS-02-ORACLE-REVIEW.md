# CE-MIDI-CORPUS-02 — Real MIDI Oracle Review Gate

This gate exists so a same-work real MIDI reference cannot silently become ground truth.

A diagnostic may enter the oracle review queue only when its pair is `READY_FOR_ORACLE_REVIEW`. That requires an exact MIDI identity plus an exact canonical `OMR_CANONICAL` or `HOST_CANONICAL` ScoreGraph with verified provenance. Controlled mutations and source reconstructions are rejected as real-pair substitutes.

New review items are always `PENDING`, with `verifiedLabel=null` and `automaticCorrectionAuthority=false`.

A verified label requires an explicit reviewer of kind `TEACHER` or `INDEPENDENT_REFERENCE`. An ambiguous review is a successful abstention and creates no label.

This layer does not itself create `createMidiEvaluationCase` records, calibration data, evidence weights, ScoreMosaic authority, or automatic correction patches. Those remain downstream and gated by the existing teacher-gold/reliability contracts.
