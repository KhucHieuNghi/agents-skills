# Authorized canonical collector development review

Status: integrated development collector under [Task 2d](../plans/website-audit-enterprise-technical-seo.md); not a packaged enterprise release.

## Behavior and evidence

The collector reuses existing authorization and public-web proxy contracts. Host-derived customer/asset/environment/identity scope, copied browser profile and pinned allowed origins cannot be supplied by page content. Every request and final result rechecks live grants. It blocks non-read methods, service workers, WebSockets and origins outside scope; startup through capture has a total deadline. Native response and DOM use the reviewed navigation/isolated-world components. Private source artifacts are distinct from customer report projections.

Initial native trial `build/enterprise-canonical-collector-001` exercised six cases. The independent reviewer repeated those at `build/enterprise-canonical-collector-independent-review-001` and investigated DNS-denial behavior. Both successful and failed historical trials remain retained. Final native evidence is retained at `build/enterprise-canonical-collector-006/evidence.json`: eight cases pass, including live revocation before result acceptance and DNS-denial restrictions.

## Findings and corrections

- **Proxy denial missed by browser events:** a consumed HTTP 403 from the proxy did not trigger requestfailed, allowing rendered coverage to remain complete. The reviewer reproduced this with public DNS initially and a prohibited loopback address for an API fetch. The destination never received that request. Collector now consumes proxy blocked/dropped telemetry before materializing layers, discards rendered targets and retains sanitized counts. The new native regression failed (`-red-004`) before the fix.
- **Cleanup ordering:** concurrent CDP detach and browser shutdown produced spurious incomplete/deadline warnings. A native assertion failed (`-red-002`); cleanup now gives observer detach a bounded head start, then closes owned browser and proxy under the total cleanup deadline. Incomplete cleanup remains explicit.
- **Input budget validation:** root tests exposed null/undefined/oversized body budgets reaching launch. Explicit 1–8 MiB validation now rejects them before any resource creation; the three regressions failed before the fix. The current preflight suite has eleven tests including foreign scope/origin and authority injection.

Fixes are implementer-verified following independent review; a second independent acceptance pass is not claimed.

## Remaining limits

The observation window is DOMContentLoaded plus a declared delay, not app-wide readiness. Blocked requests can change site behavior, so rendered assessment remains unknown. The existing proxy is not a sandbox for arbitrary hostile browser protocols; HTTPS relies on both pinned CONNECT and the browser request gate. Full technical SEO rules, real pilot refresh, immutable report integration, native host evaluation and commercial release evidence remain open. No production website was accessed in these synthetic transport trials; no existing archive was replaced.

Final verification: 11 preflight tests and eight native collector cases pass. Full single-worker suite: 100 files / 1009 tests pass (55.49 seconds). Format, lint, typecheck, build and staged diff checks pass. Package manifests and existing release archives remain unchanged.
