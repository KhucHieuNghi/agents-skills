# Enterprise provider exports (evaluation)

This workflow plans and imports supplied evidence. It performs no network reads, publishes no GTM versions, and does not establish a passed audit. Capability inspection is a separate library using trusted host session state; never treat a JSON export as a connector authorization grant.

See [provider access](provider-access.md) for trusted host inventory and live/export/manual boundaries.

## Supported ingestion

| Kind                  | Bound resource                               | Additional target contract                                                                                                                          |
| --------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ga4-report            | properties/123                               | expectedQuery: absolute dates (or supported cohort request), metrics and optional dimensions/filters; no limit/offset                               |
| ga4-config            | properties/123                               | Property + dataStreams/keyEvents collections, explicit completeness/pagination metadata                                                             |
| gsc-search            | sc-domain:example.com or URL-prefix property | expectedQuery: absolute startDate/endDate; dimensions/type/aggregationType/dataState defaults are materialized before hashing; no rowLimit/startRow |
| bing-search           | Site URL                                     | expectedScope: locale, market, timezone, period, surfaces, each explicitly supplied                                                                 |
| bing-ai-mapped        | Site URL                                     | Same scope; attributed dashboard mapping, not an invented AI API                                                                                    |
| gtm-version           | accounts/123/containers/456                  | Explicit numeric versionId; configuration only, no runtime/publication inference                                                                    |
| business-observations | Declared source-system name                  | dictionary + absolute half-open UTC window; outcomes and allowed/success statuses explicit                                                          |

`gsc-inspection` is present in capability discovery but has **no ingestion adapter yet**. Planning it fails before creating a run or data request. Do not request an unsupported export and later label the customer's supplied file invalid. Track URL Inspection separately as unfinished work.

Planning validates the local supported importer contract, not remote API metric compatibility, permissions, quotas or actual resource existence. Duplicate GA4 metric/dimension names and incompatible GSC timezone declarations are rejected. Search Analytics dates use America/Los_Angeles; do not silently relabel them UTC.

## Immutable plan → import → assessment

1. Start from an existing enterprise run directory. Read and verify its canonical digest with the enterprise tooling. Use the digest of that exact run, not a report hash or a file-byte hash.
2. Write a plan bundle with sourceDigest, a distinct newRunId, nondecreasing assessmentAt and nonempty targets. Each target binds kind/entityId/resource/windowId/maxAgeSeconds and its provider-specific fields. maxAgeSeconds is 1 through 31,622,400. Keep windowId descriptive but opaque; do not put customer personal data in IDs.
3. Run `node scripts/audit.mjs enterprise-provider-plan SOURCE PLAN.json NEW_DIRECTORY`. Keep the returned targetId. GSC defaults are normalized before this ID is hashed; do not derive the ID from an unnormalized input yourself.
4. Supply an import bundle for the planned run: sourceDigest, distinct newRunId, assessmentAt and imports entries shaped as `{ "targetId": "BOUND_ID", "input": { ... } }`.
5. Run `node scripts/audit.mjs enterprise-provider-import PLANNED IMPORTS.json NEW_DIRECTORY`. Valid exports become bound evidence; invalid exports remain explicit invalid requests while other inputs can continue. Declined requests remain declined until an explicit enterprise-revise reopen response.
6. Inspect limitations and assess checks separately. Import does not pass a check. Replacing evidence invalidates dependent verdicts and retains historical evidence. Build/revise the report from the new source run using the enterprise report workflow.

Example GA4 target (replace resource/entity/window with confirmed customer scope):

```json
{
  "kind": "ga4-report",
  "entityId": "analytics-property",
  "resource": "properties/123",
  "windowId": "october-2026-landing-pages",
  "maxAgeSeconds": 86400,
  "expectedTimezone": "Asia/Ho_Chi_Minh",
  "expectedCurrency": "VND",
  "expectedQuery": {
    "dateRanges": [{ "startDate": "2026-10-01", "endDate": "2026-10-31" }],
    "dimensions": [{ "name": "landingPage" }],
    "metrics": [{ "name": "sessions" }]
  }
}
```

## Supplied payloads and missing data

GA4/GSC/Bing/GTM inputs use `{customerId, entityId, payload}`. Preserve the source capture time, sourceId and explicit synthetic flag. Report exports retain the original responseText plus its SHA-256 and request pagination; an edited or reconstructed response must not masquerade as the original provider export. GA4 config and GTM version use their explicit configuration envelopes. Packaged examples: [GA4 configuration](../examples/enterprise-ga4-config.json) and [GTM version](../examples/enterprise-gtm-version.json). Each file contains a target for the plan bundle and an input for the import bundle. After planning, use the returned targetId with that input. These are synthetic examples: keep synthetic=true when exercising them; replace identifiers, timestamps, actual provider payload and completeness declarations with real evidence for an actual customer run. Empty GTM collections in the example are not a recommended production configuration. Business inputs use their source-system envelope directly, with dictionaryVersion, sourceKind, capture time, provenance and records.

A provided export is not proof of authentic provider origin. Keep providerAuthenticated false. Retain sampling, thresholding, incomplete pages, missing metadata, unknown precision, stale evidence and manual-assertion limitations. No rows is not proof of no activity. Missing backend outcome does not become a successful conversion because an analytics event has a promising name.

Ask for the smallest missing artifact: property/site/container identity, exact query/window, next export page, timezone/currency, config collection completeness, allowed outcome dictionary, or attributed manual evidence. Record refusals and continue independent checks. Do not request credentials in chat or copy raw business identifiers into customer/public report projections.
