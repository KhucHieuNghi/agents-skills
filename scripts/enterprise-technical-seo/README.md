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

`normalizeTechnicalSeoAttempt` in `acquisition.mjs` validates attributed browser
collector outcomes against a bound target, method and observation window. Failed
attempts retain their times and gaps without inventing capture evidence. A usable
supplied capture can pass only the adapter's availability predicate; synthetic,
expired, redirected or unavailable selected-method results remain unknown. It does
not authorize collection or establish semantic acceptance. Private browser diagnostics
are omitted; the bounded source record retains all supplied method envelopes for
replay, separate from the derived assessment. Capture bytes remain private evidence. See the
[installation plan](../../docs/plans/website-audit-enterprise-technical-seo-installation.md)
for the target contract and remaining gates.

`recordEnterpriseTechnicalSeoAcquisition(sourceDirectory, bundle, outputDirectory)`
in `acquisition-workflow.mjs` now persists these records in a new enterprise run.
Bundle keys are sourceDigest, newRunId, assessmentAt and attempts; each attempt
entry contains target and attempt as defined by the normalizer. An empty attempts
array reassesses an existing population. Scope/window rebinding and duplicate
attempt IDs within a target are rejected. A retry beyond a closed observation
window needs a new target/window; prior attempts remain historical.

The stable check measures capture availability only. A usable retained capture
can remain available when a later retry fails. Synthetic or expired evidence cannot
pass availability. Receipt status may become provided after validated acquisition;
owner refusals are retained, and semantic SEO checks remain separate. Feed the new
run to the existing enterprise report builder with a later parent-bound report
revision. Source payloads are excluded by the report projection.

Sources and derived projections are replayed against the exact evaluator fingerprint;
unsupported versions require reviewed migration. History is append-only and indexes
cannot select superseded projections. Limits: 50 targets, 1,000 retained attempts,
50 new attempts/8 MiB input per revision, 32 MiB serialized run, and 20,000 source
reference occurrences/64 MiB repeated capture bytes per replay validation. Exceeding
these limits rejects the revision without writing output; it never prunes history.
This development API has no installed CLI command yet and grants no network access.

`evaluateEnterpriseTechnicalSeo(sourceDirectory, bundle, outputDirectory)` in `workflow.mjs` forks a verified enterprise run and retains one supplied canonical capture per evaluation. Bundle fields are sourceDigest/newRunId/assessmentAt/evaluations. Entry fields are evaluationId/kind (`canonical`, `gsc-url-inspection`, `index-controls`, `hreflang`, `declared-target-controls` or `structured-data`)/window/context/sources; context omits customerId and assessmentAt, derived from the bound run. Exactly one source is accepted per entry; provider and browser captures remain separate populations. Window is start-inclusive/end-exclusive; URL, environment, profile and state stay explicit. Owner canonical policy may change in a new revision without rebinding page scope.

For local captures, three canonical checks plus an explicitly unknown provider-index-state check feed the existing JSON/Markdown/HTML report builder. Source bytes remain in internal run evidence; customer projections expose bounded reasons, scoped requests and draft findings only. No native execution, provider state, ranking improvement or commercial acceptance is inferred. A report must still pass its separate review gate.

The workflow revalidates retained raw inputs and derived rows, rejects missing/foreign indexes and scope changes, preserves original runs, and rebuilds every retained evaluation at reassessment. Empty replacements are allowed only for an existing validated population. Evidence identity includes the revision occurrence, so same-time policy reverts remain replayable. Limits apply to incoming and retained populations: 50 evaluations, 16 MiB source bytes, 32 MiB serialized run. Source fingerprints must match the current evaluator implementation before replay. Unsupported fingerprints are rejected without output; retain original runs and use an explicitly reviewed migration before reassessment. No automatic migration is implemented. Existing report snapshots remain historical evidence.

Request descriptors are replay-derived from retained evaluation inputs. Altered formats, export instructions, owner, fallback, access scope or priority are rejected. Compatible response status, reason and evidence bindings survive reassessment after expiry reconciliation; provided material does not automatically assess an unknown check. Each evaluator emits explicit rule bindings; the report asks only for the evidence requirements linked to that unknown row. Provider inspection, owner policy, capture and visible-content inputs remain distinct. Formats describe requested evidence, not guaranteed automatic import support: the supplied workflow still consumes its declared capture envelopes and context fields. Supplementary owner/content/vocabulary artifacts need explicit interpretation and reassessment; they never automatically pass a check.

Run `npx vitest run tests/content-audit-technical-seo-workflow.test.ts --maxWorkers=1`. This workflow remains outside the released package and CLI until broader technical rules and release gates are completed.

## Supplied GSC URL Inspection adapter

`evaluateUrlInspection(context, source)` in `url-inspection.mjs` accepts a hash-bound original API response with explicit request/receipt metadata. Context: customerId/entityId/environment/targetUrl/property/assessmentAt/maxAgeSeconds/expectedIndexed/expectedCanonical. Intent fields may be null. Envelope v1: scope `{customerId,entityId,environment}`, request `{inspectionUrl,siteUrl,languageCode?}`, retrievedAt and response `{inspectionResult: ...}`. Input is at most 1 MiB; duplicate JSON members are rejected. Property containment, exact request binding and scope are checked without granting API access.

The adapter preserves provider verdict, crawler/robots/indexing/fetch enums, last crawl time and declared/selected canonicals. Omitted fields stay null. Future enum values are retained in the private evaluator record and marked unsupported; customer workflow text uses a fixed unsupported marker. Free-form coverage messages, referring URLs and inspection links are not projected. It evaluates reported index verdict and selected canonical against explicit owner intent, not against live DOM. Exclusion without owner intent remains unknown, not an automatic website defect. INDEXING_ALLOWED does not imply indexed. Provider and local captures are never silently pooled.

Host retrieval/assessment timestamps support UTC seconds or milliseconds, matching enterprise exclusive-expiry serialization. Provider lastCrawlTime supports exact nanosecond validation and remains unchanged; it is not substituted for retrieval time. Expired evidence retains historical observations but cannot pass current checks. Missing intent/fields and expiry create scoped requests. This adapter does not call Google, authenticate metadata, test live indexability or claim a whole-site index count.

The workflow supports separate `gsc-url-inspection` entries with two owner-intent checks, property-scoped identity and a historical observation that distinguishes retrieval from last crawl. Its internal `canonical-*` evidence namespace remains versioned development storage; the entry kind distinguishes provenance. No migration of earlier development fingerprints is promised.

## Googlebot index controls (development)

`evaluateIndexControls(context, source)` accepts a hash-bound v1 supplied capture with scope/capturedAt, response `{url,status}`, origin robots `{url,capturedAt,status,body,complete}`, sourceDocument/renderedDocument `{complete,meta:[{name,content}]}` and httpHeaders `{complete,values}` containing separate X-Robots-Tag fields. Whole-document coverage includes HTML head and body; head-only envelopes are rejected. Context adds crawler (`googlebot` only), assessmentAt/maxAgeSeconds and nullable expectedCrawlAllowed/expectedIndexable/expectedHttpStatus. `expectedIndexable` here means intended absence/presence of page indexing directives, not a promise of index eligibility.

Three checks compare exact HTTP status, observed Googlebot crawl policy and page indexing directives to owner intent. Missing intent remains unknown. Source noindex survives rendered removal; independent positive noindex can be retained despite other incomplete layers. Clean absence requires complete supported projections. Other agents are excluded; mixed agent scopes in one header are conservatively incomplete. Colon parameter values are not standalone directives. Unsupported unavailable_after/indexifembedded semantics remain incomplete; this is not a complete robots-meta specification engine. Image/snippet restrictions do not automatically become page noindex.

The existing robots parser is reused with Google-specific observed HTTP handling; the collection access gate is unchanged. Robots 4xx except429 imply absent policy for this Google assessment; redirects,429,5xx, malformed policy or missing cache context remain unknown. Page and robots freshness are separate, both must be within the workflow observation window, and neither state establishes Google indexing or grants access. A blocked robots policy does not prove page exclusion or effective delivery of noindex.

`projectIndexDocument` extracts full-document HTML robots meta; source DOMParser runs in a host-owned network-denied context, while `projectRenderedIndexDocument` uses an isolated Chromium realm with stable frame/loader/URL checks. Templates and foreign namespaces are excluded. Source noscript ambiguity remains incomplete. The caller owns navigation authorization, response-instance binding, resource limits and a total deadline; the helper itself does not navigate or provide all of those guarantees. `node tests/browser/enterprise-index-controls.mjs NEW_OUTPUT` verifies ten loopback fixtures. The authorized collector now uses this projector via `collectIndexControlsReadOnly`; these changes are not bundled in a released skill.

`collectIndexControlsReadOnly` uses the same fixed collection-plan shape and host grant as canonical collection. It retrieves origin robots through the pinned public transport before browser launch, enforces the NKSkills collection policy per same-origin resource, and preserves the separately evaluated Googlebot policy. Cross-origin resources remain blocked until their own robots policies are supported. Crawl-delay serializes requests through response completion before waiting the next interval; pending/failed paced work invalidates rendered coverage. Total deadline aborts robot retrieval, observation and pacing waits. Redirected robots stay incomplete for assessment; authorization failure never emits a source artifact. See the [collector review](../../docs/research/website-audit-enterprise-index-collector-review.md) and [final real-site cohort](../../docs/research/enterprise-public-pilot-20261118/index-controls/README.md).

## Hreflang development primitives

`evaluateHreflangGraph` accepts one selected method (`html-source`, `html-rendered`, `http-link`, or `sitemap`), exact root URL, assessment time/maximum age, and at most 100 page projections with at most 100 alternates each. The caller must supply a separately scoped evidence envelope before enterprise report integration. It performs no network access.

Topology checks cover the root self-reference and observed outgoing return links. Root-only `languageValidity` checks Google's supported code form against a pinned IANA subset; root-only `languageMapping` checks case-insensitive label uniqueness per target. Neither is a cluster-level language consistency verdict. `classifyHreflangLanguage` exposes bounded reasons and registry provenance. Deprecated/exceptional subtags remain unknown; unsupported Google region targeting is distinct from rejection of the language portion. Multiple labels may share a URL.

Content equivalence, actual document language, target indexability and execution authenticity are not inferred. The supplied `hreflang` evidence adapter now connects these results to development customer report projection; it is not installed in the released skill. The workflow requires a root capture and binds every supplied page timestamp to the declared observation window. Reports retain private source ID and original JSON locator for missing-target requests rather than exposing raw alternate URLs. Registry changes require explicit review of the source hash, extracted sets, exceptional region handling and regression cases; there is no automatic refresh.

`projectHreflangDocument` reads native HTML source or the current document; source parsing requires a network-denied blank browser context. `projectRenderedHreflangDocument` invokes it in a fresh Chromium isolated world and checks frame/loader/URL stability. The caller must still enforce navigation permission, total deadlines and response-instance binding. Neither helper follows alternate targets. Run `node tests/browser/enterprise-hreflang.mjs <new-output-directory>` for the local native fixture cohort.

`collectHreflangReadOnly` now connects the HTML projection to the shared trusted collector. It returns `sources` containing separate source/rendered root envelopes (not a merged `source`). The caller evaluates each selected method separately. Alternate URLs are not automatically followed; complete graph acquisition still needs separately authorized, scope-bound target captures. Non-200/redirected root captures are withheld.

Use `assembleHreflangCaptures(context, captures)` to combine separately collected single-page envelopes for one root and its direct alternates. It emits `hreflang-capture-v2` with each original source envelope embedded; evaluations revalidate every component and retain per-page provenance. It does not fetch targets or expand authorization. Keep source/rendered methods, profiles, states and customers separate; raw component bytes remain private report-source evidence.

`hreflang-shared-language-mapping` compares supported labels shared by the root and each supplied direct target. It does not demand identical global language sets. Fresh observed contradictions can fail despite partial enumeration; clean agreement requires complete fresh root/target enumeration and supported unambiguous labels. Missing or expired target captures keep the check unknown. This is declaration consistency, not translation equivalence, actual page-language detection or a verdict about every site URL.

`evaluateDeclaredTargetControls(context, source)` accepts a `declared-target-controls-v1` envelope (`schemaVersion`, original `declaration`, array of original index-control `targets`). Context includes canonical/hreflang `relationship` and a null canonical method or selected hreflang method. It checks direct200, Googlebot robots allowance and observed noindex absence separately; it never declares a target indexed/indexable. The report workflow preserves exact private declaration locators for both known and unknown conditions. No network requests are made by this evaluator.

## Structured-data development foundation

`inspectJsonLdBlocks({complete, blocks})` checks bounded JSON syntax and basic document root shape, and extracts schema.org type terms only across supported contexts/property boundaries. Every block is `{id, text}`. It never loads external contexts and does not validate type vocabulary membership, required properties, visible content or rich-result eligibility. Ambiguous/custom contexts, value objects and unsupported expansion paths remain explicitly pending.

`projectJsonLdDocument` / `projectRenderedJsonLdDocument` provide inline HTML script captures; source parsing requires a network-denied blank context, and rendered evaluation uses a fresh isolated world. Caller owns acquisition authorization, response binding and deadline. Raw block text and HTML are private evidence. Run `node tests/browser/enterprise-jsonld.mjs <new-output-directory>` for native fixtures. The development `structured-data` workflow now accepts scoped supplied envelopes through `evaluateStructuredData`; these modules are not integrated into the released skill.

`structured-data-capture-v1` contains scope, method, capturedAt, `{complete, blocks}` projection and observed Microdata/RDFa markers. Context `expectedTypes` is null or a nonempty explicit list of intended JSON-LD type terms. The owner-policy check tests that declared policy only; it does not impose one on every website or accept other formats as an implicit substitute. Customer reports preserve safe original block locators while keeping block payloads private. Required-property profiles and visible-content comparisons remain separate work.

`collectStructuredDataReadOnly` connects inline JSON-LD projection to the trusted read-only collector: robots gating, authorization rechecks, bounded transport, total deadline, isolated rendered realm and response/frame/loader binding. It returns separate source/rendered envelopes in `sources`, with their own observation timestamps. Non-200 and changed final-URL scope are withheld; a redirect returning to the original URL may be captured with final-response binding and private redirect history. Disrupted rendered environments discard blocks and other-format markers. Serialized envelopes exceeding the evaluator's 2 MiB limit are withheld as unknown. Raw HTML and blocks remain private; the collector does not fetch remote contexts, navigate schema targets, or establish rich-result eligibility. Native integration cases: `node tests/browser/enterprise-jsonld-collector.mjs <new-output-directory>`.

## Pinned schema vocabulary membership

`classifySchemaType` classifies an already resolved schema.org term against the pinned 30.1 snapshot: class/property/individual/unlisted, section and supersession metadata. The pure classifier performs no IO or context expansion. Unlisted means absent in this snapshot, not globally invalid; a class match does not establish valid JSON-LD use, required properties or search eligibility. The scoped evaluator now exposes a separate `jsonld-schema-class-membership` check. `3DModel` is now preserved by type extraction and accepted in an explicit owner policy.

`schema-registry-build.mjs` deterministically derives the data from an exact SHA-256-verified versioned official file; it never fetches or auto-updates. See [data attribution and reproduction](SCHEMA-VOCABULARY-NOTICE.md). Original upstream definitions and unrelated vocabulary terms are not included in the reduced data file.

The membership check fails only for an observed schema.org property or individual used as a type in the pinned snapshot. Complete nonempty resolved type enumeration consisting of classes passes this bounded predicate; unlisted terms or incomplete/unresolved enumeration remain unknown with a recovery request. Pending/attic/superseded class metadata is retained, not automatically rejected. Full vocabulary validity and rich-result eligibility remain unknown. Source expiry gates the check; reasons carry snapshot version/hash and private block locators without exposing raw type values. The workflow fingerprints the classifier and snapshot, so earlier report artifacts remain immutable historical evidence rather than silently changing meaning.

## Offline JSON-LD graph construction

`expandJsonLdOffline({documentText, baseUrl, contexts, timeoutMs})` uses pinned development dependency `jsonld@9.0.0` (Digital Bazaar, BSD-3-Clause; see its installed LICENSE and [upstream repository](https://github.com/digitalbazaar/jsonld.js)). It runs safe JSON-LD 1.1 flatten in a fresh worker with a supplied-context-only loader; missing contexts never fall back to network. Context entries are exact `{url, documentText, sha256}`. No built-in schema.org context is fabricated.

Limits: 256 KiB source, 16 contexts with 128 KiB each / 1 MiB total, strict duplicate/member depth/node validation, 2 MiB serialized graph, 1–5,000 ms worker deadline. V8 limits are 64 MiB old generation / 16 MiB young / 4 MiB stack, not total process memory; completion includes worker termination. Safe-mode rejection, missing contexts, non-finite JSON numbers, worker failure and deadline return unknown, not a website defect. Malformed input contract or hash mismatch rejects the call.

Outputs bind source bytes, base URL, context URL/hash pairs, processor/mode/operation and graph digest. Hashes do not authenticate context origin or execution. The graph contains private source values/IRIs and must not be published directly. This development helper is not a full schema validator, native context collector or released-package capability. Alias/scoped-context/graph provenance still needs connection to scoped evidence before property checks and reports.
