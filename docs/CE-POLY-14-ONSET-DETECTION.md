# CE-POLY-14 — Onset Anomaly Detection

Status: RESEARCH_ONLY

This stage adds conservative onset anomaly detection without enabling onset correction.

Principles:

- MusicXML serialization order is not treated as musical onset authority.
- Existing measure-boundary onset checks are reused.
- Displaced onset is flagged only when explicit expected-onset evidence is supplied.
- Explicitly linked chord tones are checked against their anchor onset.
- Grace and tuplet metadata do not by themselves produce an onset correction.

Safety boundaries:

- no CHANGE_ONSET patch is generated;
- no backup/forward serialization sequence is interpreted as a correction target by itself;
- no resolver threshold or production policy changes;
- original source remains immutable.

Candidate onset ranking remains deferred until teacher-gold evidence and independent revalidation support it.
