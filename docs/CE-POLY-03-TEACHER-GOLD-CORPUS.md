# CE-POLY-03 — Teacher-Gold Correction Corpus Contract

This stage extends the existing teacher-approved benchmark without replacing `goldCase` or changing resolver behavior.

## Event contract

Each corpus event records source/engine identity, page/system/measure/staff/voice location, versioned error class, original/teacher/candidate values, correction-needed and correction-safe labels, evidence availability, explicit teacher decision and provenance.

Optional evidence-localization metadata supports `bbox`, `imageCropRef`, source-quality metadata and polyphony-complexity metadata.

## Origin separation

Events must explicitly declare one of:

- `REAL_OMR`
- `CONTROLLED_MUTATION`
- `SYNTHETIC`

Synthetic or controlled cases must never be reported as real OMR events.

## Source mutation invariant

The benchmark layer now exposes an exact SHA-256 byte invariant. CI tests verify that unchanged source bytes pass and modified source bytes fail. This does not authorize corrected MusicXML serialization or overwrite.

## Scale target

The schema is ready for corpus growth toward >=500 verified correction events and later >=1000 verified real OMR error events. This PR intentionally does not fabricate events merely to reach those counts.
