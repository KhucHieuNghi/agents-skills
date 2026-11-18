# Enterprise technical SEO implementation plan

> For agentic workers: use `superpowers:executing-plans` for implementation; the user authorizes autonomous implementation and independent review.

**Goal:** assess observed technical search signals with reproducible evidence, scoped coverage and actionable unknowns; never infer search-engine indexing from local markup.

**Architecture:** immutable supplied captures and read-only collectors feed versioned evaluators, then the existing enterprise report workflow. Keep observation, owner intent and provider-selected state separate. Development modules remain outside the released package until native fixtures, integration and packaging gates pass.

**Tech stack:** Node ESM, Vitest, existing Playwright Chromium; original stages used no new runtime dependency. The later offline-expansion stage adds an explicitly pinned development processor as documented below.

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

### Task 3 structured-data syntax and native projection foundation

Added bounded inline JSON-LD syntax/root-shape inspection and conservative schema.org type-term extraction. Type terms are observations, not vocabulary-membership or rich-result validity. Unsupported/remote contexts are opaque and never fetched; duplicate members/parser-budget overflow remain unknown rather than silently overwriting values. Inline vocab prefixes require the trailing slash, value-object datatypes are not entity types, and traversal does not cross unresolved properties/keyword/context boundaries.

Independent review found three blocking correctness gaps in initial type extraction (vocab concatenation, value datatypes, ignored/unresolved-property traversal). Five regression cases reproduced the failures; the fixed focused suite has 23 passing cases. Unsupported semantics stay unknown pending a separately scoped standards processor.

Native source/rendered helpers inspect head/body HTML-namespace inline scripts separately, exclude template content, bound UTF-8 block/total bytes and counts, and keep external scripts/media-parameter ambiguity incomplete. They record Microdata/RDFa markers without evaluating those formats. Rendered projection uses an isolated Chromium world and stable frame/loader/URL binding; navigation authority and total deadline remain the caller's responsibility.

Sources: [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/), reviewed 2026-11-19. Required-property/type profiles, complete expansion, visible-content checks, scoped report integration and real structured-data pilots remain open. This foundation is not a full JSON-LD validator or commercial completion.

Native projection review independently passed the original 14 cases and found a P2 MIME whitespace issue: parameters preceded by a space were silently ignored with complete coverage. Native cohort 002 reproduced the failure; the parser now uses HTTP-whitespace essence handling and treats parameterized JSON-LD as incomplete. Added Unicode-whitespace coverage to prevent broad trim normalization. Final native cohort 003 covers 16 cases.

Final verification for this foundation: 110 test files / 1,231 tests passed, including 23 JSON-LD unit cases; native cohort 003 passed 16 cases. Lint, typecheck, build, formatting and whitespace checks passed. This increment changes development modules only; no package lock, release archive or customer structured-data report was produced.

### Task 4 scoped structured-data report integration

Added `structured-data-capture-v1` and the development workflow kind `structured-data`. Captures bind customer/entity/environment/URL/profile/state/method, source bytes/hash and exclusive freshness. Checks separate JSON syntax, basic document root shape, explicit owner JSON-LD type-presence policy and unverified visible-content agreement. A null policy never creates a missing-schema failure; complete empty JSON-LD can fail only an explicit JSON-LD serialization policy. Type presence is not vocabulary membership, required-property validation or rich-result eligibility.

Workflow fingerprints the parser/envelope, preserves method scope, allows explicit expectedTypes policy revision and replays expiry. Reports retain raw JSON privately; observed failures and unresolved blocks identify original private source/block JSON locators. Independent review found this locator gap; a regression reproduced it before the fix. No additional scope/semantic blockers were reported. Tests cover malformed-source privacy, policy revision and expired replay.

Final validation: native JSON-LD cohort 004 passed 16 cases through scoped envelope evaluation; 111 test files / 1,252 tests passed repository-wide. Lint, typecheck, build, format and whitespace checks passed. Required-property/type profiles, complete JSON-LD expansion and real structured-data pilots remain open; no release/package manifests changed.

### Task 3 authorized structured-data acquisition

Connected source/rendered JSON-LD projection to the shared trusted read-only collector. The new entrypoint preserves authorization/robots/pacing/resource/deadline controls, exact final URL and navigation-instance binding, and separate source/rendered observation times. Non-200 or changed final scope is withheld. A same-final-URL redirect chain is allowed with original private response provenance; this does not imply the journey had no redirects. Disrupted rendering removes blocks and observed other-format markers.

Independent review found a serialized-envelope size mismatch: valid bounded raw text can expand beyond the evaluator's 2 MiB input budget. Native cohort 003 reproduced a falsely captured oversized envelope; the collector now withholds it as unknown with an explicit size-limit gap. Review otherwise found no concrete scope/authorization integration defect; new native cases do not directly inject mid-capture authorization expiry or response-binding mismatch, which remain coverage limitations. This integration does not complete required-property/schema semantics, visible-content validation, customer pilots or release packaging.

Native validation: JSON-LD collector cohort 004 passed 9 cases after the size fix; shared collector regressions passed 11 hreflang, 14 index-control and 9 canonical cases. Full suite passed 111 files / 1,252 tests. Lint initially caught the newly used Buffer global; it was changed to an explicit node:buffer import.

[Real JSON-LD acquisition pilot](../research/enterprise-public-pilot-20261118/structured-data/README.md): eight homepage/viewport attempts, six captures and twelve method-specific evaluations (8 pass / 40 unknown / 0 fail). Exact www Infinity robots access was unavailable. Independent review reproduced all hashes/evaluations and checked summary privacy. All rendered projections remain incomplete, and no new site finding or customer report release is claimed.

After the explicit Buffer import, native cohort 005 passed all 9 cases; lint and formatting passed. Documentation verification passed 14 tests with the pilot dossier staged. Typecheck, build and whitespace checks passed. No release manifests or component locks changed.

### Task 4 structured-data customer pilot appendices

Generated separate immutable JSON/Markdown/HTML customer appendices from the retained four-site pilot. Twelve scoped method evaluations add 48 JSON-LD checks and 12 provider-state unknown placeholders. Including 40 intake placeholders, four reports contain 100 checks (8 pass, 92 unknown, zero fail). Infinity has no fabricated evaluations: its report records the unavailable exact-www-host acquisition and a scoped data request. Narratives bind retained summary evidence; private assessed runs retain raw captures and are not distributed.

Independent review verified four manifests/projections, source-run linkage, exact scope/source binding, counts and payload privacy; no actionable report defect was found. Eight offline 390/1280 viewport checks passed without overflow, scripts or external requests. Full report acceptance remains pending, and these appendices do not close schema semantics, optimization, installed-host or commercial release gates. See [customer appendices](../research/enterprise-public-pilot-20261118/structured-data/README.md).

Verification: 111 test files / 1,252 tests passed; the staged documentation recheck passed 14 tests. Lint, typecheck, build, formatting and whitespace checks passed. This increment adds customer evidence artifacts only; release archives/component locks remain unchanged.

### Task 3 pinned vocabulary membership foundation

Added a reproducible offline extraction of the official Schema.org 30.1 all-terms vocabulary (3,026 schema namespace terms; source SHA-256 `07e7c663dbc12a0937581745e59a98ed12b8698f38e8e3b03650287d9df88ae5`). The derived data retains class/property/individual classification, section and supersession metadata, with explicit data attribution/license notice. Foreign vocabulary definitions and descriptions are excluded. Source bytes must match the reviewed pin; no remote context or automatic update occurs.

The classifier accepts already-resolved term names or HTTP/HTTPS schema.org IRIs. It distinguishes snapshot membership from semantic validity: unlisted, pending, attic or superseded terms are not automatically declared invalid. This is prerequisite data for semantic checking, not a complete standards processor or a report verdict.

The official `3DModel` class exposed a real existing defect: type extraction excluded leading digits and owner type policy rejected them. Both regressions were observed failing, then fixed; the conservative supported-context boundary remains unchanged. Required-property profiles, complete expansion and visible-content comparisons remain open.

Independent review reconstructed all 3,026 records (940 classes, 1,540 properties, 546 individuals), verified the exact source hash and a tamper rejection, and checked all 9,078 bare-name/HTTP/HTTPS classifications. No concrete blocker was found. Attribution was checked against official Schema.org terms; this review covers data and classifier semantics, not future report integration. Native JSON-LD cohort 005 passed 16 cases after the 3DModel fix. A private offline replay of retained public-pilot blocks is stored at `build/enterprise-schema-membership-001/observations.json`; it is exploratory membership evidence and does not modify historical customer reports or add website findings.

The first full suite exposed a documentation-guard false positive on an official vocabulary key containing a legacy brand substring. A regression failed before adding a path-and-exact-key-only exception; values, suffixed keys and other files remain scanned. All 15 documentation tests then passed. The upstream vocabulary bytes/term names were not altered to satisfy the guard.

Final verification: 112 test files / 1,264 tests passed; native JSON-LD cohort 005 passed 16 cases. Lint, typecheck, build, formatting and whitespace checks passed. No runtime dependency, released package, archive or component lock was changed. Vocabulary membership report integration remains the next step.

### Task 4 pinned class-membership report integration

Added a fifth scoped structured-data predicate, `jsonld-schema-class-membership`, distinct from full vocabulary validity. An observed property/individual used as a type fails the pinned class-membership predicate even with partial enumeration; complete nonempty all-class observations pass; unlisted terms and incomplete/unsupported expansion remain unknown. Pending/attic/superseded class metadata is preserved without turning it into an automatic defect. Every result is scoped/freshness-gated and cites the vocabulary version/hash; failures retain original private block locators. The workflow now fingerprints the classifier and data snapshot.

Independent review found no blocking scope/semantics defect and independently passed 85 focused tests. It identified contradictory inherited limitation text; a regression reproduced it before the evaluator-level wording was corrected. Historical customer reports are unchanged. A new private four-site report replay at `build/enterprise-jsonld-report-003` produced 112 total checks (12 pass, 100 unknown, zero fail), including the existing intake/provider placeholders; Infinity remains unassessed. Eight offline report viewport cases and nine native collector cases passed. These checks do not close required properties, full expansion, visible-content validation or commercial release gates.

Next semantic-profile design must distinguish Schema.org vocabulary membership from feature-specific Google requirements and explicit owner intent. Official [Organization guidance](https://developers.google.com/search/docs/appearance/structured-data/organization) states there are no required properties; do not fabricate universal required fields for every organization. [Product snippet](https://developers.google.com/search/docs/appearance/structured-data/product-snippet) and [Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) profiles require separate applicability and property predicates. Sources revisited 2026-11-19; these profiles are not implemented by the membership check.

Final verification: the default-timeout full suite had 1,271 pass and one release-build test exceeding 5 seconds (no assertion failure). A complete rerun with `--maxWorkers=1 --testTimeout=15000` passed 112 files / 1,272 tests. Lint, typecheck, build, formatting and whitespace checks passed. No release package, archive or component lock changed.

### Task 3 standards-based offline graph foundation

Ruling: use exact development dependency `jsonld@9.0.0` instead of extending the limited custom extractor into a general JSON-LD processor. Required-property checks need alias expansion, identifier resolution and graph merging; implementing these ad hoc would risk false missing-property findings. This changes the earlier no-new-dependency plan, not a user requirement. Cost: an additional dependency/lock/license surface and future archive/dual-host packaging gates. No released skill archive or component lock has changed.

`expandJsonLdOffline` runs the processor's safe JSON-LD 1.1 flatten operation in a worker. Contexts are explicitly supplied original bytes with SHA-256, exact URLs and bounded count/size; there is no live loader fallback, including for missing nested contexts. Document size, strict JSON duplicate/depth/node limits, finite numbers, output bytes and worker lifetime are bounded. Worker V8 heap limits are not a total process-memory cap; completion includes termination time. Expanded graphs retain private values and IRIs and are not customer report output. A successful expansion is not schema validity, content relevance, provider eligibility or execution authentication.

Independent review independently ran ten tests and inspected the installed loader path. It found that the base URL affected identifiers without being fingerprinted; a regression reproduced this, then baseUrlHash/inputDigest/output graphHash were added. Processor version is checked in the worker. Source references: [jsonld.js custom loader and safe mode](https://github.com/digitalbazaar/jsonld.js), [W3C JSON-LD 1.1 algorithms](https://www.w3.org/TR/json-ld11-api/). Further tests cover output expansion limits and base binding.

Dependency audit reports nine moderate advisories in the existing ESLint/TypeScript-ESLint/minimatch chain, no advisory in the newly added jsonld dependency chain at inspection time. Existing tooling remediation remains a separate release-hardening task; no claim of a clean overall dependency audit is made. JSON-LD context acquisition authenticity, scoped evidence adapter/report integration, feature-specific property predicates, complete standards test-suite replay and release packaging remain open.

Final verification: 15 expansion cases and 113 test files / 1,287 repository tests passed with `--maxWorkers=1 --testTimeout=15000`; lint, typecheck, build, formatting and whitespace checks passed. An initial documentation guard failure on a synthetic credential URL literal was resolved by constructing that test input at runtime, retaining the unsafe-URL rejection test and the original guard. All existing dependency lock records remain unchanged; nine new development dependency records have BSD-3-Clause, Apache-2.0, MIT or ISC license metadata. Release packaging and the existing lint-tool dependency advisory remediation remain open.

### Release hardening — dependency advisory remediation

The previously observed root tooling advisory chain is addressed, and inspection of the site's separate lockfile found additional advisories that were also updated. Independent review caught Node floor and type-peer incompatibilities; CI/site requirements now match Node22.23.4 and explicit compatible type declarations. Both root/site clean installs under that Node pass and report zero known npm audit entries. See [dependency hardening evidence](../research/enterprise-dependency-hardening-20261119.md). This resolves the recorded dependency task, not the remaining semantic/feature/release gates.

### Offline graph numeric fidelity

Before scoped graph integration, five regression cases demonstrated silent numeric loss in the worker: large integers, decimal rounding and underflow could produce an expanded graph containing a changed value. The worker now checks original numeric tokens using the Node JSON reviver source context after strict duplicate/depth/node validation. It accepts equivalent decimal spellings but withholds nonfinite values, unsafe integers and values whose decimal round trip changes. This also applies to supplied context documents. Numeric policy version is included in processor provenance/input digest.

This is decimal round-trip preservation, not arbitrary-precision decimal arithmetic or exact IEEE binary representation. JSON-LD typed string literals remain strings. Missing reviver source support fails closed. Scoped base-URL evidence, context acquisition provenance and report integration remain open; no customer report has been upgraded to schema-valid based on this change.

Independent AI review ran all 27 expansion cases under Node 22.23.4 and additional negative/subnormal/context probes; no blocker found. Supported-subset limits: exponent spellings longer than six characters can return unknown even when numerically valid; negative zero is treated as zero. Full verification passed 113 files / 1,299 tests, root lint/typecheck/build/format and site typecheck/19 tests. No release archive, component lock, customer report or deployment changed.
