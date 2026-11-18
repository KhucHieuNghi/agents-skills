# Native canonical DOM projection review

Status: development native-projection foundation. The [technical SEO plan](../plans/website-audit-enterprise-technical-seo.md) still requires a production collector, full technical rules, canonical report integration and commercial evaluation.

## Runtime evidence

The loopback Chromium harness stores original response body bytes (base64), response headers, source and rendered DOM projections, redirect chains, evaluator inputs/results and file/body/DOM hashes in new output directories. No production website was accessed by this trial. These files remain private under build; hashes establish artifact consistency rather than authenticated execution or commercial quality.

Initial trials `build/enterprise-technical-seo-native-001` and `-002` passed 13 fixtures. An independent reviewer reran those fixtures at `build/enterprise-technical-seo-independent-review-001`. Fixtures include base URLs, source/render changes, JS-only canonical, conflicting/malformed headers, inert body/template links, noscript, unsupported modifiers, changed DOM URL, redirect, 404 and mobile variation. Network is denied for the separate inert source parser context.

## Independent findings and fixes

1. **Foreign base namespace:** source extraction incorrectly applied an SVG base element that the live browser ignored, inventing a canonical conflict. It now selects the first applicable HTML-namespace base. The native regression failed before the fix (`-red-003`).
2. **Untrusted main-world globals:** page script could replace URL and falsify extracted targets. Rendered extraction now uses a fresh Chromium CDP isolated world, checks frame/loader/URL stability and detaches afterward. The native adversarial case failed before the fix (`-red-004`) and passed with isolation (`-005`). A second hostile fixture replaces DOM query methods and Date; the final trial also checks captured time against host times.

Final native trial `build/enterprise-technical-seo-native-006` passes **16 fixtures**. A separate four-case unit suite checks same-URL loader replacement, stable frame binding, protocol error privacy and invalid arguments. The fixes and new helper were verified by the implementer after the independent findings; a second independent acceptance pass is not claimed.

## Remaining boundaries

The projector does not navigate, grant permission or authenticate a supplied source. Isolated intrinsics protect extraction from page monkey-patching, not malicious page content. Frame stability during DOM capture does not yet bind an earlier response to that exact navigation instance. The native harness uses declared UTF-8 fixture responses; charset handling, aborted response handling, source/render capture timing, production proxy/authorization, resource budgets and deadlines remain collector work. Noscript in inert source yields unknown, not a guessed canonical. Raw DOM/headers must not be published as customer reports.

## Sources

[DOMParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString) documents inert parsing and possible resource loading; the parser context therefore denies network. [Playwright Response](https://playwright.dev/docs/api/class-response) supplies body and repeated headers. [CDP Page](https://chromedevtools.github.io/devtools-protocol/tot/Page/) provides isolated worlds and frame identity. Implementation code is original.

Final verification: 16 native Chromium fixtures pass; 4 focused collector-helper tests pass; full repository suite passes 98 files / 981 tests (54.20 seconds). Format, lint, typecheck, build and staged diff checks pass. The skill package, release manifest and existing archives are unchanged.
