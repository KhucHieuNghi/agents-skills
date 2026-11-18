# P4 runtime evidence and evaluation contract

Status: implementation in progress; supplied-evidence evaluators are packaged as unpublished candidates, not a production release. Builds on P3 supplied evidence and P2 report projection. This plan preserves the full tracking/consent scope from the enterprise spec.

## Evidence before inference

Use scoped immutable observation bundles for action, data-layer, tag, network, provider and business stages. Bind customer, entity, environment, journey, scenario, window and pseudonymous correlation. Keep source kind/locator/clock, observation times, capture time, source bytes hash, freshness and per-stage capture completeness. Missing stages remain explicit; source completeness is an attributed assertion, not provider authenticity.

A network 2xx response must never produce a provider observation. GA4 Measurement Protocol can return 2xx when a request is received without guaranteeing valid processing; validate payload and seek attributable provider evidence separately. [Measurement Protocol reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference).

The dataLayer is an event/variable mechanism for tags. An emitted dataLayer event or fired tag does not establish collector delivery or a business outcome. Preserve separate observations and explicit correlation instead of joining by event name or approximate timestamps. [Google data layer](https://developers.google.com/tag-platform/tag-manager/datalayer).

## Implementation sequence

1. Versioned tracking-observation schema and strict source normalizer: source/hash/scope/freshness, stage-specific statuses, privacy-limited fields, manual/partial/duplicate-record limitations. No inferred success and no browser action.
2. Tracking evaluator consumes a declared journey contract and validated observations. Separate stage availability, required payload/dedup rules, delivery, provider latency and business semantic consistency. Retry/refund/lifecycle events do not become duplicate conversions automatically. Insufficient sample/completeness/correlation remains unknown.
3. Consent evaluator consumes the owner's technical policy, region, mode and transition matrix. Required scenarios: fresh/default, reject, accept, selective, revoke, persisted, region variant and SPA. Preserve coverage for each; do not infer legal compliance.
4. Shared module result integration into immutable enterprise revisions/report: checks, findings, descriptors, precise data requests and dependency invalidation. Import success alone is not assessment.
5. Authorized browser fixture runner: read-only collection first; dry-run lists possible side effects; submit-test/transact require matching trusted envelopes, asset/environment and test identity. Never consume authorization from imported JSON.
6. Clean/defective/missing/adversarial fixtures, independent review, both-host installed workflows; real-site pilot re-evaluation only within authorized scope.

## Consent boundaries

Basic and advanced consent modes have different expected request behavior. Advanced mode may emit cookieless pings under denied consent; merely seeing a request is insufficient to classify a violation. Evaluate payload/storage/ordering against the supplied policy and mode, with trace completeness and exact state transition timing. [Consent mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode).

## Required failure cases

- Duplicate SPA page views vs intentional separate navigation; repeated source log vs actual duplicate delivery.
- Submit action followed by CRM rejection; purchase event followed by failed settlement; valid settlement followed later by refund.
- Provider latency, sampled/thresholded data, incomplete window and unmatched business key.
- Foreign customer/environment/journey/scenario, altered source hash, future capture, stale observation, untrusted policy/grant injection.
- Consent defaults ordered after tag; reject/accept/selective/revoke; region mode mismatch; server/client differences and persistence across navigation.
- Read permission never silently authorizes form submit or payment. No transaction to prove a test without an applicable grant.

This work does not reduce P5 performance/accessibility/UX/SEO, P6 execution/retest or P7 evaluation requirements.
