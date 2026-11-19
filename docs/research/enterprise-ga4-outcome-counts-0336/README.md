# Candidate 0.3.36 — GA4 outcome-related event counts

The packaged supplied-source GA4 projector now supports `keyEvents`,
`engagedSessions`, `transactions` and `ecommercePurchases` when the native
response declares `TYPE_INTEGER` and a canonical nonnegative safe integer.
It preserves the original row and metric grain, existing sampling/thresholding
and pagination limitations, and source privacy. Fractional values, float
types, currency, unsafe integers, aliases and unsupported definitions remain
unavailable rather than rounded or inferred.

Each new observation explains that GA4 measurement does not prove completed
business outcomes. Key-event designation does not change historical data;
GA4 transaction events include refund and subscription events; ecommerce
purchase events exclude in-app purchases and subscriptions. The definitions
come from [Google's Data API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema).
No event metric establishes paid orders, satisfaction, revenue or causality.

Independent review checked the metric definitions, precision and privacy and
ran the provider-report tests. It compared the six pre-existing supported
metrics against the prior implementation and found identical projected values
and text, including quality flags. Provider replay owner files and fingerprints
were unchanged; the generated-report compiler fingerprint changes and prior
proofs are not silently relabeled.

Both extracted archive installations were tested in fresh Codex and Claude
Code projects. Each installed CLI imported a four-metric synthetic response
with eight distinct cell values, assembled a report and kept private dimension
and locator canaries out of JSON, Markdown and HTML. These are script-level
checks, not native host-agent trials. An initial synthetic installation fixture
used duplicate dimension rows and was correctly rejected; the corrected
fixture uses distinct rows.

Component digest: `7091eb1c246ab411cc0589c8a892750170ef696072d26cad5ba32314abed6850`.
Release digest: `3ccffe7b12e1848e0999fe29066be6f2a3664b5426a8f4593cf2edcf81cb2425`.
Archive SHA-256: `6272a6bc838bc4d1f9ea74cf4fe4ee6c5fa0279ebf7332c69f75661047abe356`.

The full repository run passed formatting, lint, typecheck, build and site
checks, with 2,253 tests across 166 files. A subsequent focused run passed 59
provider-report tests after strengthening the multi-metric fixture to distinct
values. No production deployment or enterprise commercial acceptance is
claimed. GA4 account access for the VBA pilot, mixed governed history, native
host trials and the other acceptance gates remain open.
