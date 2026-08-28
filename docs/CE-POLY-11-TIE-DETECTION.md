# CE-POLY-11 — Tie Anomaly Detection

Adds research-only tie integrity checks using explicit tie metadata, pitch identity, voice identity and staff identity.

The detector can flag missing starts, missing stops and missing same-lane targets. It deliberately does not infer ties from slurs, create `ADD_TIE`/`REMOVE_TIE` production patches, or mutate score data.

Progression remains: detect/flag -> later bounded suggestion research -> gated correction only after teacher-gold evidence and a separate approval boundary.
