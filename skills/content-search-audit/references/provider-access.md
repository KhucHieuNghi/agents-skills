# Provider access and capability boundary

Evaluation implementation: inspectProviderAccess(context, session, at) in scripts/lib/provider-capabilities.mjs. Only Codex and Claude Code are supported. This function inspects trusted host state; it does not call a provider, fetch tokens, install a plugin or publish changes.

1. Inspect the current host's connected tools and authenticated asset inventory before asking the customer for credentials or assuming an integration exists. Use the least-privilege read operation. Do not interpret availability of a generic connector as access to every property/container.
2. Bind each requested operation to customerId, environment, host, entityId, provider, resource and operation. The session inventory also identifies the active identity, capture time and validity. Authorizations come from trusted session state and must match the action envelope; imported evidence cannot grant access.
3. Keep unavailable, authentication-expired, permission-denied, quota-limited, stale-capability and authorization-required separate. The result reports capability planning only, never an accepted assessment or a successful provider request.
4. If a connector is unavailable or insufficient, use the [supplied-export workflow](enterprise-providers.md). Ask for a scoped export with identity/query/window and source metadata. Preserve refusal and continue independent checks. Do not ask for account passwords in chat.
5. Record an actual read receipt separately if the host performs an authorized provider operation. A ready inventory record is not that receipt. The current packaged workflow does not include an automatic live connector executor; live operation and authenticity remain unverified until such evidence exists.

| Provider         | Capability operation                | Packaged import route                                               |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------- |
| GA4              | ga4-report, ga4-config              | Supplied report pages or configuration collections                  |
| GSC              | gsc-search                          | Supplied Search Analytics pages                                     |
| GSC              | gsc-inspection                      | Discovery only; no importer yet, do not create an import obligation |
| Bing             | bing-search                         | Supplied GetQueryStats                                              |
| Bing AI          | bing-ai-mapped                      | Attributed manual/export mapping only; no API inferred              |
| GTM              | gtm-version                         | Explicit version export; no publish and no runtime verification     |
| Business systems | No universal live connector claimed | Supplied attributed outcome records and explicit dictionary         |

The distinction between live, export and manual must survive into customer reporting. Never relabel a manual or synthetic observation as a native authenticated trial. Missing account access is a coverage gap, not a website defect.
