# Technical SEO development foundation

Implements [the technical SEO plan](../../docs/plans/website-audit-enterprise-technical-seo.md). This directory is not yet bundled in a released skill. Existing candidate archives and upstream pins remain unchanged.

`evaluateCanonicalCapture(context, source)` consumes one hash-bound, explicitly supplied canonical projection. It performs no IO, network access, HTML parsing or browser execution. Targets must already be absolute URLs resolved by the producer from source-head, rendered-head and final response Link declarations. A source hash authenticates neither the producer nor correspondence to native page bytes.

The three checks concern target format, observed declaration consistency and explicit owner intent. Pass requires complete coverage of all three layers. Missing declarations alone are unknown rather than a website defect; a single fresh observed conflict can fail the bounded consistency check even if another layer is incomplete. Canonical target fragments remain failures rather than being silently stripped. URLs preserve path case, query order and trailing slash; cross-domain targets can be legitimate when explicitly intended.

Context includes exact customer/entity/environment/targetUrl/profileId/stateId, assessmentAt, maxAgeSeconds and nullable expectedCanonical. Artifact version 1 has matching scope, capturedAt and layers `{sourceHead, renderedHead, httpLink}` each containing `{complete, targets}`. Complete means the supplied producer claims full extraction for that layer; the evaluator cannot authenticate this claim. Source envelope is `{sourceId, artifactText, artifactHash}` with SHA-256 over exact UTF-8 bytes. Exclusive expiry prevents old captures from passing a new assessment. There is no cross-capture aggregation or site-wide conclusion.

Run `npx vitest run tests/content-audit-canonical.test.ts --maxWorkers=1`. Native acquisition, raw-vs-rendered provenance, redirects, robots/noindex, hreflang, structured data, crawl coverage, URL Inspection contrast, immutable enterprise report integration and installed release verification remain in the plan. Do not advertise the foundation as a completed technical SEO module.

## HTTP Link projection

`parseCanonicalLinkHeaders(values, responseUrl)` parses a bounded complete set of supplied Link field values into targets and sanitized pending reasons. It uses the response URL for relative references, preserves fragments for the downstream format check and performs no network calls. Empty values alone do not prove that headers were actually collected.

The initial canonical-specific profile supports registered relation names, multiple relations, ordinary quoted title parameters and multiple fields. Anchor/context overrides, extension relation URIs, additional canonical attributes and duplicate parameters remain incomplete and excluded; valid independent fields remain visible. Malformed syntax does not become a complete clean projection. A general-purpose RFC Link parser is not claimed. The remaining native browser collector must bind this projection to actual response bytes and status.

## Native DOM projection

`projectCanonicalDocument({sourceHtml, responseUrl})` is a browser evaluation function. A supplied source string is parsed with DOMParser only in a separate host-owned, network-denied blank context. Null reads the existing live document. Production callers must use `projectRenderedCanonical(page, responseUrl)` from `document-collector.mjs`, which executes the trusted projection in a fresh Chromium isolated world and rejects a changed frame/loader/URL during capture; direct page-world evaluation is unsafe because the page can override globals and DOM methods. It neither navigates nor grants authorization. Outputs include bounded serialized DOM for private storage, base/document URL and explicit incomplete reasons. Raw source with noscript remains incomplete because parser scripting mode differs. Templates, body links and foreign namespaces are not head declarations. URL mismatch excludes rendered targets.

`node tests/browser/enterprise-technical-seo.mjs NEW_OUTPUT` exercises loopback native fixtures and saves original response bytes, headers, DOM projections, redirect chains and evaluator results with hashes. This is not a production collector. Real collection still needs authorization/proxy integration, HTTP charset/status handling, navigation-instance binding, deadlines, resource budgets and response-to-navigation-instance binding. Isolated-world protection covers page JavaScript intrinsics, not the truth of page-authored DOM content. A hash does not authenticate execution. Raw artifacts stay private until a sanitized report workflow exists.

## Navigation-instance observer

`observeCanonicalNavigation(page, {maxBodyBytes, maxDocumentRequests, timeoutMs})` attaches CDP before host-authorized navigation and returns host-only `snapshot()`/`close()`. Snapshot binds current main frame, loader and unique completed request, gets that request's body, and rejects scope or event changes during retrieval. Native response headers and redirect history remain tied to that request. CDP-decoded body bytes are explicitly distinct from original wire bytes. The observer's event timestamps describe host receipt, not origin-server time or a provider freshness guarantee.

Each protocol command, session creation and detach has a deadline; snapshot contains at most three commands plus cleanup. Failed snapshots are unknown and close observation. Cleanup reports whether detach completed. The caller still owns the browser/context and must close it if cleanup is incomplete. Production integration needs authorization/proxy enforcement, a total collection deadline and input decoding policy. No imported object can serve as a live observer or authorization grant.

Native trials: `node tests/browser/enterprise-navigation.mjs NEW_OUTPUT` exercises same-URL reload, redirect, abort, and held-response timeout; the canonical fixture harness also checks response/DOM loader equality. Protocol headers/body are private artifacts, not customer report fields.

## Authorized collector integration

`collectCanonicalReadOnly(plan, host, adapters?)` composes the existing public-address/DNS-pinned proxy and trusted-session authorization with the native observer and isolated projector. Exact plan fields are url/authorizationRef/observeMs/timeoutMs/maxBytes/maxRequests. Host supplies Chromium, synthetic flag, allowedOrigins, profile `{id,width,height}` and authorization context. Scope is derived from that context; grant bodies cannot be imported through the plan. Live expiry/revocation and fixed customer/asset/environment/identity are checked throughout collection.

The collector permits GET/HEAD only, blocks service workers/WebSockets and unapproved origins, and has one total collection deadline plus bounded cleanup. Disruptive browser or proxy restrictions discard rendered targets, including proxy-generated HTTP 403 denials that do not trigger browser requestfailed. Returned source is a version-1 supplied capture; raw native evidence is private. Redirected/non-200 scopes and unsupported representations remain unknown. A captured status means acquisition succeeded, not that SEO or commercial review passed.

The observation window is DOMContentLoaded plus observeMs, not a guarantee that every app has settled. The proxy's existing HTTPS tunnel/browser-gate limitations remain. The [four-site canonical pilot appendix](../../docs/research/enterprise-public-pilot-20261118/canonical/README.md) records bounded real captures and remaining evidence requests. Canonical report integration, package validation and commercial acceptance are still required.

Native CDP headers pass through `parseCanonicalCdpHeaders`: repeated Link fields joined with LF are separated at the protocol boundary. Raw HTTP parsing stays strict, including CR/LF rejection. Other header values are never projected into customer reports.

## Enterprise report workflow (development)

`evaluateEnterpriseTechnicalSeo(sourceDirectory, bundle, outputDirectory)` in `workflow.mjs` forks a verified enterprise run and retains one supplied canonical capture per evaluation. Bundle fields are sourceDigest/newRunId/assessmentAt/evaluations. Entry fields are evaluationId/kind (`canonical`)/window/context/sources; context omits customerId and assessmentAt, derived from the bound run. Exactly one source is accepted. Window is start-inclusive/end-exclusive; URL, environment, profile and state stay explicit. Owner canonical policy may change in a new revision without rebinding page scope.

Three canonical checks plus an explicitly unknown provider-index-state check feed the existing JSON/Markdown/HTML report builder. Source bytes remain in internal run evidence; customer projections expose bounded reasons, scoped requests and draft findings only. No native execution, provider state, ranking improvement or commercial acceptance is inferred. A report must still pass its separate review gate.

The workflow revalidates retained raw inputs and derived rows, rejects missing/foreign indexes and scope changes, preserves original runs, and rebuilds every retained evaluation at reassessment. Empty replacements are allowed only for an existing validated population. Evidence identity includes the revision occurrence, so same-time policy reverts remain replayable. Limits apply to incoming and retained populations: 50 evaluations, 16 MiB source bytes, 32 MiB serialized run. Source fingerprints are recorded; no automatic migration guarantee across changed evaluator semantics is claimed.

Run `npx vitest run tests/content-audit-technical-seo-workflow.test.ts --maxWorkers=1`. This workflow remains outside the released package and CLI until broader technical rules and release gates are completed.
