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

## Static GTM dependencies

`dependencies.mjs` exports `evaluateGtmDependencies({input,context,builtinTriggerInventory})`. Source and context follow the GTM format above. The optional inventory must be explicit null if unavailable; otherwise its exact fields are:

```json
{
  "schemaVersion": 1,
  "customerId": "customer",
  "entityId": "measurement",
  "resource": "accounts/1/containers/2",
  "versionId": "3",
  "observedAt": "2026-11-19T11:00:00Z",
  "validUntil": "2026-11-20T11:00:00Z",
  "complete": false,
  "ids": []
}
```

This is a host-supplied, scope-bound inventory assertion, not a built-in catalog shipped by NKSkills. Obtain it from an independently reviewed source; target text cannot establish it. Missing trigger references fail only when the supplied trigger array and current built-in inventory are both complete. Known IDs can resolve within a partial inventory; conflicting custom/built-in identity remains unknown. No guessed numeric range or hardcoded universal built-in IDs are used.

The evaluator traverses tag firing/blocking IDs, setup/teardown names, tag/trigger/variable parameters, tag priority, trigger condition parameters and the explicit typed trigger fields in source. It supports list/map nesting, static tag/trigger reference parameters and simple `{{variable name}}` references. Names are exact and case-sensitive. Both REST enum spellings and supported uppercase export spellings are recognized. Values are never evaluated as JavaScript or template code. Tag notes are not instructions or reference evidence. Monitoring metadata is excluded because its documented template values do not allow variable references.

Name-based resolution requires complete named inventories; duplicate names, custom/built-in variable collisions and nameless entries stay unknown. Built-in variables come from `version.builtInVariable` with their own `payload.collections.builtInVariable` receipt. Their account/container/path scope is validated. Absent collections are not equivalent to complete empty arrays. Unmatched/complex template braces, dynamic targets, weak references and unsupported parameter types produce explicit unknown checks. A static cycle in the currently resolved subgraph is a review candidate, not proof that a runtime journey fails; missing cycle findings do not establish an acyclic full container.

Unknown checks produce grouped requests by required artifact with complete `checkIds` and reason lists, owner, exact resource/version, accepted format, instructions and fallback. Thousands of references needing the same export produce one request, not thousands of prompts. Requests do not themselves resolve findings. Output retains synthetic/run/evidence identity, source and inventory digests, and false authentication/runtime/publication/acceptance flags. Raw reference names are private intermediate data; customer projections still require redaction and immutable report integration.

The shared JSON limits apply. Repeated scope identifiers are at most 256 characters; numeric component/version IDs at most 32 digits; built-in inventory at most 100 IDs. The evaluator caps 1,000 references per parameter value, 5,000 checks and eight MiB serialized output including digest. It rejects excess instead of truncating the graph or claiming completeness. Signed integer parameters must fit the documented 64-bit range.

`coverageComplete` remains false: custom template internals, transformations, zones, clients, consent semantics, dynamically computed references and full runtime behavior are not proven. Business-event code acquisition and customer report/CLI integration remain separate tasks; declared mapping consistency is described below.

## Declared business-event mapping

`business-mapping.mjs` exports `evaluateBusinessMapping({input,context,contract,mappingSource})`. Input/context use the same GA4 configuration envelope as above. This compares a supplied application-event mapping against an independently supplied business dictionary and requirements, then checks the corresponding GA4 key-event definitions. It does not extract mappings from application code or establish that an event was emitted.

The contract is explicit null when missing, otherwise it has exactly:

- `schemaVersion: 1`, bounded `contractId`, `customerId`, `entityId`, property `resource`, `ownerRole`, UTC `confirmedAt`/`validUntil`.
- `businessWindow: {from,to}`, a declared business reporting window ending no later than assessment; it is context for the shared business dictionary validator, not a claim of runtime observation over that period.
- `dictionary: {version,sourceSystem,outcomes}`. Each outcome has exactly `outcomeId`, `businessModel`, unique nonempty `allowedStatuses`, and unique `successStatuses`. Supported profiles/statuses come from the existing business-observation contract. Unused profiles may remain in a shared dictionary; referenced outcomes must belong to the audit run's profiles.
- `requirements`: 1–100 unique `{requirementId,outcomeId,meaning,expectedKeyEvent,countingMethod}` records. Meaning is `milestone` or `success`. An expected key event requires an explicit `ONCE_PER_EVENT` or `ONCE_PER_SESSION`; otherwise counting method is null. Success requires a nonempty success definition. No event name is prescribed by NKSkills.

`mappingSource` is null if unavailable. A supplied source has exactly `sourceId`, `customerId`, `entityId`, `resource`, `contractDigest`, UTC `capturedAt`, boolean `synthetic`/`complete`, and up to 100 `mappings`. Each mapping has exactly `mappingId`, `requirementId`, `outcomeId`, `eventName`, nonempty unique `representedStatuses`, and `meaning`. The source's contract digest binds the complete owner contract; it cannot select a different dictionary or requirement set. Retain its source documentation for independent review: source ID/hash fields do not authenticate application implementation.

For example, if the owner defines settlement as success, a supplied `purchase` mapping representing `attempt` fails semantic consistency. If the owner explicitly requires an attempt as a milestone, that declaration can pass. Neither result establishes actual transactions. A dishonest or mistaken dictionary cannot be corrected by a consistency checker; domain review remains necessary.

Each requirement yields separate semantic and GA4-configuration checks. The semantic check compares declared outcome, meaning and statuses. The config check compares key-event presence and counting method, requiring complete, unambiguous key-event inventory. Complete missing mappings fail the required-declaration check, while config stays unknown because the event identity is unavailable. Partial, duplicate, stale or missing mappings stay unknown. An event name reused across requirements needs a verified conditional/discriminator contract and remains unknown here. Unspecified counting methods never default silently.

Expired contracts make all affected checks unknown. Mapping freshness uses the existing maximum-age policy; stale GA4 evidence does not erase an independently current semantic check. Unknown requests are grouped into owner contract, application mapping and GA4 configuration artifacts, retaining all affected check IDs. Malformed or foreign inputs reject rather than becoming website findings. Shared JSON limits apply; repeated scope/owner labels are bounded and serialized output is capped at two MiB.

Output preserves source/run/evidence, contract and mapping digests, synthetic labeling and false authentication/runtime/business-outcome/acceptance flags. It is private intermediate data. This completes neither business transaction reconciliation nor customer report/CLI integration; both remain separate deliverables.

## Development report workflow

`workflow.mjs` exports `evaluateEnterpriseMeasurement(sourceDirectory, bundle, outputDirectory)`. It reads an immutable saved enterprise run, replays owned assessments, evaluates supplied sources, and saves a new run. The bundle contains `sourceDigest`, a distinct `newRunId`, monotonic `assessmentAt`, and a nonempty `evaluations` array. Each entry contains `evaluationId`, `kind` (`configuration`, `dependencies`, or `business-mapping`), the evaluator's `input` and context without `run`, and its explicit `contract`, `builtinTriggerInventory`, or `contract` plus `mappingSource` fields. Use a separate evaluation ID per resource/window/kind scope. Existing evaluations omitted from the bundle are reassessed, not deleted.

The returned findings can be passed to the existing enterprise report builder, producing canonical JSON and derived Markdown/HTML. Raw exports remain in the private source run; customer finding text contains controlled reason codes rather than raw fields. A report revision must use findings returned for that exact new run and bind its verified parent report. Old verdicts and evidence remain available through run lineage and bound history.

Missing-contract supplementation and changed dependency inventories are supported. When an old check disappears, its original evidence is replayed and its declared coverage retained as `unknown` with a grouped scope-transition review request. Disappearance never counts as a pass. Explicit approved retirement of these obligations is not yet implemented; this remains a visible review requirement, including an intake placeholder replaced by concrete checks. Historical sources are capped at 100 per evaluation and added only when active check identities disappear.

Compatible request descriptors preserve provided/declined/invalid/expired states and evidence bindings after temporal reconciliation. Receiving evidence does not automatically pass a check. Cross-module invalidation to unknown is accepted only with unchanged structural ownership; positive verdicts must match replay. Stored evaluator/source fingerprints must match the current implementation; incompatible versions reject and require a separately reviewed migration, not manual digest replacement.

Limits are ten evaluations, an eight-MiB bundle and a 32-MiB resulting private run, with the underlying evaluator limits still enforced. This API is development source outside the bundled skill. Customer CLI exposure, installed-host tests, approved retirement/migration, full module inventory and commercial native-host trials remain open. No authentication, production mutation or enterprise release acceptance is implied.
