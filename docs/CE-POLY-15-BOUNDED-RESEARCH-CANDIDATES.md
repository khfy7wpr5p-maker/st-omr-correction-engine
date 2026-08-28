# CE-POLY-15 — Bounded Research Candidate Generation

Status: RESEARCH_ONLY

This stage introduces a bounded descriptor generator for candidate exploration while keeping candidate acceptance and patch application separate.

Supported research operations:

- CHANGE_VOICE
- CHANGE_DURATION
- CHANGE_ONSET
- CHANGE_STAFF
- ADD_TIE
- REMOVE_TIE

Safety boundaries:

- only explicitly supplied candidate values are considered;
- original values are skipped;
- candidates are deduplicated;
- maxPerEvent and maxTotal limits are mandatory positive integers;
- unsupported error classes are ignored rather than guessed;
- every generated candidate has `applyEnabled: false`;
- no production resolver threshold or correction gate changes;
- no source mutation.

Pitch remains outside this research generator. Candidate acceptance continues to require separate evidence, calibration, and revalidation stages.
