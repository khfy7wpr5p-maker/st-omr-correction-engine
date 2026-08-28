# E10H — Expanded Teacher Approval

E10H records explicit musical approval for the four bounded real-score review packets introduced in E10G.

Approved excerpts, all limited to measures 1–8:

- Piano — Maria Theresia von Paradis, *An das Klavier*, staves 2–3.
- Piano — Anton Webern, Op. 4 No. 4, *So ich traurig bin*, staves 2–3.
- Classical guitar — Francisco Tárrega, *Lágrima*, staff 1.
- Classical guitar — John Dowland, *Fantasia Number 7*, staff 1.

Together with the previously approved Satie and Sor excerpts, the gold-eligible real-score pool is now six sources total: three piano and three classical guitar.

## Provenance and immutability

Each approval has its own stable approval id and is applied only to the matching review packet. The original reference corpus entries and pending review queue definitions remain immutable; approved packets and gold-eligible sources are derived objects.

## Verified technical result

- PR #21 merged by squash.
- Technical main: `982882d7e8973a15b79ba187acb5287f7ed76e58`.
- Exact-main `test-and-build` run #36 (`33158016635`): SUCCESS.
- Gold-eligible sources: 6 total, balanced 3 piano + 3 classical guitar.
- Resolver threshold: unchanged at 0.90.
- Existing controlled mutation benchmark: unchanged at 24 cases.
- Incorrect resolved controlled mutations: remains 0 in the verified E10F baseline.

## Next safe stage

E10I may derive new controlled mutation cases from source-verified structure in the four newly approved excerpts. It must not duplicate synthetic cases simply to inflate benchmark size.

E11 controlled production auto-correction remains NOT STARTED.
