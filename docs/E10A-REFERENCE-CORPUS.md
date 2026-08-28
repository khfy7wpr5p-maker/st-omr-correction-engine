# E10A — Pinned Reference Corpus

E10A strengthens the benchmark layer without crossing into automatic correction.

## First pinned sources

### Piano

- Repository: `OpenScore/Lieder`
- Pinned commit: `6b2dc542ce2e8aa4b78c8ee62103b210efc07015`
- Score: Erik Satie, *Je te veux*, `lc6986302.mscx`
- Pinned blob: `bd7d6721c841e6b1d88bc9b8c48b1095e301781a`
- License: CC0-1.0
- Relevant notation: two-staff Piano part / grand-staff style accompaniment.

### Classical guitar

- Repository: `yawnoc/guitar`
- Pinned commit: `fe48dbba46be760fab453b3a72ef35746f20ea48`
- Score: Fernando Sor, Op. 35 No. 13 / Study in C
- Pinned blob: `c96155e3693c4963c1ebf669ed8e54d17c075e77`
- License: CC0-1.0
- Relevant notation: treble-8, 2/4, explicit high/low voice material and fingering notation.

## Safety status

Both entries are `REFERENCE_ONLY` by default. They are useful for corpus intake, conversion planning and future benchmark fixture selection, but they are **not** teacher-gold and must not be reported as measured correction accuracy.

Promotion to `GOLD_ELIGIBLE` requires explicit teacher approval provenance. The source object remains immutable; promotion creates a new object.

No source score bytes are vendored into this repository in E10A. The registry stores pinned repository, commit, path and blob identities only.

E11 production automatic correction remains NOT STARTED.
