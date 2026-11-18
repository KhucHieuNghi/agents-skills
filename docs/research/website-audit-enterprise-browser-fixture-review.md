# Enterprise browser fixture evaluation

Status: repository-owned development evaluation; candidate 0.3.9 package bytes remain unchanged. This is progress on P4 browser fixtures, not a shipped general browser collector or enterprise release.

## Reproduce

Run `npm run test:audit-browser -- build/enterprise-browser-runtime-NEW` from the repository root. The output directory must not exist. The runner uses the existing site Playwright dependency and its installed Chromium; install the site's declared development dependencies/browser when preparing a new evaluation machine. Missing dependencies fail explicitly rather than silently skipping tests.

The fixture starts a fresh local HTTP backend and isolated browser context for every case. Test submissions affect only this synthetic backend. The code invokes existing authorization checks before navigation/test clicks and asserts a read-only grant cannot authorize submission. This does not test a host's real trusted-session integration. HTTP routes are limited to the exact local fixture origin, service workers are blocked and WebSockets are closed. These controls isolate the controlled fixture; they are not a general SSRF/network sandbox for arbitrary websites.

[Playwright's BrowserContext documentation](https://playwright.dev/docs/api/class-browsercontext) explains that routing does not intercept service-worker-handled requests and recommends blocking service workers when relying on interception. Customer-site execution still needs its own scope, transport, credential and side-effect controls.

## Observed matrix

The [results manifest](website-audit-enterprise-browser-fixture-results.json) binds the final harness/fixture source hashes and all 13 JSON artifacts retained under `build/enterprise-browser-runtime-004`. Chromium version: 156.0.8078.4.

| Browser case              | Required observable result                                        |
| ------------------------- | ----------------------------------------------------------------- |
| Clean SPA navigation      | One emitted page view and accepted backend event                  |
| Duplicate SPA navigation  | Data-layer count failure; backend companion remains pass          |
| Accepted lead             | Emitted lead and accepted backend event                           |
| Rejected lead             | Data-layer remains pass; backend forbidden-status fails           |
| Suppressed purchase retry | Two distinct delivery attempts, one explicit suppression          |
| Duplicate accepted retry  | Dedup duplicate-accepted-event; stage companions pass             |
| Refund after purchase     | Separate refund lifecycle; original retry check remains pass      |
| Basic rejection           | No collector request                                              |
| Advanced denied ping      | Permitted cookieless request                                      |
| Denied identified ping    | Exact denied-storage and identified-denied-request violations     |
| Accept then revoke        | Independent default/accept/revoke transitions, cookie removed     |
| Transient denied storage  | Cookie/localStorage writes detected despite subsequent deletion   |
| Incorrect default consent | Transition-mismatch against independently declared denied default |

All **13/13 cases meet their expected behavior**. Six deliberately defective cases must fail their scoped evaluation. This case count is not precision, recall, accuracy across industries or a real customer outcome metric.

## Evidence and review

Browser instrumentation records dataLayer events, consent signals, document.cookie access and Storage API operations; the controlled backend records actual HTTP receipts/cookie presence. Events retain host-observed ordering; expected consent transitions are independently declared. Bindings are drained before ending the finite capture window. The evaluator consumes exact hashed source envelopes with synthetic=true. Separate clocks are not represented as causally synchronized provider evidence.

The independent reviewer found and verified closure of three test weaknesses: self-derived consent expectations, missing transient-storage observation, and aggregate-only failure assertions. The revised harness uses independent expectations, storage instrumentation and exact finding/clean-companion assertions. Reviewer verified 13 artifact hashes and independently replayed all saved evaluations. No remaining material finding in the controlled fixture scope.

## Limits and next work

The collection code is specific to an owned synthetic app. It does not authenticate GA4/GSC/Bing/CRM data, observe arbitrary CMP implementations, test native Codex/Claude behavior or establish production readiness. Cookie Store API, IndexedDB, service-worker behavior, cross-session persistence, selective/region/cross-domain journeys and broader performance/accessibility/UX modules remain outside this fixture set. The consent completeness flag covers only the declared controlled fixture capture, not arbitrary browser activity.

A reusable customer collector must preserve these distinctions, emit missing/unobserved capabilities, and integrate authorized actions, raw evidence and immutable JSON/Markdown/HTML report revisions. P4 and the full enterprise goal remain open.

## Final verification

Repository gates passed: format, lint, typecheck, build and diff checks; **86 files / 696 unit/integration tests** passed, with **14 tracked-documentation tests** passing after staging. These are separate from the **13 real-browser fixture cases**. The independent reviewer verified the final two harness source hashes, all 13 artifact hashes, identical replay of every evaluation and the manifest/dossier claims. Candidate 0.3.9 remains unchanged; no new solution archive or production deployment is claimed.
