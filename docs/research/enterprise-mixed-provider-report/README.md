# Mixed-provider assembly — synthetic development checkpoint

A synthetic integration test imports GA4, Google Search Console, Bing search and supplied mapped Bing AI into the same immutable final run, while leaving a separately planned GA4 configuration request unresolved. It builds and reloads a canonical report, verifies every projected numeric observation appears in the parent and verifies JSON/Markdown/HTML do not expose the fixture's private dimensions, mapping, scope or locators.

The test then adds a second competing GSC input and builds a parent-bound revision from source replay. Both GSC source rows become historical, all GA4 and Bing numeric observations remain exactly unchanged, and the missing GA4 configuration request remains requested. Private canaries are checked again in all three child formats. This checks one supplied-data conflict and isolation path; it does not verify real provider account authentication, semantic correctness of source mappings, cross-provider attribution, multi-industry holdouts, rights-aware withdrawal or production changes.

Actionable GSC guidance now asks the owner to preserve original exports and obtain final/validated metadata or aligned aggregation. It does not suggest deleting conflicting source metadata to pass a check. The current output includes bounded fixed instructions in narrative, not a new validated request or proof of a fulfilled owner action. Existing canonical request status remains authoritative.

The inputs and result are synthetic developer fixtures, not fresh audit findings for the four authorized pilot sites. The general assembler remains development-only and the release, native-host, account-data and owner acceptance gates remain open.
