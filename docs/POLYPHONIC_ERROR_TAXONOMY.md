# Polyphonic Error Taxonomy

Version: `1.0.0`

This taxonomy is a repository-local, versioned vocabulary intended to remain compatible with downstream ScoreMosaic review and ST-OMR Training evaluation without creating a runtime dependency between repositories.

## Classes

`PITCH`, `DURATION`, `ONSET`, `VOICE`, `STAFF`, `REST`, `ACCIDENTAL`, `TIE`, `SLUR`, `TUPLET`, `BEAM`, `STEM`, `CHORD_GROUPING`, `CROSS_STAFF`, `METER`, `MEASURE_BOUNDARY`, `GRACE`, `ORNAMENT`, `OTHER`, `AMBIGUOUS`.

## Safety boundary

The taxonomy is descriptive. Adding an error class does not authorize candidate generation, automatic correction, source mutation, threshold changes, or production behavior.

`AMBIGUOUS` remains a valid explicit classification when available evidence cannot support a narrower class.

Consumers should persist both `errorClass` and `taxonomyVersion` so historical benchmark data remains interpretable if the vocabulary evolves.
