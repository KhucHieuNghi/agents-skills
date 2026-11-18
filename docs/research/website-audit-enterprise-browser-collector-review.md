# Read-only browser collector development checkpoint

Status: development source outside the released skill package. Candidate 0.3.9 remains immutable. This advances P4 collection; it does not complete P4, P5–P7 or commercial acceptance.

## Implementation

`scripts/enterprise-browser/collect.mjs` accepts a bounded read-only plan and a separate trusted host containing Chromium, session authorization, asset scope and allowed origins. A plan cannot import grants, actions, clicks or arbitrary browser options. Authorization is checked before launch, each browser request and each new proxy target; identity/customer/asset/environment remain bound. Scope is host-owned, not granted by page content.

The owned proxy uses the existing public-address resolver and pins actual HTTP lookup/CONNECT destinations. Proxy credentials are ephemeral and are not included in evidence. It strips proxy/hop headers, limits admissions and retained events, caps sockets/bytes/time, aborts pending target resolution on client close and reports dropped events. HTTPS tunnels are opaque: browser request gating remains necessary for read-method and per-request authorization. This is not a universal sandbox for arbitrary browser protocols.

The collector uses a fresh context, blocks service workers/WebSockets/downloads/popups and non-GET/HEAD requests, observes only predeclared dataLayer names and omits event payloads. Output retains scoped timing, hashed URLs, HTTP status observations, small DOM measurements, transport evidence, drop counters and gaps. It always reports partial coverage; tags, consent, providers and business outcomes remain unobserved. A whole-collection watchdog closes an unresponsive renderer independently of page JavaScript, with bounded cleanup.

These choices can change website behavior. No absent event, response, DOM width or blocked request is automatically promoted to a customer finding. Missing origins/permissions, authenticated context, full consent policy, journey mapping and provider/business receipts require separate intake requests and assessment.

## Reproduce and evidence

Run `npm run test:audit-collector -- build/enterprise-browser-collector-NEW` with the existing site Playwright/Chromium dependency installed. Output must be a new directory. Network-test dependencies are injected by trusted test code; an audit plan cannot select them.

[Results](website-audit-enterprise-browser-collector-results.json) bind collector/proxy/test source hashes, synthetic captures and the four public read probes. Retained raw JSON directories are listed in that manifest. Synthetic captures do not authenticate any provider.

The browser test verifies an allowed dataLayer event, no raw payload retention, rejection of imported authority/actions, actual denied POST/off-origin requests, and pinned fixture transport. Separate HTTP and HTTPS loopback probes use both parsed-request and TCP-connection counters: neither reaches the backend. A page containing an infinite JavaScript loop returns timeout evidence in 1,507 ms under a 1,500 ms collection deadline, with no cleanup timeout. Seven proxy regression tests cover headers/pinning, credentials/method/body denial, private DNS, redirect rechecking, cancellation, CONNECT validation and admission/event bounds.

## Public read probes

The user previously authorized audits of these four sites. This run uses only anonymous read access to the named site/canonical origins; no forms, leads, bookings or payments were submitted. All four collected a DOM snapshot and returned partial coverage:

| Site            | Observations | Gaps                                      |
| --------------- | -----------: | ----------------------------------------- |
| Cake            |          117 | Blocked/failed requests                   |
| Infinity Racing |           27 | Blocked/failed requests                   |
| QuokkaGuide     |           79 | Blocked/failed requests; transport denial |
| VBA             |           87 | Blocked/failed requests                   |

Observation counts are captured records, not checks passed, defects, precision or commercial quality scores. Root-origin restrictions intentionally leave other resource requests blocked. This run does not supersede the earlier [reviewed public pilot reports](enterprise-public-pilot-20261118/README.md).

## Independent review

Review found and verified fixes for HTTP transport beginning after a disconnected/timed-out client, unbounded retained denial events, a hung renderer preventing collector completion, and missing transport-truncation reporting. Regression tests reproduce these cases. An additional evidence review strengthened the HTTPS negative control from counting parsed HTTP requests to counting TCP connections, avoiding an unsupported no-bypass claim.

Final independent verification matched all four recorded source hashes, both synthetic captures and all four public captures against the dossier. The reviewer independently reran the browser controls: zero backend TCP connections for HTTP/HTTPS loopback probes and renderer timeout in 1,511 ms. No material finding remained within this bounded source/evidence review.

Repository gates passed: format, lint, typecheck, build and diff; **87 files / 703 tests** passed with unchanged per-test timeouts and two workers. Tracked-documentation checks passed 14/14 after staging. Browser integration runs are separate from that unit/integration count.

## Remaining integration

The collector still needs packaging and an approved host invocation contract, robots/rate-policy integration where applicable, request-origin intake, normalized tracking/consent adapters, trusted test-action execution, broader native-host scenarios and immutable report revisions. It is not installed by candidate 0.3.9 and must not be marketed as a finished enterprise browser module. Performance/CWV, accessibility, UX/CRO, authorized optimization/retest and commercial evaluation remain required.

Primary transport/API references: [Playwright proxy and network interception](https://playwright.dev/docs/network), [BrowserContext lifecycle and routing](https://playwright.dev/docs/api/class-browsercontext), [Node HTTP CONNECT handling](https://nodejs.org/dist/latest/docs/api/http.html).
