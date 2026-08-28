# E11A — Controlled Voice-Only Automatic Correction

## Authorization

E11 was explicitly authorized by the user on 2026-08-28 after the E10I readiness checkpoint.

E11A is deliberately narrower than general automatic correction. It does not authorize production MusicXML overwrite or additional correction classes.

## Allowed automatic path

A correction may reach the controlled in-memory apply path only when all of the following are true:

1. resolver result is `RESOLVED`;
2. result confidence is at least `0.90`;
3. at least two independent evidence sources are present;
4. exactly one patch is proposed;
5. the patch operation is `CHANGE_VOICE`;
6. patch confidence is at least `0.90`;
7. patch itself retains at least two independent evidence sources;
8. immutable patch projection succeeds;
9. post-correction revalidation is provided and completes successfully;
10. the host revalidation decision is explicitly `ACCEPT`.

If any eligibility rule is not met, the correction is not automatically applied.

If projection or revalidation fails, the result is `BLOCK`.

If host revalidation returns `REVIEW` or `BLOCK`, the exact original source graph remains selected.

## Explicitly excluded from E11A

Automatic mutation remains disabled for:

- duration;
- onset;
- staff assignment / cross-staff inference;
- ties;
- tuplets;
- beam semantics;
- pitch;
- relation / arpeggio / glissando;
- irregular or pickup measure normalization;
- guitar fingering or string-number interpretation;
- multiple-patch transactions.

## Source safety

E11A applies only to a newly projected in-memory canonical score graph. The raw source graph remains immutable and is retained separately in the controlled result.

There is no raw MusicXML write path in E11A.

There is no Audiveris runtime change.

There is no SesliTab production adapter change and no quality-gate bypass.

## Controlled acceptance target

The E10I teacher-approved controlled benchmark is reused as a safety regression set:

- 16 high-evidence cases must become eligible only after explicit `ACCEPT` revalidation;
- 16 partial-evidence guard cases must remain unapplied;
- incorrect controlled automatic applications must remain `0`.

E11A does not claim general production false-positive performance.
