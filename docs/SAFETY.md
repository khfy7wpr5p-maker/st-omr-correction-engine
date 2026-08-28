# Safety Policy

## Non-negotiable invariants

- Source MusicXML and OMR source artifacts are immutable.
- The engine may propose; the host decides whether a proposal may be consumed.
- `AMBIGUOUS`, `UNSUPPORTED`, and `BLOCKED` are valid successful safety outcomes.
- No missing note, rest, pitch, duration, voice, tie, beam, tuplet or staff assignment may be invented without evidence.
- A candidate is not accepted merely because it satisfies meter arithmetic.
- Every future applied correction must be represented as a reversible patch with before/after values, evidence, confidence and solver version.
- Automatic correction stays disabled until benchmark thresholds and teacher-review requirements are explicitly approved.
- AI output is evidence only and can never bypass deterministic validation or host quality gates.

## Search safety

Candidate generation must be bounded by explicit limits (candidate count, depth and time/operation budget). Exhaustion returns an abstention state, never a guessed answer.
