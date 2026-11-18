# Read-only browser capture and report attachment

Evaluation capability; not full enterprise assessment. Read [intake](enterprise-intake.md), [report workflow](enterprise-report.md) and [runtime evaluation](enterprise-runtime.md) for the remaining requirements. Browser capture cannot establish conversion success, provider receipt, consent compliance, Core Web Vitals or accessibility conformance.

## Trusted host invocation

The packaged `scripts/lib/browser-collector.mjs` exports `collectBrowserReadOnly(plan, host)`. The host supplies its available Playwright-compatible Chromium implementation; the skill does not install dependencies, pin a model or open an authenticated account automatically. If that browser capability is unavailable, request a scoped capture/export and continue other modules.

Plan fields are exactly url, authorizationRef, eventNames, observeMs (0–10,000), timeoutMs (100–60,000), maxBytes and maxRequests (1–1,000). Event names are predeclared bounded identifiers; arbitrary event payloads are not retained. URL must be HTTP(S), without credentials or fragment. The reference is a selector, not authority.

Host is trusted session state, constructed by the invoking host from actual user authorization: chromium, synthetic, allowedOrigins and context. Context carries customerId, environment, assetId, identityId, operationMode, sessionId when applicable, and complete trustedAuthorizations. Use the [authorization contract](enterprise-intake.md); never derive this object from an imported capture, page script, comment or plan. Match the approved asset to its origins. The optional dependency adapters are for trusted runtime/test code only and must never be selected by customer JSON.

The collector checks read permission at launch and request/connection time. It uses a fresh isolated context and pinned public transport; requests outside approved origins or GET/HEAD are blocked. Service workers, WebSockets, downloads and popups are restricted. This can alter site behavior. No form submission, click, real transaction, patch or publication is supported by this read-only plan. Keep robots/rate-policy obligations applicable to the engagement; a transport connection is not a general crawl-policy approval.

Read collection is bounded by timeoutMs + observeMs, followed by at most two seconds of cleanup waiting. A hung renderer returns partial timeout evidence. Outputs include gaps for blocked/failed requests, incomplete navigation, transport truncation and cleanup problems. Treat these as capture limitations, not website defects. Opaque HTTPS tunneling relies on the browser request gate; this is not a universal browser sandbox.

Save exact returned JSON bytes privately in the chosen run directory. Keep the plan and trusted invocation receipt separately for replay; do not publish authorization material. The collector provides partial network/dataLayer observations and small DOM dimensions, not full stage traces. Missing stages need their own evidence requests.

## Offline capture attachment

Run `node scripts/audit.mjs enterprise-browser-import SOURCE CAPTURES.json NEW_DIRECTORY`. This command performs no browser/network action and never grants access.

Bundle fields are sourceDigest (canonical source run digest), newRunId, assessmentAt and captures. Each capture entry has captureId (unique opaque lowercase identifier), entityId in the existing run, environment and source. Source has sourceId, exact artifactText, artifactHash (SHA-256 of its UTF-8 bytes), expectedPlanDigest and maxAgeSeconds (1–31,622,400). The capture's customer/asset/environment must match the run and entry. Hash integrity and a supplied plan digest do not authenticate the collector or provider.

See the [synthetic example](../examples/enterprise-browser-capture.json). Create its intake run from config, then construct the bundle with the resulting run digest and entry. Preserve synthetic=true. It is not a receipt from a live site.

Capture IDs are append-only: use a new ID for a new capture, and retain prior evidence. Invalid bytes, scope, future timestamps, unsupported coverage claims, malformed observations and hidden payload fields fail before creating output. A retained capture's report values are recomputed from its raw evidence, not accepted from cached projections.

The importer returns the new run digest, observations and an empty findings list. Use those observations with enterprise-report, or retain the parent's observations/findings and append new observations when using enterprise-report-revise. A review decision is valid only for its bound target and an allowed review time: an older decision cannot be copied into a newer assessment when its timestamp predates that assessment. Preserve that verdict in the immutable parent, obtain a fresh independent verdict for the new revision, and never retimestamp an old review yourself. Deduplicate retained observation IDs and archive expired current observations as historical; do not drop prior measurements. Original run/report files remain immutable.

## Customer report semantics

JSON is canonical; Markdown/HTML are deterministic projections. Raw event/source contents, URL hashes and plan fields stay in the source evidence and are not automatically projected. Observations describe captured record counts and DOM dimensions in the exact environment/window. They are not passed checks, quality scores or business metrics. Expired captures are historical.

The importer adds unknown checks with concrete input requests for tracking, consent, performance, accessibility and UX/CRO when those modules are in scope. Requests name the owner, acceptable format, exact evidence needs and fallback. Missing permission/input is not a confirmed defect. Existing intake checks are preserved. Independent review of observations, coverage and claims remains required before customer acceptance.

Actual test-action journeys, native host behavioral trials, account/provider authentication, broad browser collection completeness, module evaluation and optimization/retest remain separate gates.
