# Current Status

Last verified technical baseline: `3c013d3d1eebf03ca1f58e0ee6fbc07ebce69f2e`

## Verified autonomous boundary

Stages E0-E10 are technically merged and exact-main CI has passed through workflow run #9 (`33148340492`). The engine remains non-authoritative and shadow-first.

Verified capabilities include:

- provider-agnostic correction contracts and explicit abstention states;
- stable score/event identities;
- bounded candidate search;
- meter and onset constraints;
- deterministic candidate resolver requiring independent evidence classes;
- bounded polyphonic voice candidate generation;
- classical-guitar and piano soft-prior profiles;
- explicit `VOICE != STAFF` and `HAND != STAFF` invariants;
- immutable correction projection with stale-before protection;
- reversible projection for currently supported patch fields;
- fail-closed unsupported relation correction;
- pure SesliTab-shaped shadow adapter contract;
- explicit teacher-approved provenance;
- deterministic benchmark reporting correction coverage separately from precision.

## Safety boundary

Not implemented or authorized:

- production MusicXML overwrite;
- automatic application of correction proposals;
- Audiveris runtime modification;
- provider/network execution from the core;
- inferred relation mutation without a relation model;
- external AI model dependency;
- universal 97-99% OMR accuracy claims.

E11 controlled automatic correction is deliberately NOT STARTED and requires a separate explicit safety authorization after representative teacher-approved benchmark evidence.

E12 visual second-opinion AI is also not started. Any future AI component must be optional evidence only.

## Repository governance limitation

`main` is currently not protected by a GitHub branch protection/ruleset. Security issue #2 tracks enabling pull-request-only changes and required `test-and-build`. Until repository settings enforce this, development policy remains branch -> PR -> exact-head CI -> squash merge -> exact-main CI, with no direct main commits.
