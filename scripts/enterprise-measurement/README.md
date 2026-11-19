# Measurement configuration assessment (development)

`config.mjs` exports `evaluateMeasurementConfiguration({kind,input,context,contract})`. It is a pure development evaluator, not a bundled customer CLI, live account connector or completed measurement audit. The locked candidate remains unchanged. See [the next implementation contract](../../docs/plans/website-audit-enterprise-measurement-assessment.md).

`input` has exactly `customerId`, `entityId`, `payload`, using the existing supplied `ga4-config` or `gtm-version` normalization format. `context` has exactly `run`, `entityId`, `resource`, `versionId`, `windowId`, `maxAgeSeconds`. Use null `versionId` for GA4 and the exact container version ID for GTM. Do not pass the importer's `expectedTimezone` or `expectedCurrency`: these expectations belong in the assessment contract, where a mismatch becomes a check result instead of an import rejection.

`contract` is null when not supplied, otherwise it contains exactly:

```json
{
  "schemaVersion": 1,
  "contractId": "commerce-measurement-v1",
  "customerId": "customer",
  "entityId": "measurement",
  "resource": "properties/123",
  "versionId": null,
  "ownerRole": "measurement-owner",
  "confirmedAt": "2026-11-19T10:00:00Z",
  "validUntil": "2026-11-20T10:00:00Z",
  "expectations": [
    {
      "id": "purchase-counting",
      "rule": "ga4-key-event-counting",
      "subject": "purchase",
      "expected": "ONCE_PER_EVENT"
    }
  ]
}
```

The caller must obtain the owner contract separately from untrusted target content. These fields are supplied assertions, not authentication or permission to mutate. The example is synthetic and does not prescribe `purchase` for every business. A key event definition does not establish settled payment.

| Rule                        | Subject                                 | Expected value                                                   |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `ga4-timezone`              | null                                    | Valid IANA/Intl timezone; aliases compare by canonical Intl zone |
| `ga4-currency`              | null                                    | Uppercase three-letter currency code                             |
| `ga4-web-measurement-id`    | Full property/dataStreams resource name | `G-…` measurement ID                                             |
| `ga4-key-event-counting`    | Event name                              | `ONCE_PER_EVENT` or `ONCE_PER_SESSION`                           |
| `gtm-tag-paused`            | Tag ID                                  | Boolean                                                          |
| `gtm-tag-firing-triggers`   | Tag ID                                  | Unique numeric string IDs, exact set                             |
| `gtm-tag-blocking-triggers` | Tag ID                                  | Unique numeric string IDs, exact set                             |
| `gtm-trigger-present`       | Trigger ID                              | true                                                             |
| `gtm-variable-present`      | Variable ID                             | true                                                             |

Each expectation has exactly `id`, `rule`, `subject`, `expected`; IDs and rule/subject pairs are unique. There are 1–100 expectations per contract; each trigger set has at most 100 IDs. Numeric identity is matched exactly, not by display names. GTM variable presence does not verify its expression or use by a tag. No implicit built-in trigger inventory or variable-template execution is performed.

For absence findings, provide `payload.collections.<collection>.complete: true` and no nonempty nextPageToken. GA4 uses `dataStreams`/`keyEvents`; GTM uses `tag`/`trigger`/`variable`. An omitted array is unknown even when a receipt says complete; an explicit empty array with a complete receipt can establish absence within the supplied export. A single matching event name requires complete key-event pagination because another page may contain an ambiguous match. Present numeric-ID objects can be assessed independently of other missing pages. Omitted fields are unknown, not silently defaulted to false or an empty trigger list.

Source normalization and full evidence digests are recomputed. Stale/deleted source or expired contract produces unknown checks, preserving requests; foreign scope, unsupported/malformed contracts, contradictory pagination and malformed observed fields reject input. A rejected input is not a website defect. All input must be plain JSON: no getters, cycles, sparse arrays, nonfinite values, undefined or custom prototypes. Limits are depth 32, 20,000 nodes, one MiB aggregate string/key characters and two MiB serialized UTF-8. An acquisition layer must report exceeded limits and request an appropriate scoped export without silently dropping rows.

Output has per-expectation checks, targeted requests with owner/resource/fallback, source/evidence/contract digests, provider gaps and an overall digest. It does not expose raw configuration fields in check text. It is a private intermediate assessment, not the P2 customer-report schema. The source, contract and assessment timestamp must be retained for replay. Runtime, publication, provider/contract authentication, business outcome and independent acceptance flags remain false. Do not interpret all declared checks passing as full measurement correctness.
