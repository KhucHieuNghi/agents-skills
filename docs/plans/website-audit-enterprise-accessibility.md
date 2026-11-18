# Enterprise accessibility implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. Independent reviewers inspect evidence and findings; root owns implementation. User has authorized autonomous planning, implementation and independent review.

**Goal:** Produce scope-bound automated and manual accessibility evidence, actionable requests and canonical reports without claiming conformance from automation.

**Architecture:** Separate native axe normalization, scenario evidence evaluation and immutable report integration. Keep automated rule results distinct from manual criteria and journey outcomes; raw bytes and original verdicts remain immutable.

**Tech Stack:** Node 22 ES modules, existing P2 report/state helpers, Vitest, Playwright Chromium and isolated axe-core 4.14.1 for native trials.

**Spec:** [Enterprise spec](../specs/website-audit-enterprise.md), [P5 plan](website-audit-enterprise.md).

## Global constraints

Only Codex and Claude Code. No model pin. No automated WCAG conformance claim. Customer JSON/Markdown are canonical/projection evidence; HTML is the human projection. Missing input is unknown with a request, not pass or a defect. No production form submission, purchase, booking or mutation from public audit authorization. Preserve candidate 0.3.12 until the next fully checked package freeze.

## Verified semantics and scope

Sources verified 2026-11-19: [W3C evaluation](https://www.w3.org/WAI/test-evaluate/), [keyboard trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html), [error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [focus obscuration](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [native axe 4.14.1 API](https://github.com/dequelabs/axe-core/blob/v4.14.1/doc/API.md). Existing pilot evidence records 4.14.1; earlier README prose naming 4.14.0 was incorrect.

axe results may place the same rule in multiple categories for different nodes. Do not reject this as a rule-level contradiction. Rule outcomes are node-specific: violation takes precedence over incomplete, then passes; inapplicable alone does not prove criterion coverage. A hidden dialog is not covered until activated and scanned. Filtered resultTypes can truncate node inventories; do not claim exact affected-element totals. Rules disabled/excluded or absent from output remain unknown. Duplicate source bytes or semantic replay never add independent samples. Supplied results are attributed evidence, not authenticated scanner execution.

Modal focus containment is not automatically a keyboard trap: check a usable exit route. Error identification and recovery are separate from whether submit succeeds. Focus not obscured minimum differs from full visibility and from visible focus styling. A disabled/failed backend cannot be called a confirmed successful booking because a button was clicked or an event fired. Manual verdicts require source attribution and criterion/step binding; an imported declaration of reviewer identity is not live host authority.

## Review focus

- Result filtering/custom configuration hides failures: task 1 retains options/scope and only labels reported automated outcomes.
- Same rule appears in violations and passes for different elements: task 1 preserves categories and does not inflate or erase failures.
- Correct modal focus loop mistaken for a trap: task 2 requires exit-path evidence and tests standard escape and documented alternatives.
- Cross-origin iframe, hidden state or responsive variant absent: tasks 1/3 retain explicit coverage gaps and request exact missing state.
- Stale/rehashed cache or copied review timestamp: task 3 recomputes raw evidence and requires fresh decisions in a new assessment.

## Task 1 — native axe foundation

Create scripts/enterprise-accessibility/axe.mjs and tests/content-audit-accessibility.test.ts; keep outside the released package until workflow review. Interface normalizeAxe(input, context) returns sourceId/artifactHash/engineVersion, observedAt/validUntil/eligible, scopeDigest, optionsDigest, categories and rule summaries; no findings or conformance verdict. evaluateAxe(context, inputs) returns records, rule checks and data requests, conformanceAssessed false and executionAuthenticated false.

Context fields: customerId, entityId, environment, targetUrl (canonical HTTP URL without credentials/fragment), stateId, viewport {width,height}, assessmentAt, maxAgeSeconds (0–31622400), expectedRuleIds (nonempty unique bounded IDs). Source envelope: sourceId, sourceKind `axe-results`, scope {customerId,entityId,environment,stateId,viewport}, capturedAt, artifactText, artifactHash. Exact UTF-8 SHA-256; 8 MiB/source, at most 100 sources and 16 MiB aggregate. Result native URL must match exact target; timestamp <= capture <= assessment; expiry exclusively timestamp+age. Supported engine name axe-core and version 4.14.1 only; unknown version retained unsupported with no assessed outcomes. Native viewport must match context.

Strict envelope/context keys; native extra fields allowed but never projected. Parse bounded JSON (depth40, 200000 values); validate four result arrays, bounded rule IDs/tags, nodes and nested selector shape. Validate nested check objects and reject contradictory rule errors outside incomplete or disabled rules present in results. Native noHtml may set HTML null and selectors:false may omit target; retain null detail digests with a specific request. Retain node target and HTML as digests only, raw text privately; do not render raw help, selectors, HTML or failureSummary. Keep category-specific node counts explicitly as reported counts. Reject empty asserted pass/violation node lists; incomplete with a native rule error may have zero nodes and remains unknown, as does inapplicable. Do not derive WCAG criterion from arbitrary tag syntax; task2 owns a reviewed registry. Native toolOptions and browser metadata contribute scope/config fingerprints, not execution authority. Actual native trial shows include/exclude context is absent from AxeResults; therefore every imported result is limited to reported-tested-elements. Full state/page coverage remains unknown, including when all expected rules report pass. Request original invocation context/configuration and collector-bound coverage evidence; supplied context declarations cannot authenticate it. Different configuration/browser fingerprints are never pooled. axe.configure overrides are not fully represented in toolOptions; configurationProvenance remains unknown in offline imports. Neither an engine version nor a supplied declaration establishes default rule behavior or WCAG criterion coverage.

For each expected rule: fresh supported violations produce a scoped automated fail; incomplete without violation unknown; passes without violation/incomplete produce only a reported-tested-elements automated pass; inapplicable-only or absent unknown. Across nonidentical same-scope records with differing outcomes, unknown with all source IDs; do not choose best or latest silently. Freshness is per record. Missing/stale/unsupported results generate requests naming URL/state/viewport/expected rules, full native export, owner and fallback. Every rule retains all categories; no site/criterion aggregate score or conformance pass.

- [x] Write tests: violation+pass same rule remains fail; incomplete+pass unknown; no records/empty arrays/inapplicable unknown; only reported pass yields scoped pass; conflicting order invariant; byte aliases not extra samples; exact expiry unknown; wrong tenant/URL/state/viewport/hash/future times rejected; raw injected strings excluded; unsupported version no pass; omitted result category rejected.
- [x] Run focused suite and observe missing implementation fail.
- [x] Implement normalizer/evaluator with explicit limits and source binding.
- [x] Run synthetic cases and actual loopback Chromium/axe 4.14.1 exports for clean/defective/filtered/mixed-node fixtures. Record actual tool version, config and hashes; never relabel old summarized pilot exports as native axe JSON.
- [x] Independent review, resolve findings and commit tested foundation.

## Task 2 — manual scenarios and journeys

Create scripts/enterprise-accessibility/scenarios.mjs, tests/content-audit-accessibility-scenarios.test.ts and tests/browser/enterprise-accessibility.mjs. Interface evaluateAccessibilityScenarios(context, sources) returns criterion-bound draft checks, evidence and requests. Bind customer/entity/environment, URL/state/viewport, browser/assistive technology, protocol/version, steps, observed focus/visibility/error facts and attributed reviewer. Registry separates keyboard access/escape, focus order/visibility/obscuration, error identification/recovery, dialog labeling and multistep journey coverage. Full manual assessment is never inferred from six Tab presses or zero axe violations.

- [ ] Define exact trace schema and reviewed criterion registry before implementation, including invalid/incomplete trace behavior and human-versus-AI attribution.
- [ ] Red/green tests: true trap versus escapable modal; obscured focus versus partial visibility; failed invalid-submit without text versus accessible errors; zoom/reflow overflow; unvisited journey states; iframe/shadow gaps; no screen-reader evidence; two viewport populations kept separate.
- [ ] Execute sandbox-only browser fixtures for keyboard, dialog, error recovery and failed booking. No live transactions.
- [ ] Independently review scenario facts and criterion mapping; explicitly retain unknown expert assessment where automation cannot decide.

## Task 3 — immutable reports, public pilots and package

Create scripts/enterprise-accessibility/workflow.mjs, tests/content-audit-accessibility-workflow.test.ts, then move reviewed modules into packaged scripts/lib. Reuse forkEnterpriseEvidenceRun and P2 report APIs; validate all persisted ownership indexes against original evidence before replacing checks. Add enterprise-accessibility-evaluate CLI and linked instructions/examples only after workflow round-trip. P2 scenarioId hashes automated/manual namespace, customer/environment, exact URL, state, viewport, scan scope and configuration provenance, effective configuration/protocol digest and criterion version where applicable. windowId binds the declared observation window; ruleVersion binds evaluator/registry policy. Test sibling states/viewports and manual/automated checks under one entity, stable IDs under input permutation, and invalidation on scope/configuration changes; the development helper identity is not a final P2 check identity.

- [ ] Red/green tests for canonical JSON/Markdown/HTML equality, context/criterion labels, raw PII exclusion, preserved manual gaps, expired observations, source/config changes, cross-tenant rejection, forged indexes, unrelated checks, unchanged source re-evaluation and old verdict timestamps.
- [ ] Preserve parent snapshots; use fresh review decisions for new assessments. Distinguish automated candidate findings from independently confirmed findings and manual criteria.
- [ ] Run approved public read-only capture for four pilots where feasible; interaction journeys require separate safe scope. Request missing owner/manual evidence and continue other modules.
- [ ] Independent parser, semantic report and package reviews; root resolves findings. Run required repository checks, refresh provenance, freeze a new candidate, extract and install both hosts and repeat positive/negative report workflows.

This plan does not close remaining technical SEO, UX experiment evaluation, performance field acquisition, provider adapters, P6 optimization or P7 commercial evaluation. These stay in the parent plan.
