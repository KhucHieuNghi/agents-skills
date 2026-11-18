# Enterprise technical SEO implementation plan

> For agentic workers: use `superpowers:executing-plans` for implementation; the user authorizes autonomous implementation and independent review.

**Goal:** assess observed technical search signals with reproducible evidence, scoped coverage and actionable unknowns; never infer search-engine indexing from local markup.

**Architecture:** immutable supplied captures and read-only collectors feed versioned evaluators, then the existing enterprise report workflow. Keep observation, owner intent and provider-selected state separate. Development modules remain outside the released package until native fixtures, integration and packaging gates pass.

**Tech stack:** Node ESM, Vitest, existing Playwright Chromium; no new runtime dependency.

**Spec:** [enterprise specification](../specs/website-audit-enterprise.md), P5 in [roadmap](website-audit-enterprise.md).

## Constraints and review focus

- Only Codex/Claude Code; no source payload instruction execution, arbitrary fetching or production mutations.
- Explicit customer/entity/environment/URL/browser profile/state scope, source byte hash and exclusive expiry. Supplied metadata is attribution, not authenticated collection.
- Source HTML, rendered DOM, response headers, robots policy, sitemap, crawl graph and provider indexing are distinct evidence channels. Do not pool different page states or captures to manufacture consistency.
- Missing canonical is not automatically an SEO failure. Cross-domain canonical is not automatically wrong. Compare intended target only when explicitly supplied.
- Full current-layer inspection is required for a consistency pass; observed conflict inside one fresh capture can establish a bounded failure even if other layers are missing. Contradictory repeated captures cannot silently become a stable verdict.
- URL identity preserves query order, query values, path case and trailing slash. Fragments and credentials cannot silently disappear. No source strings become report HTML.
- Sample coverage is not a site-wide denominator. HTTP 200 and metadata presence do not establish indexing, ranking, AI visibility or meaningful page content.

## Task 1 — canonical signal evaluator

Files: `scripts/enterprise-technical-seo/canonical.mjs`, `scripts/enterprise-technical-seo/strict-json.mjs`, `tests/content-audit-canonical.test.ts`, development README and review dossier.

Interface: `evaluateCanonicalCapture(context, source) -> {scope, sourceId, artifactHash, capturedAt, validUntil, checks, dataRequests, indexingStatus, googleSelectedCanonical, executionAuthenticated, semanticAcceptance}`. No IO. Context exact keys: customerId/entityId/environment/targetUrl/profileId/stateId/assessmentAt/maxAgeSeconds/expectedCanonical. Source exact keys: sourceId/artifactText/artifactHash. JSON artifact version 1 contains exact context scope, capturedAt, and layers. Each of the three required layer keys (`sourceHead`, `renderedHead`, `httpLink`) has `{complete, targets}`; targets are already DOM/header-resolved absolute HTTP(S) URL strings. This is an explicit supplied-projection contract, not a native HTML/header parser or proof that targets derive from source bytes. Each array is bounded to 100 items. Missing layers use complete=false and targets=[]. Invalid/fragment targets are preserved as a bounded finding; credential-bearing/non-HTTP targets are rejected. Expected canonical is null or a valid fragment-free HTTP(S) URL.

Checks: canonical-target-format (fragment support), canonical-consistency (unique target across observed layers), canonical-owner-intent (comparison to supplied preferred URL). Complete clean layers with one target pass consistency; all absent remains unknown, not fail. Intent can pass only when all layers complete and one matching target; an observed mismatch fails. Missing intent is unknown. Missingness produces precise evidence requests. No indexing/Google-selected canonical value is inferred.

- [x] Write failing tests for matching complete layers, missing/partial, cross-layer and within-layer conflict, owner mismatch, JavaScript-only insertion, cross-domain intent, fragments, exact expiry/future time, wrong customer/profile, hash mismatch, unsupported fields/version, malformed dates and bounded inputs.
- [x] Implement strict validation and deterministic versioned checks; prove red-to-green.
- [x] Independent review, adversarial regression fixes and repository checks. Keep the original package/archives immutable.

## Task 2 — native acquisition and graph evidence

- [ ] Add `scripts/enterprise-technical-seo/collector.mjs` and `tests/browser/enterprise-technical-seo.mjs`: use browser DOMParser for inert raw response parsing, rendered DOM at a declared readiness condition, final navigation response headers and redirect chain. Record raw bytes, response/DOM hashes, document base URL, browser identity, state and timestamps. Parse Link syntax separately; unsupported anchors/parameters and malformed syntax keep that layer incomplete.
- [ ] Native fixtures: relative base, script-updated canonical, script-only canonical, head/body/template placement, header conflict, malformed Link, redirect-to-login, aborted response, changed DOM URL and distinct mobile state. No arbitrary target execution from imported evidence.
- [ ] Add crawl frontier/limits, normalized exact URL identity, source-versus-rendered links, duplicate edge collapse and explicit sampled template strata. Reuse reviewed robots/scheduler/discovery code after semantic compatibility review.

### Task 2a — HTTP canonical Link projection

`parseCanonicalLinkHeaders(values, responseUrl)` in `scripts/enterprise-technical-seo/link-header.mjs` consumes all supplied Link field values and the final response URL. It returns `{complete, targets, pending}` with bounded, sanitized diagnostics. No fetching. Empty field sets are complete empty observations only when the caller actually collected the whole header set. Resolve relative targets against the response URL, never HTML base. Handle angle brackets, quoted commas/escapes, case-insensitive parameter/relation names, multiple fields and relation tokens. Extension relation URIs are explicitly unsupported in this first canonical-specific profile. Unsupported context/attributes, duplicate parameters or malformed syntax prevent a completeness pass and exclude that ambiguous link/field. Other independently valid fields remain available as positive observations. This conservative product policy is not a general RFC parser compliance claim. Tests cover these branches, invalid URI bytes, credential targets, input budgets and error privacy.

### Task 2b — native DOM projection fixtures

`projectCanonicalDocument({sourceHtml, responseUrl})` in `scripts/enterprise-technical-seo/document.mjs` is serializable for Playwright evaluation. Null sourceHtml reads the live document; a string uses DOMParser in a separate blank context whose network is denied. Result retains document URL/base, bounded serialized DOM, targets/complete/pending and observedAt. Source noscript stays incomplete because inert parser scripting mode differs; template/body/non-HTML links are not head canonical declarations. Unsupported canonical modifiers, missing href, invalid base/target and limits remain explicit. Rendered URL mismatch discards that layer's targets. `projectRenderedCanonical(page, responseUrl)` executes the rendered projection in a fresh Chromium CDP isolated world, verifies a stable frame/loader/URL and detaches its session. Direct main-world evaluation is forbidden for rendered evidence because page scripts can replace intrinsics. The host owns authorization, navigation, timing, parser isolation, response binding and private artifact storage; this projector never grants those permissions.

`tests/browser/enterprise-technical-seo.mjs NEW_OUTPUT` uses only loopback fixture pages. It saves body, serialized DOM, response headers, projection/evaluation and hashes in a new immutable output directory. It records redirects and rejects response URL mismatch from the original page scope. The fixtures cover base/JS/header/template/body/UTF-8/redirect/error/navigation cases and a mobile variation. It is not yet the production collector: the latter still needs existing authorization/proxy integration, navigation-instance binding, resource limits and timeout handling.

### Task 2c — navigation-instance binding

`observeCanonicalNavigation(page, {maxBodyBytes, maxDocumentRequests, timeoutMs})` in `scripts/enterprise-technical-seo/navigation.mjs` attaches before host-authorized navigation, enables CDP Network buffering and returns host-only `{snapshot, close}` operations. It never navigates or grants authorization. Document events are bound to main frame, loader and request ID; redirect hops are retained with the same request ID, and loading failure/incomplete responses do not become captured bodies. Snapshot selects a unique completed response for the current frame/loader/URL, retrieves its body by request ID, and rejects any navigation change during retrieval. Body and metadata budgets fail closed. Returned native body representation is CDP-decoded, not guaranteed original wire bytes. Protocol diagnostics are sanitized; raw headers/body stay private. Every observer protocol call, session creation and detach has a host-supplied 100–60,000 ms deadline; a snapshot has at most three sequential protocol calls plus cleanup. Timed-out snapshots return unknown and close observation; late-created sessions receive bounded cleanup. A production collector still needs transport authorization and a total collection deadline, including DOM projection.

Tests: capture unique current loader, reject same-URL old loader, subframe/unmatched/incomplete/failed response, ambiguous response, body size and navigation race, sanitized failure and closed observer; native same-URL reload, final redirect and aborted document. Combine DOM and response only if binding tuples match. Source body decoding and canonical checks remain separate.

### Task 2d — authorized read-only collector

`collectCanonicalReadOnly(plan, host, adapters?)` in `scripts/enterprise-technical-seo/collector.mjs` composes the existing network proxy, authorization gate, navigation observer and isolated DOM reader. Plan has exact URL/authorizationRef/observeMs/timeoutMs/maxBytes/maxRequests. Host supplies Chromium, synthetic flag, allowedOrigins, context with trustedAuthorizations, and profile `{id,width,height}`. Derive scope from trusted context (customerId, assetId as entityId, environment, identityId as stateId); never take scope or grant bodies from page/imported data. Copy plan/profile, pin context identity and approved origins, and recheck live revocation/expiry before each request and result acceptance.

Only GET/HEAD are permitted. Block service workers, WebSockets, popups/downloads and non-approved origins. Reuse public-address/DNS-pinned proxy rather than create a second transport policy. A single total deadline covers startup/navigation/observation/capture; separate bounded cleanup closes owned browser/proxy. No credentials persist. Timeout/capture failure yields unknown with sanitized reason and no partial private artifact claimed as complete. Disruptive blocked requests discard rendered targets; source/header observations remain scoped to the acquired response. Redirect/non-200 response cannot assess the initial page scope. Return a version-1 supplied capture plus private native evidence, never an execution authorization or semantic acceptance grant.

Tests: native authorized capture, POST/private-origin block, wrong/missing authorization causes no launch/network, revoked/expired context, attempted scope injection, hung page/deadline, bound final response and cleanup. Real-site pilot and package/review gates remain separate.

## Task 3 — remaining technical rules and provider contrast

- [ ] Add versioned robots/noindex/reachability rules, distinguishing crawler allowance from index eligibility and observed provider index state; raw noindex later removed by JavaScript cannot become an unconditional indexability pass.
- [ ] Add hreflang reciprocal/self/target checks with incomplete target graphs remaining unknown; language validity and content equivalence are separately scoped.
- [ ] Add structured-data syntax/type requirements with no rich-result guarantee; canonical-target status/noindex/redirect checks require separately scoped target captures.
- [ ] Add GSC URL Inspection adapter preserving inspection time, property, user-declared versus Google-selected canonical and returned coverage. Never treat local Chromium as Google's rendered result.

## Task 4 — enterprise integration, real pilots and release

- [ ] Add `enterprise-technical-seo-workflow.mjs`: immutable source-run ownership, raw revalidation and evaluator fingerprints, retained evaluations rebuilt at reassessment, scoped requests, checks and draft findings. Tests for cache/index deletion, stale grants, foreign evidence and report revisions.
- [ ] Exercise real authorized four-site pilot samples, request site intent and unavailable provider evidence, publish sanitized JSON/Markdown/HTML from one revision and independent review all material claims.
- [ ] Package CLI/references/example, update provenance/component lock with new candidate version, extract/install fresh projects for both hosts, run full repository and browser checks. This does not close broader P3–P7 commercial gates.

## Source basis verified 2026-11-19

- [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): canonical declarations are signals, not required for every page; inconsistent targets and fragments require care.
- [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): separate initial markup and rendered signals; JavaScript-only canonical is possible.
- [Robots meta directives](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): directive scope and crawl visibility.
- [Localized versions](https://developers.google.com/search/docs/crawling-indexing/localized-versions): alternate language relationships.
- [Canonical troubleshooting](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting): compare declared intent with provider-selected state.

This plan's predicates are product engineering decisions informed by the linked documentation; no upstream implementation code is copied.

HTTP Link parser source basis: [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html), sections 3.1–3.4. The implementation is original, not copied from the RFC parsing algorithm.

### Task 4 progress — supplied canonical report integration

Development `scripts/enterprise-technical-seo/workflow.mjs` now projects immutable canonical evaluations through enterprise reporting, including retained replay and per-revision ownership. See [workflow review and remaining gates](../research/website-audit-enterprise-canonical-workflow-review.md). Four historical real-site report replays and eight offline viewport checks are complete. Task 4 remains open for complete technical-rule coverage, packaging, installed-host checks and commercial acceptance.

### Task 3 provider progress — URL Inspection

`url-inspection.mjs` and the development workflow now support supplied original URL Inspection responses with exact property/request scope, receipt freshness, provider crawl timestamps and owner-intent comparison. [Review and connected-data trial](../research/website-audit-enterprise-url-inspection-review.md) records two independent findings fixed with regressions. Native customer execution, cross-capture temporal contrast, full technical rules and installed release gates remain open.

### Task 3 index-control progress

Development `index-controls.mjs` now evaluates supplied Googlebot robots/page directives and exact HTTP status against owner intent, with full-document source/rendered projection and ten native Chromium fixtures. The enterprise workflow supports `index-controls` entries with separate page/robots expiry and observation-window validation. [Review and limits](../research/website-audit-enterprise-index-controls-review.md) documents regressions and open public-collector/package gates. This does not complete the entire technical rule set.

### Task 2/4 index collector progress

Authorized index-control acquisition now composes robots retrieval, per-resource collection gates, response-completion pacing, native full-document projections and enterprise reports. [Collector review](../research/website-audit-enterprise-index-collector-review.md) records independent pacing regression, fourteen new native cases, preserved canonical regression and eight final real-site captures. Cross-origin policy support, complete rendered pilots and packaging remain open.

### Task 3 hreflang topology progress

Development `scripts/enterprise-technical-seo/hreflang-graph.mjs` evaluates a single selected method and root URL using supplied bounded page projections. Self-reference and reciprocal edges preserve unknown for missing/expired/incomplete evidence. Fresh observed missing return links fail only with complete target enumeration. Reciprocal subsets do not require a global identical clique. Language registry validation, per-language mapping conflicts, content equivalence, target indexability, authenticated acquisition and enterprise evidence-envelope integration remain open; this primitive cannot close the hreflang task or justify a commercial release.

Ruling: implement graph topology as a separate pure primitive before the scoped evidence adapter, so a topology pass cannot be mistaken for language validity or search-engine acceptance. The cost is that report integration and remaining hreflang checks must still be implemented and reviewed. Google methodology: https://developers.google.com/search/docs/specialty/international/localized-versions (reviewed 2026-11-19).

Initial verification: 14 focused tests passed after the missing-module red baseline. Cases cover cross-domain pairs, optional x-default, reciprocal subsets, root/target coverage, exclusive expiration, exact path/query identity, malformed inputs, duplicate pages and unsafe URLs. Independent review and repository checks are recorded in the subsequent progress entry.

Independent topology review found a self-only declaration returned unknown without a recovery request. A regression reproduced the failure, then passed after adding an explicit request for alternate URLs or confirmation that there are no alternate versions. No multilingual requirement is inferred. Focused suite now has 15 passing cases. This remains a development primitive; no release manifest or customer reports have been changed.

Repository verification after the fix: 105 test files / 1,111 tests passed (single worker); lint, typecheck, build, format check and diff whitespace checks passed. No full hreflang acceptance is claimed: the remaining work above stays open.

### Task 3 hreflang language and mapping progress

The development graph now separately reports root language form/registry validity and conflicting per-language URL mappings. Case-only differences are equivalent; several labels can intentionally map to one URL. Incomplete enumeration cannot establish a clean language/mapping pass, and expired declarations cannot produce live findings. Bounded malformed labels are evaluated rather than discarded. Deprecated/exceptional subtags generate an explicit review request. Content language and equivalence remain unknown.

The factual IANA subset in `scripts/enterprise-technical-seo/language-registry.json` records the source URL, registry File-Date and SHA-256 of the full source bytes. It contains two-letter language/region and four-letter script subtags plus deprecated subsets; no descriptions or upstream implementation were copied. It is a reviewed development snapshot, not a runtime network dependency. A code-form pass means registered subtags in Google's documented form; it does not verify that the page serves that language or that Google accepted it. Exceptional/private region codes remain unknown; EU/UN/UK are specifically flagged as ignored region targeting, without claiming the language portion itself is ignored.

Independent review downloaded the official registry and reproduced the hash and all extracted sets. Classifier review found no blocking issue. Suggested maintenance improvement: retain a deterministic extraction/verifier tool before future registry pin updates; the snapshot must not be updated automatically.

Integration review found no additional blocking findings in the declared root-only scope; 51 focused tests passed independently. Repository verification: 106 test files / 1,147 tests passed, plus lint, typecheck, build, format and whitespace checks. The classifier/mapping work does not close target eligibility, cross-page semantic consistency, native acquisition or report-envelope integration.

### Task 4 hreflang evidence/report integration

Added a strict supplied `hreflang-capture-v1` adapter with exact customer/entity/environment/URL/profile/state/method binding, SHA-256, duplicate-key rejection and a 1 MiB artifact limit. Development workflow fingerprints the adapter, graph, classifier and pinned registry; every page timestamp must fit the declared observation window. The standalone adapter keeps missing-root unknown, while the report workflow requires an observed root. Immutable replay reassesses expiry and preserves report privacy.

Independent review found a P2 recovery gap: missing-target requests lost their target identity/reason at report projection. A regression failed, then passed after including fixed reasons plus source ID and original artifact JSON locator in requestedArtifact. Raw alternate paths/query values remain private. Locator regression includes duplicate/self declarations and a nonzero root page index. No other blocking findings were reported.

This advances supplied-evidence report integration; native hreflang acquisition, target eligibility, cross-page semantic mapping, content equivalence, complete pilots and release gates remain open. No source execution authentication is claimed.

Verification after the recovery fix: 107 test files / 1,163 tests passed; lint, typecheck, build, formatting and staged whitespace checks passed. Report tests cover JSON/Markdown/HTML save/load integrity, private alternate non-disclosure, actionable source locators, target-window rejection and retained expiry reassessment. No native browser capture or installed release acceptance is implied.

### Task 2 hreflang native projection progress

Added separate source-document and Chromium isolated-world rendered projections for HTML hreflang. Only HTML-namespace links in the document head qualify. Relative/protocol-relative targets are not repaired via baseURI; unsupported modifiers, misplaced declarations and target/size limits mark coverage incomplete. Bounded malformed language strings remain available to the language evaluator. Duplicate declarations preserve original order. Source noscript ambiguity stays incomplete; source and rendered states are not pooled.

Initial native cohort `build/enterprise-hreflang-native-001` passed 15 fixture cases covering source/rendered JS changes, tampered page globals, body/template/foreign elements, duplicates, unsupported URLs/modifiers and count bounds. Rendered captures bind stable frame/loader/URL and use a fresh isolated world. The caller still owns navigation authority, response-instance binding and a total deadline; this helper is not a network-authorized collector. HTTP Link/sitemap collection and authorized graph expansion remain open.

Independent reviewer reran all 15 Chromium cases at `build/enterprise-hreflang-independent-review-001` with no blocking finding in projection scope. Five additional mocked CDP tests verify discarding results when frame ID, loader ID, URL or fragment changes, plus sanitized protocol failures. These tests verify the comparison path; they do not claim a real browser navigation-race reproduction. Raw HTML remains private evidence, and projection completeness is not semantic acceptance or source-markup conformance.

Repository verification: full pre-existing suite 107 files / 1,163 tests passed; the subsequently added collector test file passed all 5 cases separately. Lint (including new file), typecheck, build, format and staged whitespace checks passed. No release archives/manifests changed.

### Task 2 hreflang authorized root collector

`collectHreflangReadOnly` uses the shared trusted authorization, pinned transport, robots policy, serialized crawl-delay, resource budget, cancellation and cleanup core. It emits two separate root-only source envelopes (`html-source` / `html-rendered`) without following alternates. Non-200, redirected scope or missing navigation binding returns no hreflang artifact; disrupted rendered environments discard rendered declarations. Source and rendered capture timestamps remain separate.

Native cohort `build/enterprise-hreflang-collector-002` passed 8 cases including robots denial/unavailability, forbidden POST, forged authorization, non-200, crawl-delay budget and deadline. Initial 001 stopped on a test expectation error: forged authorization correctly throws before collection, rather than returning unknown. Regression cohorts index-collector-009 (14 cases) and canonical-collector-011 (9 cases) passed. Added hreflang-specific no-network preflight/private-DNS/revoked-DNS coverage.

Independent collector review found no blocking implementation issue and reran 8 native cases. Follow-up coverage now explicitly asserts no plural sources on DNS/revocation failure and adds native redirected-scope rejection: final hreflang-collector-003 has 9 passing cases. The four-site root pilot is recorded in [sanitized hreflang dossier](../research/enterprise-public-pilot-20261118/hreflang/README.md): 8 captures, 16 method evaluations, 6 pass / 58 unknown / zero fail. Complete target graphs and native HTTP Link/sitemap methods remain open.

Repository checks: 108 files / 1,170 tests passed; latest collector and documentation checks passed separately after new dossier staging. Lint, typecheck, build, format and whitespace checks passed. No package/release manifests were changed.

### Task 2/4 multi-page hreflang evidence assembly

`assembleHreflangCaptures` creates a version-2 envelope that retains original version-1 single-page source bytes and hashes. Every component is independently revalidated against the same customer/entity/environment/profile/state/method; only the exact root and its declared direct alternate targets are permitted. Duplicate page URLs, unrelated pages, missing root, nested graphs and component page/scope mismatch are rejected. Original timestamps govern freshness. One MiB outer envelope and existing parser/page budgets remain enforced.

The report workflow accepts v2 envelopes, retains original components privately and rebuilds evaluations on replay. Recovery requests use the original component index plus parsed artifact JSON path. Tests cover retained replay, report privacy and accepted input formats. Independent review passed 43 envelope/workflow tests and a reordered-component/stale-target probe with no blocking findings. This is offline assembly integrity, not authorization of acquisition, cross-page language semantics or target indexability.

Native collector cohort 004 passed 10 cases, including separately authorized root/target collection and reordered assembly for both HTML methods. Added pre-serialization count/aggregate-byte limits. Final fixed-tree verification: 108 files / 1,182 tests passed; lint, typecheck, build, formatting and whitespace checks passed. An earlier concurrent verification run loaded the old module before the new byte-budget test was added and failed that assertion; the complete suite was rerun after edits stopped.

### Task 3 shared-language declaration consistency

Added a separate root-to-direct-target shared-label mapping check. It compares sets of URLs for supported normalized labels so duplicate declarations cannot hide a conflict through ordering. Different language subsets alone do not fail. Incomplete or stale evidence cannot establish clean agreement; observed fresh supported-label contradictions can establish a bounded failure. Unsupported/deprecated codes are not used as semantic conflict evidence.

The new check projects separately through report workflow and remains distinct from reciprocity, root code validity and actual content language/equivalence. Tests reproduce all six initial unsupported behaviors, then cover independent report finding, private URL non-disclosure and recovery requests. Original published pilot snapshots remain immutable; their earlier four-check-per-method counts do not include this newly added rule.

Independent review found no blocking issue and verified 72 focused tests plus deprecated/exceptional/invalid-code probes. A subsequent workflow case proves shared-label contradictions produce a separate finding while return links still pass, without leaking private alternate URLs. Native cohort 005 passed 10 cases. Final repository checks: 108 files / 1,189 tests passed, plus lint/typecheck/build/format/whitespace checks. No release manifests changed.

### Task 3/4 declared-target control joins

Development `target-controls.mjs` joins a scoped canonical or hreflang declaration with independently hashed/scoped index-control captures for declared targets only. Each target has separate observed criteria: direct HTTP200 response, Googlebot robots allowance and noindex absence across complete inspected layers. A condition pass is not an indexability, actual crawling, content-equivalence or provider-index verdict. Missing controls remain unknown; expired declarations invalidate target conclusions; page and robots expiry remain independent. Source noindex remains relevant after rendered removal. A redirect/final-URL mismatch fails only the explicit direct-response criterion while directive attribution remains unknown.

The development report workflow adds kind `declared-target-controls`, fingerprints the join implementation, verifies all supplied declaration/page/robots observation times against the window and preserves retained replay. Each check includes an opaque target reference and original private declaration JSON locator, keeping raw target URLs out of the customer report.

Independent review found two P2 issues: native malformed-URL errors exposed raw input properties, and known target outcomes lacked an actionable locator. The malformed-input regression reproduced the leak before a fixed-error wrapper; report tests now verify known noindex failures retain original source locators without raw URLs. Scope, freshness and independent-condition semantics otherwise passed review.

Methodology follows [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), reviewed 2026-11-19, with explicit local observation criteria rather than inferred Google-selected canonical or indexed state. Live target sampling, soft-404/content verification, structured-data rules and full commercial gates remain open.

Final validation: native cohort `build/enterprise-hreflang-collector-006` passed 11 cases, including real local-browser collection of separate hreflang/index-control sources and six independent target conditions with provider index state still unknown. Full repository suite: 109 files / 1,208 tests passed; lint, typecheck, build, formatting and whitespace checks passed. No release/package changes or public-site target-condition findings were asserted in this increment.

### Task 4 real target-control appendices

[Four-site target-control dossier](../research/enterprise-public-pilot-20261118/target-controls/README.md) contains new JSON/Markdown/HTML appendices and integrity manifests. Eight retained homepage/profile declarations produced sixteen method-specific evaluations; only QuokkaGuide source projections supplied observed targets, so two fresh same-origin desktop/mobile target-control captures were collected. Twenty condition checks yielded four pass and sixteen unknown, zero failures. Added provider-state placeholders bring new report checks to 36; with 40 intake placeholders there are 76 total checks (4 pass, 72 unknown).

Noindex absence remains unknown because rendered coverage is incomplete. No target discovery is inferred from absent/incomplete declarations, and no cross-origin expansion or website writes occurred. Eight offline customer report viewport checks passed. Raw capture bodies/headers and source runs remain private. The initial 9 findings and prior snapshots remain unchanged.

Independent evidence review verified all private/nested hashes, sixteen evaluator replays, four manifests/projections and no raw-payload leakage; original pilot reports remain unchanged. Full repository validation after dossier staging: 109 files / 1,208 tests passed, plus lint/typecheck/build/format/whitespace checks. The appended review record is separate from the reports' pending acceptance status.
