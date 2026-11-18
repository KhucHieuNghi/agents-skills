# Canonical pilot follow-up — 19/11/2026 (Asia/Ho_Chi_Minh)

[JSON evidence summary](summary.json) is authoritative for this bounded appendix. The earlier customer JSON/Markdown/HTML reports remain unchanged. This appendix is not a full technical SEO audit or commercial release acceptance.

Eight initial homepage captures cover the four authorized sites on desktop and mobile. Four follow-up captures retest Cake after a collector fix and Infinity at its final non-www URL. All 36 check instances remain unknown; there are zero new material findings. Repeated captures are not independent website samples or a precision denominator.

| Website | Observed evidence | Remaining evidence |
| --- | --- | --- |
| Cake | Source head has no canonical declaration in both samples. Follow-up HTTP Link extraction is complete with no canonical target. | Complete rendered capture; owner canonical policy and provider inspection. Absence alone is not a defect. |
| Infinity | www redirects to non-www. Follow-up at the final URL has complete HTTP Link extraction with no canonical target. | Source parsing is conservative around noscript; complete rendered evidence and owner policy. Original redirect scope is not silently reassigned. |
| QuokkaGuide | Source head has one canonical target; HTTP Link layer is complete and empty. | Complete rendered evidence and owner policy. Earlier private GSC evidence remains separately scoped. |
| VBA | Source and header projections remain incomplete. | Resolve source scripting-mode ambiguity, obtain complete headers/rendered evidence and owner policy. A malformed preload parameter is not promoted to a canonical SEO finding. |

## Collector correction and regression evidence

Chromium CDP represents repeated Link fields joined with LF. A new native adapter separates those fields before the strict HTTP parser. Raw HTTP CR/LF rejection remains unchanged. Cake rechecks confirm that its header layer is now complete. VBA's unquoted media type remains unsupported rather than being silently repaired.

Reference: [Playwright Chromium network implementation](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crNetworkManager.ts), alongside [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html). The adapter does not claim general-purpose Link syntax coverage.

Six adapter unit cases cover repeated fields, strict raw parser behavior, malformed independent fields, CR rejection, non-Link privacy and bounds. Native direct Chromium fixtures pass 17 cases, including repeated fields. The authorized collector fixture adds a repeated-header capture; that proxy fixture also passed before the fix, so it is supporting coverage rather than a red-to-green regression proof.

## Provenance and next requests

The initial collector baseline is c7d3c9a. The follow-up uses that baseline plus the CDP adapter change in this commit. Raw private captures stay under build/enterprise-canonical-public-001 and build/enterprise-canonical-public-002; JSON records include exact private artifact and source digests. No raw headers, DOM or tokens are published here. The follow-up source summary accidentally retained an eight-sample label; this appendix corrects the label to four using its actual records and preserves the original summary hash.

Requests remain attached to each exact URL/profile in JSON, including owner role, accepted format and fallback. Website engineering should supply complete rendered evidence or approved dependency origins for a fresh capture. SEO owners should supply preferred canonical URLs and rationale, plus scoped URL Inspection exports where available. No passwords are needed. A complete capture does not prove provider index state, execution authenticity, or enterprise acceptance.

## Independent closure review

A separate AI reviewer (technical_seo_review) found no material issues in this increment. The reviewer reran all six adapter tests and verified both original summary hashes, all 12 private artifact/source digests, check/request/layer mappings, and all 17 native receipt hashes. Collector evidence retained denial, revocation and deadline unknowns with no cleanup warnings. This is an incremental code/evidence review, not human approval or a whole-product acceptance verdict.
