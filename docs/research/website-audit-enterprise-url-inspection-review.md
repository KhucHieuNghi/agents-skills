# URL Inspection adapter and report integration

Status: development; not a released package or enterprise acceptance. Implements the supplied-provider portion of technical SEO Task 3 and connects it to Task 4 reporting. A native authorized execution adapter in the customer CLI remains open.

## Contract and source basis

Original provider JSON is kept with exact property/request, customer/entity/environment and host receipt time, protected by an artifact digest. A digest establishes byte integrity, not provider authenticity. Google-selected and provider-reported user canonical stay separate from browser declarations. Missing values remain missing; URL-prefix/domain containment is checked. No property-wide count or live-page conclusion is derived.

Official references checked 2026-11-19: [inspect method](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect) establishes indexed-version-only behavior and request property scope; [result schema](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult) defines provider fields and enums. Owner-intent comparison and freshness limits are product policy, not Google's acceptance criteria.

## Independent review and regression fixes

- Adapter review found a precision defect: sub-millisecond retrieval could produce passing checks whose serialized expiry was already reached. The regression failed before the fix. Host retrieval/assessment now support seconds or three fractional digits; provider crawl timestamps preserve up to nine digits.
- New workflow integration review found that unsupported verdict text could be copied into reports. A sentinel regression demonstrated the leak before the fix. Only known verdicts appear in customer descriptions; unknown text stays in private source/evaluator evidence.
- 25 adapter tests and 15 workflow tests pass. Coverage includes intent/no intent, missing and unknown verdicts, expiry, nanosecond crawl validation, foreign scope/property/URL, hash and duplicate-key rejection, provider/local separation, private-text exclusion, immutable replay and the earlier revision safeguards. No review finding is deferred.

## Connected-data trial

A fresh read-only OpenSEO URL Inspection call retrieved one authorized pilot homepage result. The exact connector response and host started/retrieved timestamps are retained privately in build/enterprise-url-inspection-003. The older pilot receipt had only a retrieval date; it was not assigned an invented precise timestamp for this adapter.

Original result was wrapped without rewriting provider fields, evaluated, forked into an enterprise source run and rendered as JSON/Markdown/HTML. Both owner-intent checks remain unknown because owner policy was not supplied; no website finding was invented. Reports load with integrity validation. Two offline Chromium viewport checks (390 and 1280 px) pass with no overflow, scripts or outside requests. Account observations and raw provider URLs remain in the private customer dossier rather than public catalog evidence. The report is review-pending, not a released product verdict.

## Remaining work

The packaged CLI still needs capability/authorization integration for native provider execution and installed-host tests. Cross-capture contrast needs explicit time alignment and scope; provider evidence must not be used to certify live DOM. Complete robots/noindex, hreflang, structured-data, crawl graph, native multi-host evaluation and enterprise acceptance remain open.
