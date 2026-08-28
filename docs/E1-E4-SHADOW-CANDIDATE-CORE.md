# E1-E4 Shadow Candidate Core

This stage implements only read-only/shadow reasoning primitives.

- E1: stable measure/event score graph.
- E2: bounded candidate graph with candidate/depth/operation limits.
- E3: meter-duration and onset-boundary constraints that report violations without inventing repairs.
- E4: deterministic resolver with explicit abstention.

Safety rule: a candidate cannot resolve from meter evidence alone. By default at least two independent evidence-source classes are required, no hard violations are allowed, confidence must meet threshold, and competing candidates must have sufficient margin.

No MusicXML serializer, patch applier, provider adapter or automatic correction is present in this stage.
