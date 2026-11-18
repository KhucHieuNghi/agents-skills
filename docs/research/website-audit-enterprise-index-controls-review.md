# Googlebot index controls: implementation and review

Status: development evaluator, native projection and enterprise report integration. Public collector composition, installed packages and commercial acceptance remain open.

## Contract

The module evaluates three bounded owner-intent comparisons: direct response status, Googlebot robots policy and page indexing directives. Whole-document source/rendered projections and separate X-Robots-Tag fields retain positive noindex evidence. Page and robots clocks expire independently and must fit the declared observation window. Unknown intent/coverage produces actionable requests. No local check establishes indexed state, crawler authentication, meaningful content, soft404 status or conversion impact.

Reuses the repository's existing robots parser, not its conservative collection permission gate. The source of the adapted code remains NKSkills; no external implementation was copied. The existing package digest is unchanged.

Official sources checked 2026-11-19: [Google robots interpretation](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec), [robots meta and header rules](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), and [JavaScript indexing guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). Google can respect body robots meta; noindex encountered before rendering may prevent later JavaScript from changing the outcome. The evaluator's conservative unknown handling is product policy, not a complete Google crawler simulation.

## Independent review and corrections

A separate AI reviewer identified two P2 issues, both fixed with red-to-green regressions:

1. Head-only completeness could miss body noindex. The supplied contract now requires sourceDocument/renderedDocument and rejects head-only shapes; native extraction includes head and body.
2. Malformed parameter values could become false noindex evidence. Colon-bearing parameters are handled atomically; independently comma-delimited noindex remains observable.

Implementation review also reproduced and fixed mixed-agent header attribution and robots observation-window omission. A native fixture initially expected SVG-shaped markup to remain foreign; Chromium actually reparents its meta as HTML. That expected result was corrected, and a separate true foreign-namespace fixture now verifies exclusion. This was a fixture expectation correction, not evidence of an engine regression.

## Evidence

- 38 evaluator cases cover source/rendered noindex, restrictive none, independent freshness, unknown intentions, applicable agents, parameter ambiguity, robots status handling, malformed policies, allow precedence, redirects and foreign scope/hash/time rejection.
- 16 workflow tests include index controls, separate expiry, immutable reports, raw robots text privacy and retained prior integration cases. The new controls case rejects robots evidence outside its window before writing output.
- Ten Chromium native fixtures pass in build/enterprise-index-controls-native-003. An independent run also passed all ten in build/enterprise-index-controls-independent-review-001. Fixtures cover clean documents, body noindex, JavaScript insertion/removal, inert templates, HTML parser repair, actual foreign namespaces, page-global tampering, noscript ambiguity and repeated headers. Raw loopback artifacts and receipt hashes remain under build; they are synthetic, not a real-site quality score.

## Limits and remaining work

Only Googlebot text-search policy is evaluated. Other crawlers require separately verified semantics. unavailable_after, embedded-content conditions and mixed-agent combined-header grammar remain unknown. Native source parsing with noscript is incomplete. The isolated helper requires caller-owned total timeout and transport/authorization integration. Complete real-site capture, broader technical rules, packaged CLI, fresh dual-host installations and cross-module enterprise acceptance remain open. No findings are deferred as accepted risk in this increment.
