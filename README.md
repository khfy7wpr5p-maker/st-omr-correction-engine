# ST OMR Correction Engine

A fail-closed, provider-agnostic correction intelligence layer for Optical Music Recognition output.

## Scope

This project does **not** run or modify Audiveris. It consumes structured score evidence and validator findings, detects bounded OMR anomalies, generates correction proposals, and returns results that must be revalidated by the host application.

The end-to-end shadow proposal surface covers pitch, duration/rhythm, onset, voice, staff and tie correction proposals when the engine has an exact deterministic target. Tuplet and cross-staff analysis remain evidence/research surfaces where the engine abstains rather than guessing.

Production automatic correction remains narrower than proposal generation: E11A authorizes only a single high-confidence `CHANGE_VOICE` patch after independent evidence and explicit post-projection revalidation. Expanded proposal support does not silently grant automatic write-back authority.

## Safety invariants

- Raw/source MusicXML is immutable.
- `AMBIGUOUS` / abstention is a first-class outcome.
- No candidate is accepted only because it makes a measure add up.
- Provider, UI, TTS, playback and TAB concerns stay outside the core.
- AI is optional evidence, never semantic authority.
- All correction patches must be reversible and auditable before any production promotion.
- Structural proposals are shadow-only unless a separately approved readiness policy grants apply authority.

See `docs/ARCHITECTURE.md`, `docs/SAFETY.md`, `docs/ROADMAP.md`, and `docs/CE-E2E-01-END-TO-END-CORRECTION-PROPOSALS.md`.
