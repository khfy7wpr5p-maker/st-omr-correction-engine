# CE-POLY-18 — ScoreMosaic Shadow Bridge v2

Status: SHADOW_ONLY

Fresh-read reference used for this stage: `khfy7wpr5p-maker/scoremosaic-platform` main `60fcade165cce52097ba38d4e821fabdf589e484`.

ScoreMosaic Stage 7 remains neutral comparison evidence. Its documented locks include no winner selection, no automatic merge/correction, no Teacher Review mutation/approval, and no publication authority.

This bridge therefore only converts canonical disagreement evidence into a deterministic Correction Engine shadow packet.

Locked boundaries are explicit:

- winnerSelection: false
- quorumMutation: false
- candidateDeletion: false
- teacherRevisionMutation: false
- musicXmlMerge: false
- patchApplication: false

Unknown external categories map to `OTHER` rather than inventing a correction class. Disagreement IDs must be unique. Evidence ordering is deterministic. The source score graph is returned by identity and is not modified.
