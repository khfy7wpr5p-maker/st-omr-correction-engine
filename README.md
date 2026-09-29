# ST OMR Correction Engine

A fail-closed, provider-agnostic correction intelligence layer for Optical Music Recognition output.

## Scope

This project does **not** run or modify Audiveris. It consumes structured score evidence and validator findings, detects bounded OMR anomalies, generates correction proposals, and returns results that must be revalidated by the host application.

The end-to-end shadow proposal surface covers pitch, duration/rhythm, onset, voice, staff and tie correction proposals when the engine has an exact deterministic target. Tuplet and cross-staff analysis remain evidence/research surfaces where the engine abstains rather than guessing.

Production automatic correction remains narrower than proposal generation: E11A authorizes only a single high-confidence `CHANGE_VOICE` patch after independent evidence and explicit post-projection revalidation. Expanded proposal support does not silently grant automatic write-back authority.

The REAL_OMR readiness gate additionally requires gold-eligible, teacher-accepted **correction-needed** real OMR evidence before expanded classes can advance toward automatic correction. Known-correct `NO_CORRECTION_NEEDED`, controlled-mutation and synthetic labels cannot substitute for that evidence.

## SEM-05 — Shadow Semantic Consistency

SEM-05 adds a read-only consistency channel between the existing OMR `ScoreGraph` and a provenance-pinned ST Score Semantic Engine snapshot produced from the exact same MusicXML bytes.

Because both views derive from the same source, Semantic Engine output is **not independent correction evidence**. It is kept outside `createEvidence()`, `EVIDENCE_SOURCE`, candidate evidence and resolver inputs. The packet has effective weight 0, `resolverEligible=false`, no patch/apply surface and no teacher-gold/readiness authority.

The first profile compares pitched non-rest notes, measure membership/count, local onset, duration, voice, staff, simple tie boundary roles and meter. Unsupported structures fail closed. There is no OMR runtime dependency on Python/Partitura, no network/Render service and no MusicXML write-back.

## CE-STRUCT-01 — Teacher-authorized structural edits

CE-STRUCT-01 adds a separate teacher-only structural correction lane for explicit editor actions such as inserting/removing note or rest events, changing event duration/voice/staff/tie state, and changing an existing measure's meter.

The host must supply the exact teacher action and exact base revision. The engine does not infer missing musical content. Structural patch sets are immutable, exact-fingerprint-bound, atomic, reversible, independently revalidated, and kept outside the existing automatic `PATCH_OPERATION` / E11A authority path.

A successful structural revalidation proves only that the declared teacher edit was represented exactly, introduced no undeclared mutation, and can be rolled back exactly. It does **not** prove musical correctness and does not grant final teacher approval, student sharing, learning/persistence authority, MusicXML write-back, or automatic correction.

## Safety invariants

- Raw/source MusicXML is immutable.
- `AMBIGUOUS` / abstention is a first-class outcome.
- No candidate is accepted only because it makes a measure add up.
- Provider, UI, TTS, playback and TAB concerns stay outside the core.
- AI is optional evidence, never semantic authority.
- All correction patches must be reversible and auditable before any production promotion.
- Structural proposals are shadow-only unless a separately approved readiness policy grants apply authority.
- Teacher-gold provenance is human-owned and must not be fabricated by automation.

See:

- `docs/ARCHITECTURE.md`
- `docs/CURRENT_STATUS.md`
- `docs/ROADMAP.md`
- `docs/SAFETY.md`
- `docs/CE-E2E-01-END-TO-END-CORRECTION-PROPOSALS.md`
- `docs/CE-E2E-02-REAL-OMR-CORRECTION-READINESS-GATE.md`
- `docs/ARCHITECTURE-REALITY-REFRESH-2026-09-20.md`
