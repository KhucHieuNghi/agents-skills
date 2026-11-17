# Corey analytics local-reference review

Read the three local references (`event-library.md`, `ga4-implementation.md`,
`gtm-implementation.md`) and all eight eval cases at immutable revision
`1f837447b20bb6f0e72d87b80ece1c221c362c7d`. All inventoried hashes match the
[support-source receipt](content-search-audit-corey-support-review.json).
Evals and implementation snippets were read, not executed. Decision remains
reference-only; no tracking code, account integration or source pin is inherited.

| Material                         | Useful comparison                                                                       | Excluded inference or operation                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event library                    | Define the business action, trigger, properties and intended decision                   | Internal taxonomy is not a provider's automatic event vocabulary. `purchase_completed` is not automatically GA4 `purchase`; a custom `session_started` cannot silently become provider sessions.     |
| GA4 enhanced-measurement section | Check actual event names/parameters and separate video starts, progress and completions | A filter mismatch is not proof of missing collection. Summed video event counts do not equal unique viewers or journeys.                                                                             |
| GTM form listener                | Identify the exact point where an event is emitted                                      | The example listens to browser `submit`, while the event library describes a successful send. It has no server-success check; do not interpret that code alone as a completed lead or accepted form. |
| Canonical numeric price example  | Separate missing/invalid values from explicit zero; retain currency and units           | It is one nonnegative decimal contract, not a generic parser for localized money, refunds or every event type. Do not install it during a content audit.                                             |
| Data layer and identity fields   | Trace application action to exported event and measurement grain                        | Raw query, error, account, URL or form values can contain unrelated private information. Audit only supplied/authorized fields; no blanket instruction to collect every listed parameter.            |
| Duplicate-event diagnostics      | Check instrumentation duplication and counting definitions                              | Database and analytics counts can differ by scope, identity, window and collection coverage. Neither is automatically the correct denominator for the other's metric.                                |
| Tracking and Ads setup           | Research leads for separately authorized implementation                                 | No tag injection, account linking, conversion import, audience activation, production publishing or tool installation is authorized by the audit.                                                    |

## Current primary-document checks

Checked 2026-11-16. These checks establish documentation, not access to a user's
property, its configuration or legal compliance.

- The GTM reference still prescribes a GA4 Configuration tag. Google's documentation
  says the Google tag replaces it. Do not import the old setup as current instructions.
  [Google announcement](https://support.google.com/tagmanager/answer/13543899?hl=en).
- The GA4 reference's conversion setup blurs key events and advertising conversions.
  Keep exported field semantics and counting settings explicit; do not relabel every
  business event or GA4 key event as the same conversion metric.
  [Conversions versus key events](https://support.google.com/analytics/answer/13965727?hl=en).
- The GTM example only shows storage consent fields and states that tags respect consent
  automatically. Google's consent documentation includes `ad_user_data` and
  `ad_personalization`, and requires built-in checks or custom configurations. The
  example does not establish correct consent behavior for arbitrary Custom HTML tags.
  [Consent-mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode),
  [implementation guide](https://developers.google.com/tag-platform/security/guides/consent).

Other details, including DebugView navigation/URL activation, retention limits,
audience export types and vendor-specific processing delays, were not independently
reconciled in this pass. They stay excluded rather than being presented as verified.
No jurisdiction-wide compliance conclusion is drawn from a configuration snippet.

## Evaluation disposition

Cases 7 and 8 provide useful measurement counterexamples: incorrect filters do not
justify duplicate instrumentation, and missing prices do not become free products.
These remain read examples, not evidence that our host handles them. Cases 1 and 4
reward an internal event taxonomy; their expected naming must not override provider
contracts. Case 3 lists possible mismatch causes, which need runtime evidence before
becoming findings. Case 5's legal-compliance/setup scope is outside this content audit.
Case 6 delegates to another skill; our customer must retain one entrypoint, with any
unavailable experimental evidence reported explicitly.

The five support packages' local bodies can now be accounted for individually.
External references, vendor integrations and partner-method lineage remain separate
review work; no wholesale inheritance is implied by reading a local file.
