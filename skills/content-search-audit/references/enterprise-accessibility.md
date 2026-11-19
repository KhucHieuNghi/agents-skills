# Accessibility evidence and canonical reports

Evaluation capability, not full enterprise acceptance. Read [intake](enterprise-intake.md) and [report workflow](enterprise-report.md). Supplied automated and attributed scenario checks stay separate. Hashes bind bytes; they do not authenticate execution, author identity, independent review or WCAG conformance.

## Offline CLI

Run `node scripts/audit.mjs enterprise-accessibility-evaluate SOURCE EVALUATIONS.json NEW_DIRECTORY`. The command performs no browser/network action. It validates supplied evidence, preserves SOURCE and writes a new immutable source-run revision. Existing output directories are refused. Returned findings/observations are drafts for the report builder; the command does not publish or complete semantic review.

Bundle fields are exactly sourceDigest, newRunId, assessmentAt and evaluations. Each evaluation has evaluationId (unique lowercase ID), kind (`axe` or `scenario`), window `{from,to}`, context and sources. Window is a completed half-open UTC observation window: from < to <= assessmentAt. Native axe timestamps and every scenario attachment/step observation must fit. The run owns customerId and the bundle owns assessmentAt; omit those two fields from entry.context. Entity and required modules must exist in the source run. Maximum 50 new entries, 16 MiB aggregate new source bytes and 32 MiB persisted run.

Use the [synthetic example](../examples/enterprise-accessibility.json): create enterprise-intake from config, load its run with loadEnterpriseRun and compute enterpriseDigest using scripts/lib/enterprise-state.mjs, then combine sourceDigest with the example newRunId/assessmentAt/evaluations. Never treat this synthetic fixture as customer evidence.

IDs are scoped: reuse an evaluationId only for the same kind, target/state/device/protocol, obligations and window. maxAgeSeconds may change as a policy revision. Rule/step array order is canonicalized. Separate IDs cannot divide or overlap obligations for the same population. A different scope/window needs a new ID; prior evidence remains retained. All retained evaluations are rebuilt on each import, including those absent from the new bundle.

## Native axe exports

Axe context contains entityId, environment, targetUrl, stateId, viewport `{width,height}`, maxAgeSeconds (0–31622400) and expectedRuleIds (1–1000 unique IDs). Target is canonical HTTP(S), without credentials/fragment. Source envelope contains sourceId, sourceKind `axe-results`, scope `{customerId,entityId,environment,stateId,viewport}`, capturedAt, artifactText and artifactHash. Hash is exact UTF-8 SHA-256; maximum 8 MiB per artifact. Preserve all four native categories: violations, passes, incomplete, inapplicable. The initial supported native engine is axe-core **4.14.1**; other versions remain unsupported observations.

Native URL and viewport must match the declared context; timestamp <= capturedAt <= assessmentAt. Expiry is exclusive at native timestamp + maxAgeSeconds. Re-exporting old results does not refresh them. Missing/stale/unsupported/inapplicable-only results remain unknown. A rule can appear in multiple categories for different nodes: violation takes precedence within a scan, incomplete remains unknown without a violation, and a pass covers only reported tested elements. Conflicting eligible outcomes or different browser/options populations are not pooled.

Native results do not preserve invocation include/exclude context; toolOptions does not establish effective axe.configure overrides. Full page/state coverage and configuration provenance remain unknown. Request the original invocation scope, effective configuration and targeted manual evidence. Do not infer standard-WCAG coverage from engine version, tags or a supplied declaration.

resultTypes can truncate node counts; report only reported-node counts. Native noHtml may make HTML null and selectors:false may omit targets. Retain missing detail with a request; never invent a selector or element identity. Raw HTML, targets, browser strings and failure text remain private; normalized content uses hashes and bounded identifiers. Empty pass/violation rows, rule errors outside incomplete, disabled-rule contradictions and malformed nested checks reject. Empty native error-incomplete remains unknown.

## Attributed scenarios

Use the [strict scenario format and rule registry](accessibility-scenarios.md). Context declares journey/protocol/version, viewport and required step/state/rule obligations before collection. Sources bind original attachment bytes, chronological steps, typed facts and source author attribution. Facts expire from the earliest supporting attachment and step; a recent interpretation cannot refresh an old screenshot or trace.

Imported authorType human or ai-assisted remains **supplied-attribution**. It never becomes a report reviewer decision. Browser observations can support focus/DOM facts; semantic judgments remain attributed. Missing facts/steps, screen-reader evidence, hidden/responsive states, iframe/shadow coverage and complete journeys generate specific requests. A finite Tab/Escape trace does not prove the absence of every keyboard exit. A visible booking message or analytics event is not an authenticated terminal receipt.

Conflicting current fact values are masked before each source is evaluated separately. A sufficient nonconflicted failure can remain; incomplete sources cannot be combined to manufacture a pass. Browser/assistive-technology/input-mode populations stay separate. Product error-recovery/journey-outcome diagnostics map to ux-cro with no WCAG criterion; expected sandbox/production scope must match the obligation and remains visible in the report.

## Reports and reassessment

Use returned findings/observations with enterprise-report. Preserve valid findings/actions from other modules explicitly. Findings are low-confidence scoped drafts, with unquantified business impact. Every evaluation retains an unknown full-manual-coverage check even when supplied rules pass. Requests name asset/state/device/window, required evidence, owner, least-privilege access and fallback; declined requests retain attribution. Never request passwords/tokens in a report or imply production changes are authorized by an audit request.

JSON is canonical; Markdown and HTML are deterministic projections. Numeric observations count semantic supplied records in their declared historical window, not independent executions, conformance percentages or quality scores. For enterprise-report-revise, retain parent observations and append returned observations, deduplicating unchanged observation IDs; use the verified parent digest and fresh target-bound independent decisions. Never retimestamp old decisions. Original run/report evidence remains immutable.

Indexes and cached summaries do not authorize deletion or verdicts. The workflow reprojects raw sources, checks exact row content/expiry and rejects missing/foreign ownership, paired index/check deletion, rehashed forged rows and superseded rollback pointers before creating output. Integrity validation is separate from semantic acceptance. Final customer use still requires review of findings, coverage, recommendations and residual gaps.

Public collection and interactive testing require their own authorization and safe execution scope. This offline command neither runs journeys nor permits live form submissions, booking/payment, account access or changes. If evidence is unavailable, ask the named owner for scoped exports/manual observations, retain unknown and continue other modules. Native host behavioral trials, public manual coverage and full commercial acceptance remain separate gates.

## Stored replay inventory

`inspectEnterpriseAccessibility` validates all indexed current and historical bases and generated row evidence before exposing record counts and check identities. Unsupported evaluator fingerprints reject explicitly; current code is never relabeled with an arbitrary stored version. Each index retains complete history (maximum 100 prior bases) and a separate activation revision, including same-clock content reuse. Unowned artifacts, missing history, activation predating evidence, changed request descriptors and scope narrowing reject. Request construction and ordering are deterministic across hosts; permitted lifecycle state and refusal reasons remain explicit. Legacy indexes require separate assessment or reviewed migration.

The general stored-report adapter remains development-only. It requires current evaluations at the final run time, retains historical sample counts and emits findings only for actual current failed checks. Original HTML, selectors and scenario attachment bodies remain private. This is not a site-wide WCAG conformity or authenticated execution claim.
