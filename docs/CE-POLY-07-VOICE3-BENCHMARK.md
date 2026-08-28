# CE-POLY-07 — Voice 3 Benchmark

The existing four-voice-capable solver is retained unchanged. This stage adds a target-Voice-3 regression showing the current evidence model reaches `0.70` from beam continuity plus same-staff temporal continuity, below the unchanged `0.90` resolver threshold.

Expected result: `AMBIGUOUS` / abstain, not an invented Voice 3 correction.

This confirms that Voice 3 support is structurally present but not yet evidence-ready for automatic correction. Additional teacher-gold real OMR evidence is required before any Voice 3 scoring or production-policy change is considered.
