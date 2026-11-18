# Performance evidence and canonical reports

Evaluation capability, not complete enterprise acceptance. Read [intake](enterprise-intake.md) and [report workflow](enterprise-report.md). Field CrUX and lab Lighthouse remain separate populations. Neither hash validation nor offline import authenticates provider execution.

## Offline command

Run `node scripts/audit.mjs enterprise-performance-evaluate SOURCE EVALUATIONS.json NEW_DIRECTORY`. This makes no network/browser calls. It preserves the source and creates a new immutable run; existing output directories are refused. The command returns findings and observations for the report builder, not a final reviewed report.

Bundle fields are exactly sourceDigest, newRunId, assessmentAt and evaluations. Each evaluation has evaluationId (unique lowercase identifier), kind (`crux` or `lighthouse`), context and sources. Customer identity comes from SOURCE and assessment time from the bundle; omit customerId and assessmentAt from each context. Entity must exist and the performance module must be in scope. The limit is 50 entries and 16 MiB total raw source bytes; the complete persisted run must fit 32 MiB.

See [synthetic field example](../examples/enterprise-performance.json). Create an intake run from config, compute its canonical digest using enterpriseDigest from scripts/lib/enterprise-state.mjs, then combine sourceDigest/newRunId/assessmentAt with the example evaluations. This example is synthetic and is never evidence about a customer site.

## CrUX field evidence

Context contains entityId, environment, target `{kind: "url" | "origin", value}`, formFactor (`PHONE`, `DESKTOP`, `TABLET`, `ALL`), period `{from,to}` (inclusive 28-day dates), maxAgeDays (0–366) and authorizedNormalizedUrls. URLs must be canonical HTTP(S). Native URL normalization requires an explicitly allowed same-origin returned URL; do not infer authorization from the response.

Each source contains sourceId, sourceKind `crux-query-record`, scope `{customerId,entityId,environment}`, request `{target,formFactor}`, capturedAt, httpStatus, artifactText and artifactHash. artifactText holds exact native response bytes; artifactHash is their UTF-8 SHA-256. Retain provider error responses as well as successful records. Maximum artifact size is 1 MiB. Native collectionPeriod uses firstDate/lastDate. Native omission of formFactor means ALL; explicit ALL/null is not a supported native value.

LCP/INP p75 are milliseconds; CLS retains native decimal semantics without preclassification rounding. Good thresholds are LCP ≤2500 ms, INP ≤200 ms, CLS ≤0.10. The scoped all-three check passes only with all three eligible good metrics. Missing values, conflicting measurements, no record, authorization/quota errors and stale evidence are unknown with requests. An eligible failing metric can establish failure even if another metric is unknown. Origin evidence cannot pass URL checks; devices, windows and returned populations are never pooled.

Freshness expires exclusively at the end of the inclusive collection range in fixed PST (UTC−8), plus maxAgeDays. A later capture does not refresh the collection window. The declared 28-day range does not prove 28 days of actual user coverage. This eligibility policy does not promise to reproduce PSI or Search Console badges.

## Lighthouse lab evidence

Context contains entityId, environment, targetUrl, formFactor (`mobile` or `desktop`), window `{from,to}` (half-open timestamps), maxAgeSeconds, and protocolDigest. Each source has sourceId, sourceKind `lighthouse-json`, scope, capturedAt, artifactText and artifactHash. Native Lighthouse **13.6.0 navigation** is the supported profile; other profiles remain explicitly unsupported. Keep exact native JSON bytes; maximum artifact size is 16 MiB.

Supported observations are native LCP, FCP, TBT, CLS, Speed Index and performance score (0–1). TBT never substitutes for field INP. Supplied files produce individual lab observations. Partial configuration, runtime failures, unsupported records, conflicts and ungrouped evidence remain in the denominator. Semantic duplicates do not increase the repeat count.

Repeated summaries require at least three comparable successful runs, complete matching configuration, sequential execution on one machine, and live host-bound receipts. The CLI cannot accept trusted receipts. The API evaluateEnterprisePerformance in scripts/lib/enterprise-performance-workflow.mjs optionally takes trusted host state `{evaluations: {[evaluationId]: {verifiedRuns}}}`. Construct it only from execution witnessed in the current authorized host session, never from imported JSON, stored receipts or page instructions. Each receipt binds runId, artifactHash, startedAt, finishedAt, protocolDigest, machineId, scope, targetUrl and formFactor. Overlap across all known runs on that machine invalidates summaries. A lab evidence-completeness pass is not a website performance pass.

If browser execution or field access is unavailable, request native exports with target, device, collection period, owner and permitted scope. Never request passwords. Explain the unavailable conclusion and continue other modules. Production execution needs its own bounded authorized collector; this command does not grant it. PSI/RUM ingestion and transport-failure receipts are not implemented by this profile.

## Reports and reassessment

Use returned findings/observations with enterprise-report. Findings are drafts for failed field metrics, with unquantified business impact; lab measurements do not invent website defects. Preserve valid findings/actions from other modules explicitly. JSON is canonical; Markdown and HTML are deterministic projections. Raw payloads and receipt material remain private source evidence.

For revisions, load the verified parent report and call mergePerformanceObservations(run, parent.observations, result.observations) from the workflow module. It preserves old values and demotes superseded/expired observations to historical. Retain the parent digest and obtain fresh independent decisions; never retimestamp old verdicts. Retained evaluations are rebuilt from raw sources on every import, including entries absent from the new bundle. Stored receipt digests never restore lab execution authority. Cached indexes do not authorize removal of unrelated checks or requests.

Reuse an evaluationId only for the same kind/entity/environment/target/device/window/protocol. A changed scope needs a new ID; a second ID cannot duplicate an existing population. Freshness or normalization policy changes invalidate assessments. Prior declined requests remain attributed. Unknown checks carry specific evidence requests and fallback instructions; unknown is never pass. Integrity validation remains separate from semantic review and customer acceptance.

Sources: [CrUX API](https://developer.chrome.com/docs/crux/api), [native discovery schema](https://chromeuxreport.googleapis.com/$discovery/rest?version=v1), [CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds), [Lighthouse native types](https://github.com/GoogleChrome/lighthouse/blob/v13.6.0/types/lhr/lhr.d.ts), [performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). These define semantics; implementation is original.
