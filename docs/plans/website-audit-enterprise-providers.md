# P3 provider adapters — implementation contract

Status: implementation plan, not completed capability. Checked against current source and official documentation on 2026-11-18. Depends on the P2 report/evidence contract; P4 runtime tracking remains separate.

## Existing code to reuse

- `analytics.mjs` imports supplied GA4 runReport pages, preserves metric strings/types, metadata and per-page receipts. It checks pagination against provider rowCount and does not infer population completeness or cross-row totals.
- `search-console.mjs` imports supplied Search Analytics response pages with property/query/window and response hash. It retains unknown pagination and top-row limitations; missing rows do not mean zero.
- `bing.mjs` handles supplied GetQueryStats and attributed AI dashboard mappings. It preserves approximate/range/unknown precision and does not infer whole-site coverage.

Do not modify these legacy contracts to fit enterprise state. Wrap their validated receipts in an enterprise adapter and keep the immutable 0.2.0 compatibility regression. GTM configuration and business outcomes need new adapters.

## Provider boundaries verified in primary documentation

GA4 rowCount describes the query result independently of the current page's limit/offset; response metadata and optional aggregates must remain attached. Export pagination alone does not establish tracking correctness. [RunReportResponse](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/RunReportResponse).

Search Analytics can prioritize top rows and has internal limits; paging to exhaustion cannot establish every query/page was included. Keep request dimensions, filters, search type, aggregation and data state explicit. [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [getting performance data](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data).

GTM version reads address an explicit account/container/version path. A saved configuration is not evidence that its tags ran, consent was respected, or a provider received a business outcome. Publishing is a separate mutation and is outside P3. [versions.get](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.versions/get), [API overview](https://developers.google.com/tag-platform/tag-manager/api/v2).

Bing Webmaster APIs expose registered-site information; the existing importer remains limited to its explicitly supported supplied formats. Do not invent an AI performance API or equate traffic statistics with AI citations. [Bing Webmaster API](https://learn.microsoft.com/en-us/bingwebmaster/).

## Deliverables and tests

1. `provider-capabilities.mjs`: inspect a trusted host capability inventory, never provider claims from target content. Distinguish unavailable, authentication-expired, permission-denied, quota-limited and usable read capability per asset/operation. No credentials in output. Supported hosts remain Codex and Claude Code. Exports remain usable without connectors.
2. `measurement-config.mjs`: validate supplied GA4/GSC/Bing/GTM snapshots against declared customer/entity/provider/property-or-container/window/query identity. Return enterprise evidence descriptors plus normalized private payloads, limitations and precise data requests. Hashes bind content; do not assert provider authenticity.
3. `business-observations.mjs`: explicit outcome dictionary and attributed CRM/order/booking/subscription exports. Separate attempt, accepted, rejected, settled, refunded and cancelled states. Match identity/window only when supplied; do not infer money or business success from an analytics event name.
4. Fixture coverage: wrong property/container, stale capture, future capture, truncated pagination, changed query, mixed timezone/currency, missing metadata, approximate metric, unsupported schema, foreign customer, expired authorization and partial connector access. Clean, defective and missing cases stay distinct.
5. Integration: import into a new run revision with immutable evidence IDs, reconcile dependent checks, retain missing-data requests and render the same JSON/Markdown/HTML. A successful import does not automatically pass configuration or runtime checks.

Completion requires source review, focused and full tests, actual CLI workflows, updated provenance, candidate packaging and fresh installations. Real-account/native pilots and commercial precision/recall remain P7 gates; supplied fixtures cannot stand in for them.
