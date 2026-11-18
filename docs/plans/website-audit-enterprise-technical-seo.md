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
