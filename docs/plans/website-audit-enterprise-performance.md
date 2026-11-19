# Enterprise performance implementation contract

Status: CrUX/Lighthouse evaluators and immutable CLI/report integration are implemented and packaged since candidate 0.3.12; current candidate is 0.3.13. Real performance pilots, remaining adapters and native-host/commercial acceptance remain open.
Parent: [P5 enterprise plan](website-audit-enterprise.md). See [packaging evidence](../research/website-audit-enterprise-performance-0312-review.md); tasks below preserve the implementation contract, not a fresh claim of missing source.

## Outcome and evidence boundary

Produce scoped performance checks and actionable missing-data requests in the canonical enterprise report. Keep field measurements, lab measurements and business outcomes separate. A Lighthouse score must never establish field Core Web Vitals, conversion impact, ranking impact or site-wide quality. Four public pilots are available, but their existing unthrottled concurrent page loads are not a controlled performance baseline.

Primary sources verified on 2026-11-19:

- [Web Vitals](https://web.dev/articles/vitals): LCP, INP and CLS, assessed at p75; all three must meet good thresholds for the generic all-three passing rule.
- [Threshold definitions](https://web.dev/articles/defining-core-web-vitals-thresholds): good LCP <=2500 ms, INP <=200 ms and CLS <=0.1; poor LCP >4000 ms, INP >500 ms and CLS >0.25. Values between these boundaries need improvement. Preserve exact inclusivity in tests.
- [CrUX API](https://developer.chrome.com/docs/crux/api): URL and origin are distinct aggregation scopes; absent form factor aggregates devices; collectionPeriod records the measurement period. CLS is a decimal string in native responses. CrUX observations represent the available Chrome population, not every customer.
- [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring): scores vary with conditions and scoring versions; TBT is a scored lab metric, not a measured field INP.

The product's conservative generic rule may differ from provider UI eligibility rules when a metric is absent. Label it `cwv-all-three-v1`, never claim to reproduce Search Console or PSI's overall badge.

## Input, validation and normalization

Implement `scripts/lib/performance-audit.mjs` and separate provider normalizers as needed. `evaluatePerformance(context, inputs)` must re-normalize original artifact bytes, never trust supplied verdicts or previously normalized summaries. Strict envelopes bind source ID, source kind, artifact UTF-8 SHA-256, collection timestamp, customer/entity/environment, expected target and device, assessment time and explicit freshness policy. A hash establishes byte identity, not provider authenticity.

Support native CrUX queryRecord exports and Lighthouse JSON first. Record supplied provenance separately from authenticated connector execution. Native payloads may contain additional provider fields; select only supported fields into the normalized schema, never project arbitrary payload strings into customer HTML. Reject extra envelope fields, unsafe identifiers, unbounded input, malformed dates, nonfinite/negative metrics and contradictory target bindings. No network execution, credentials or imported instructions in this evaluator.

CrUX normalization retains requested identifier, returned identifier, normalization details, form factor (including ALL), collectionPeriod, each available metric's p75 and source digest. URL normalization must be evidenced by the response and restricted to the authorized asset; redirects or origin changes cannot silently change the requested assessment target. Validate real calendar dates, native firstDate <= lastDate, and capture/assessment chronology. The native schema uses lastDate, despite an endDate reference in descriptive prose. CrUX date labels use fixed PST (UTC-8), without daylight saving: the inclusive lastDate completes at 08:00 UTC on the next calendar date. Require this boundary no later than capture; compute expiry from it plus the explicit maximum age. Preserve the original date range and timezone, without presenting the expiry boundary as a measured event timestamp. Downloading old field data today does not refresh it.

Distinguish NOT_FOUND/insufficient data from quota, permission, transport and malformed-response failures. Missing input generates a request. A provider failure does not establish no traffic or good performance. A URL request with only origin data yields an unknown URL check plus a separately labeled origin observation; a directly requested origin assessment may assess that origin. ALL-device data does not satisfy PHONE or DESKTOP. Do not merge percentiles across URLs, periods or devices.

Lighthouse normalization retains requestedUrl, finalDisplayedUrl or version-supported final URL field, fetchTime, lighthouseVersion, runWarnings/runtimeError, configSettings (form factor, throttling method/settings, screen emulation), metric numericValue/numericUnit, performance score and exact raw digest. Normalize only explicitly supported versions/fields; unknown versions or ambiguous final URLs stay unsupported instead of silently using a fallback. Runtime-error runs remain in the accounting but do not become successful measurements.

## Evaluation semantics

Field metric checks use the versioned threshold registry with native units: milliseconds for LCP/INP, unitless CLS. Preserve decimal CLS boundaries without accidental string coercion or rounding before classification. Each check has its own evidence IDs, target, device and period. Missing or stale evidence is unknown; valid failing evidence is not hidden because another metric is absent. Overall all-three check is fail if any valid applicable metric exceeds good, pass only if all three are fresh/applicable/good, otherwise unknown. Metric classification retains good/needs-improvement/poor independently from check pass/fail/unknown.

Conflicting records for the same requested scope and period cannot be chosen by array order or best score. Deduplicate identical source bytes; expose unresolved contradictions as unknown with both sources. Different periods stay separate observations; any selected assessment period must be declared in context. Resolve conflicts per metric before aggregation: conflicting LCP becomes unknown, but an independently valid poor CLS still makes the overall check fail. If the only potentially failing metric is conflicted and the others pass, overall remains unknown. Findings describe observed experience, not root cause; diagnostics become suggestions requiring investigation. Aggregate field failures do not prove every URL or visitor was affected.

Lab results are diagnostics under a distinct namespace. Group repetitions only when target, device, tool version, throttling, emulation and measurement procedure match. Record successful, failed and attempted counts. Report min/median/max and individual values; do not select the best run or average score into field status. Byte digests alone do not establish distinct runs: semantically identical JSON with different formatting is one measurement. Build a semantic measurement identity from provider/run metadata and normalized measurement content, retaining original byte digests as aliases. Require distinct run receipts and timestamps under the declared collector protocol before claiming repetitions; supplied metadata alone is not authenticated execution. Where uniqueness cannot be established, show separate supplied artifacts without a repetition claim. A single run may be shown as a single observation, without stability claims. An initial repeated-run protocol uses at least three sequential runs per group, a product evaluation choice rather than a Google requirement. Missing metadata or mixed configurations prevents pooled statistics. TBT never fills a missing INP. No lab-derived overall CWV pass.

## Canonical report integration

Add `enterprise-performance-workflow.mjs` and a CLI import/evaluate command using the existing immutable fork and revision flow. Validate the whole bundle before any output directory is created. Bind evaluator/rules fingerprints to evidence. Preserve prior evidence and assessment history. Old verdicts remain in the immutable parent: every newer assessment requires fresh current verdicts dated on or after its assessmentAt, even if target content is unchanged. Never copy or retimestamp an old decision to satisfy the new assessment. Do not change the intake module placeholder into a broad pass because a few URLs passed.

P2 checkIdentity hashes module/rule/version/entity/scenario/window. Derive scenarioId deterministically from canonical target kind/value, device and field/lab namespace, using a versioned canonical serialization and digest. Derive windowId from the exact field period or lab protocol/group period. Preserve the human-readable dimensions alongside these identities; test distinct URLs/devices/namespaces within public-site and stable identities under reordered input. Do not encode dimensions only in display labels.

Map evaluated checks into the existing P2 report model, including findings and evidence-bound data requests. Failed metric findings remain pending independent review; no unsupported revenue estimate. Keep observations numeric and scoped; redact raw payloads from customer projections. JSON is canonical; Markdown and HTML must reproduce identical status, period, device, namespace and missing-data semantics. Expired sources cannot silently remain current. No arbitrary score weighting across modules.

Unknown requests specify target URLs/origins, device, period, accepted native JSON, owner, read-only access, freshness and fallback. Request CrUX/PSI field export or a separately supported RUM export for absent field data, and repeated Lighthouse JSON with configuration for lab. RUM ingestion requires its own validated sampling/population contract; it is not implemented by relabeling CrUX. Never ask for passwords/API keys in artifacts.

## Acceptance matrix

| Case                                                             | Required observable outcome                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| No field input, valid Lighthouse 100                             | Field unknown; lab observation retained; precise request     |
| CrUX NOT_FOUND vs quota failure                                  | Distinct reasons; neither becomes pass or zero traffic       |
| URL target, origin-only good data                                | URL unknown; origin separately labeled                       |
| Explicit origin target with matching data                        | Origin-only assessment; no URL-wide conclusion               |
| PHONE requested, ALL or DESKTOP supplied                         | Scope mismatch; no phone pass                                |
| p75 at each good/poor boundary and next representable test value | Exact inclusive/exclusive classification                     |
| LCP good, CLS good, INP absent                                   | Overall unknown; two metric checks retained                  |
| LCP poor, INP absent                                             | Overall fail, missing INP still requested                    |
| New download of old collectionPeriod                             | Stale field remains unknown/current assessment ineligible    |
| Future, impossible or reversed dates; tampered bytes             | Rejected without output                                      |
| Cross-tenant, cross-environment, unauthorized normalized URL     | Rejected without output                                      |
| Contradictory same-scope records in reversed input orders        | Same unknown outcome and conflict evidence                   |
| Identical copies and mixed periods                               | No inflated samples; periods not pooled                      |
| Three comparable lab runs with variance                          | All runs and min/median/max retained, no field claim         |
| Failed lab run plus successful runs                              | Failure denominator visible; no silent discard               |
| Mixed tool/config/device, missing metadata                       | No pooled statistics; exact missing evidence request         |
| TBT available, INP absent                                        | INP stays absent                                             |
| Runtime-error or redirected wrong target                         | No successful target assessment                              |
| Malicious raw strings, unknown envelope keys, oversized payload  | Safe rejection or untrusted provider-field exclusion         |
| Report JSON/Markdown/HTML and expiry/revision                    | Same statuses/scope; parent unchanged; review bindings valid |

Additional regression cases required by independent contract review:

- Reformat one lab JSON three ways: retain byte aliases but count one semantic measurement; no repeated-run claim.
- Put multiple URLs, devices and namespaces under one entity: distinct check IDs, stable under input permutation.
- Conflict LCP while CLS independently fails: overall fail. Conflict the only potentially failing metric with others passing: overall unknown. Repeat both with reversed input order.
- Reassess an unchanged target at a newer assessmentAt: keep old verdict only in parent; require a fresh verdict for current acceptance.

## Execution and independent review

1. Implement normalizers and boundary/adversarial tests with synthetic native exports; retain official schema references and fixtures' synthetic labels.
2. Implement evaluator and integration tests against actual report schema, including immutable negative controls. Add concise linked skill instructions and examples only after workflow runs end to end.
3. Independently review parser/scope/freshness/aggregation and report semantics. Reviewer reproduces failures without modifying implementation; root resolves and reruns affected cases.
4. Collect authorized public lab trials sequentially for all four pilots. Obtain field data through available authorized sources or retain explicit absence; missing credentials must not block lab and other public work. Review real outputs independently.
5. Run repository gates, refresh provenance, freeze a new candidate archive, install extracted archive in fresh projects for both supported hosts, and reproduce positive/negative report workflows. Keep 0.3.11 immutable. Native-host behavior and commercial acceptance remain separate P7 gates.

This contract advances P5 performance only. P3/P4 remaining adapters/scenarios, accessibility, UX/CRO, technical SEO, authorized optimization/retest and commercial multi-industry evaluation remain required by the parent objective.
