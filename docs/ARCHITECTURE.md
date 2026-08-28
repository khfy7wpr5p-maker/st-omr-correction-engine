# Architecture

## Boundary

`ST OMR Correction Engine` is downstream of an OMR provider and upstream of host-side revalidation/quality gates.

```text
OMR provider -> raw/structured score -> host validator -> correction engine (shadow) -> candidate proposals -> host revalidator -> ACCEPT/REVIEW/BLOCK
```

The engine must not import Audiveris runtime, host UI, TTS, playback, TAB, authentication or deployment code.

## Planned layers

1. Contracts and canonical correction model.
2. Candidate graph with bounded search.
3. Deterministic meter/rhythm/onset/voice/relation constraints.
4. Candidate resolver with explicit abstention.
5. Polyphonic voice solver.
6. Classical guitar profile.
7. Piano profile.
8. Reversible correction patch model.
9. Host adapters (starting with SesliTab) in shadow mode.
10. Teacher evidence and benchmark harness.
11. Controlled automatic correction only after explicit safety gate.
12. Optional visual second-opinion AI as evidence provider.

## Dependency direction

Core never depends on adapters or AI. Adapters depend on core contracts. AI may provide evidence through an interface but must remain optional.
