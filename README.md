# ST OMR Correction Engine

A fail-closed, provider-agnostic correction intelligence layer for Optical Music Recognition output.

## Scope

This project does **not** run or modify Audiveris. It consumes structured score evidence and validator findings, generates bounded correction candidates, and returns proposals that must be revalidated by the host application.

Initial operating mode is **shadow-only**: no source MusicXML overwrite and no automatic production correction.

## Safety invariants

- Raw/source MusicXML is immutable.
- `AMBIGUOUS` / abstention is a first-class outcome.
- No candidate is accepted only because it makes a measure add up.
- Provider, UI, TTS, playback and TAB concerns stay outside the core.
- AI is optional evidence, never semantic authority.
- All future correction patches must be reversible and auditable.

See `docs/ARCHITECTURE.md`, `docs/SAFETY.md`, and `docs/ROADMAP.md`.
