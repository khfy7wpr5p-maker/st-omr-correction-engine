# ST-OMR Correction Engine — Architecture Reality Refresh — 2026-10-28

## Scope and verified baseline

Documentation-only synchronization against `main@bdaeb1e6fec8aee27d1cc72347f5be735af3cf30`, read on 2026-10-28. The latest engine merge remains [PR #99](https://github.com/khfy7wpr5p-maker/st-omr-correction-engine/pull/99), merged 2026-09-29. This report does not establish current host pins, deployed artifacts or live browser behavior.

The architecture now has three distinct paths:

| Path | Implementation | Result and authority |
|---|---|---|
| Bounded correction proposals | `src/correction/omrCorrectionAnalyzer.js`, resolver, patch projection and independent revalidation | Deterministic proposals; automatic selection remains E11A voice-only |
| Read-only MusicXML browser analysis | `src/correction/musicXmlSuspiciousMeasureAnalyzer.js`, `browser/ceAnalysisBrowserEntry.js` | Immutable suspicious-measure packet for host presentation; no apply/write-back |
| Explicit teacher structural correction | `adapters/seslitab/teacherStructuralEditAdapter.js`, structural contracts/projection/revalidation/reverter | Exact declared edit, immutable projection and rollback; no inferred musical content or final approval |

SEM-05 is an additional same-source diagnostic/reference channel. It does not contribute independent resolver evidence or teacher-gold authority.

## Merged changes since the previous architecture refresh

| PR | Merged capability | Commit |
|---|---|---|
| #94 | SEM-05 shadow semantic consistency | `2425e4e5f2f96d36c2524055f9cba9966d2465e5` |
| #95 | SES-97 teacher-reviewed DURATION correction-needed seed | `589c996ee0945ab6fb1169e7f0c7abfeb56add35` |
| #96 | CE-STRUCT-01 teacher-only structural lane | `c11d35b35321c5d7761e7033ce4ce1d91cbeb1c2` |
| #97 | Exact-source CE-STRUCT browser runtime | `7550e77b3ddff55e63e714b2dbc2b450b69771dc` |
| #98 | SES-110 teacher-verified Sor structural-failure packet | `1a3592327a3918e10da9b288ee39710fc4ebbf9b` |
| #99 | SES-112 read-only browser suspicious-measure analysis | `bdaeb1e6fec8aee27d1cc72347f5be735af3cf30` |

## Browser artifact contracts

| Property | Analysis runtime | Teacher structural runtime |
|---|---|---|
| Build | `npm run build:ce-analysis-browser` | `npm run build:ce-struct-browser` |
| Output directory | `dist/browser-analysis/` | `dist/browser/` |
| Artifact | `ce-analysis-browser-runtime.js` | `ce-struct-browser-runtime.js` |
| Browser global | `STOmrCorrectionAnalysisRuntime` | `STOmrCorrectionCeStructRuntime` |
| Public task | MusicXML text → suspicious measures | Explicit teacher patch → validated structural packet |

Both builds bind the manifest to exact checked-out engine revision, artifact bytes and SHA-256. They use the same admitted source logic as Node, with bounded browser shims and zero external imports. PR CI checks out the actual PR head before building. Neither artifact grants network, persistence, authentication, automatic apply, learning or MusicXML write-back authority.

The analysis result contract is `ST_OMR_CORRECTION_ENGINE_SUSPICIOUS_MEASURES_V1`, mode `SHADOW_ONLY`. Its `sourceHash` binds the supplied XML text bytes, and `partId + measureIndex` provides host mapping data. `measureIndex` is zero-based; `measureNumber` is a string. Finding codes and `unmappedFindingCount` remain diagnostic data, not musical teacher approval.

The bounded parser is not a complete XML schema/notation validator. Its explicit rejection cases and parity tests do not establish universal MusicXML coverage. Host presentation must admit results against its current source/revision and handle unavailable, stale or unmappable analysis without granting mutation authority.

## Evidence counts and readiness

| Evidence set | Verified contents | Promotion limits |
|---|---|---|
| Known-correct seed | 22 score events, 54 `NO_CORRECTION_NEEDED` labels, 1 source | Negative regression; not positive correction evidence |
| SES-97 Franz Benda | 1 eligible accepted DURATION correction-needed label from an independent source | `correctionSafe=false`; no automatic DURATION authority |
| Combined event-gold regression | 55 eligible labels, 2 sources, 1 correction-needed source, 0 safe accepted corrections | Conditional `TEACHER_REVIEW_READY`; automatic candidacy rejected |
| SES-110 Sor | Teacher-verified structural failures at 21/28/29/31 | `readinessEligible=false`, `patchEligible=false`; exact teacher patch values absent |

Source: the two `teacherReviewedRealOmr*Seed.js` modules and their tests, `approvedRealOmrSeed.js`, and `realOmrCorrectionReadiness.js`. Structural classifications and event-gold counts remain separate. No new teacher decision or musical correction was generated in this sync.

E11A remains one high-confidence `CHANGE_VOICE` patch, confidence at least 0.90, at least two independent evidence sources, immutable projection and explicit post-projection `ACCEPT`. Expanded proposal/analysis/structural packaging does not broaden it. CE-CAL-01 requires separately justified evidence thresholds and source-separated calibration/final evaluation; the first accepted event is insufficient.

## Host integration records and unresolved reanalysis

Linear records checked on 2026-10-28:

| Record | Recorded status | Interpretation |
|---|---|---|
| SES-109 / CE-DATA-02 | Todo | Evidence expansion remains unfinished; older Notion In Progress wording was stale |
| SES-110 | Done | Sor classification packet merged; no readiness promotion |
| SES-111 | Done | Historical Editor Core integration completion |
| SES-112 | Done | Engine browser analysis merged in PR #99 |
| SES-114 | Done | Historical SesliTab read-only overlay integration completion |
| SES-263 | Todo | Reported old suspicious marks after teacher correction/reanalysis; root cause/fix unverified |

SES-263 requires tracing the actual accepted XML/sourceRevision → analysis result → visible overlay chain. A corrected measure can still legitimately have findings. A historical green integration test or a new engine analysis result alone does not establish that the host refreshed its overlays. This report neither diagnoses nor closes that issue.

The earlier Sor qualification record reports 22 suspicious measures, including teacher-confirmed 21/28/29/31. Four structural evidence measures and the full detector result set are different scopes. Private Sor bytes were not replayed here; no new claim of exactly four findings or a current live screenshot is made.

## Verification and limits

- Fresh local `npm test`: **379 passed / 0 failed / 0 skipped**, including both browser builds and Node/browser parity tests; Node v24.22.1. Repository CI specifies Node 20.
- Fresh local `npm run check`: **PASS**.
- Existing exact-baseline [test-and-build run 36605554522](https://github.com/khfy7wpr5p-maker/st-omr-correction-engine/actions/runs/36605554522): success.
- Existing exact-baseline [basic-pitch smoke run 36605554481](https://github.com/khfy7wpr5p-maker/st-omr-correction-engine/actions/runs/36605554481): success; optional Python/provider execution was not rerun locally.
- Repository ruleset `21713803` was read: active PR requirement, strict `test-and-build`, deletion/non-fast-forward protection and no bypass actors. The documentation PR has its own head and CI result; baseline success is not its result.
- No runtime, tests, configuration, lockfile, consumer pin, threshold, deployment or teacher provenance changes belong to this update.
- Current host source/pins, live deploy, private-input replay, mobile acceptance and the SES-263 user scenario were not independently requalified.

## Documentation corrections

The current entry documents now distinguish merged SEM-05/CE-STRUCT/browser work from historical branch states, replace stale zero correction-needed counts, and separate the Sor structural packet from event-gold readiness. The 2026-09-20 report is retained as a dated snapshot with a link to this refresh. Notion/Linear updates should link this proposed documentation PR until it is merged; they must not claim protected main already contains the documentation changes.
