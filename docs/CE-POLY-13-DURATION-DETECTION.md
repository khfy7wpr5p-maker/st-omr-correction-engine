# CE-POLY-13 — Duration Anomaly Detection

Status: RESEARCH_ONLY

This stage adds conservative duration anomaly detection without enabling duration correction.

The detector currently flags:

- non-grace events with zero duration;
- voice timelines whose maximum end exceeds the containing measure duration, reusing the existing meter constraint.

Safety boundaries:

- no candidate duration is invented;
- no CHANGE_DURATION patch is generated;
- measure-total consistency is not treated as sufficient evidence for a correction;
- no resolver threshold or production policy changes;
- original source data remains immutable.

Future duration candidate ranking requires stronger teacher-gold evidence, neighboring-event/onset evidence, independent validation, and explicit production-readiness review.
