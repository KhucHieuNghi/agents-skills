# Atlas demonstration business

Revision: atlas-draft-1 · 2026-11-19T12:00:00Z · customer

## Scope and decision summary

Report accounting: all declared checks are represented. Assessment coverage: 13.3%.

Site health: failed-checks-observed. Failed checks: 1. Unknown checks: 13. Implementation: proposed.

Independent review: pending (0/14 targets accepted). Review attribution is not proof of reviewer independence.

Measurements attached: 1 historical and 0 current. Historical results do not establish current performance.

## Module coverage

| Module | Declared checks | Pass | Fail | Unknown | N/A | Assessed | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| accessibility | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| analytics | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| consent | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| content-search | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| optimization | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| performance | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| search-measurement | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| technical-seo | 6 | 1 | 1 | 4 | 0 | 33.3% | partial |
| tracking | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| ux-cro | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |

## Declared scope and methods

Run: atlas-evaluation. Inventory: full. Operation: audit. Assessment time: 2026-11-19T12:00:00Z.

Planning stage: intake-only. Profiles: booking, lead-generation.

| Entity | Type |
| --- | --- |
| website | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | medium / low | Source and rendered canonical declarations disagree on /services | The synthetic 11:30 UTC export marks all three layers complete. Source head declares https://atlas.example/services, rendered head declares https://atlas.example/booking, and the HTTP Link projection lists no canonical target. See inputs/page-capture.json:11-28. Both observed URLs pass the scoped format check. The conflict fails consistency, while owner intent remains unknown. | Conflicting declarations give search systems competing signals about which URL should represent the service page. Effects on index selection, discovery, leads and bookings remain unmeasured. | Confirm the intended target with the SEO owner. If a fresh capture reproduces the mismatch, trace which server, template or client code emits each declaration and align the declarations that are present to the approved target. | In a separately authorized fresh window, capture source HTML, rendered DOM and final response Link headers for the same URL, mobile profile and anonymous state. Confirm that all canonical declarations that are present agree with the owner-approved target and that the target is reachable and indexable as intended. Assess Google-selected canonical separately from a scoped URL Inspection export. | canonical-row-a80318ca6fe77dd975eb0b6b1a6a5327ca9953d5658ef385d87390798dd92c77 |

## Assessment details

| Check | Module / entity | Status | Reason | Evidence |
| --- | --- | --- | --- | --- |
| 58ef8f8b651cc4a0814d90edd39428cff1987f9fdce419cd5196548ab27d04cb | technical-seo / website | unknown | Intake only; collect evidence and assess this check |  |
| cc7449a56bd5378c2311132d189b666136c113ac9018d0afe0a3b86a0603235d | content-search / website | unknown | Intake only; collect evidence and assess this check |  |
| d1d90514a029cc1a197edc49d1a6211b6b421aa3c5ecf7d749f169a645a299c4 | search-measurement / website | unknown | Intake only; collect evidence and assess this check |  |
| 1bf4569045de1a73da97ad0a78b1a7d68dfd56ccf1355fbe9201d3decd5e8b4e | analytics / website | unknown | Intake only; collect evidence and assess this check |  |
| 1c122120d8d5af9fd4de1bcd82ef2408727b182acb0fc577b185e445a57f8a97 | tracking / website | unknown | Intake only; collect evidence and assess this check |  |
| 8d81cf8ec25cf061708603d4e4a01a7081ee4bf69e889080324a0035ebbe32f2 | consent / website | unknown | Intake only; collect evidence and assess this check |  |
| cc6a78f63cd3337a20973dac58efea323847dd2b1eb4d5ef9e38f33315a074f6 | performance / website | unknown | Intake only; collect evidence and assess this check |  |
| 7e356eb4fa677636c590046e0baa520c3d56580ca750c0fafa21abe61c070aa9 | accessibility / website | unknown | Intake only; collect evidence and assess this check |  |
| b73b972f78d802b34e171eb108daad6778616b34b46e3b2d3794dd53f8e97297 | ux-cro / website | unknown | Intake only; collect evidence and assess this check |  |
| 246880525d9640d421abd87b546fca54a207110e883962c96cb7340df330ea9b | optimization / website | unknown | Intake only; collect evidence and assess this check |  |
| 5b5a6fd8264e0e0c6a619b14a050be2d9b8fcc2b533265340629d8e469c82cb0 | technical-seo / website | unknown | Capture availability only: capture-unavailable. Supplied attribution; no authenticated collection or semantic SEO acceptance. | seo-acquisition-assessment-7ee5d5841662444cb20e336ffe38325688e8d3310836c696598b607caf519df1 |
| a5e55766d191811b7f364f6eae226f1bd3d69411e4800aa3f767ae183bcc1139 | technical-seo / website | pass | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); observed-target-format-valid. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-fd47123e2e3d6b9a601436fe11afe1678889c478613644f230a612676d4344fd |
| ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | technical-seo / website | fail | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); conflicting-declared-targets. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-a80318ca6fe77dd975eb0b6b1a6a5327ca9953d5658ef385d87390798dd92c77 |
| 7bc44895b036684c354a116a02751575b35d30c9a4b18e0e0557b3a78a4d77dc | technical-seo / website | unknown | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-f43030f1836972f02bb214d63a1a0bdc7f42445f398e9d8a1286d95a01bf6661 |
| 27a2fb8f7b8514c1f93d5ab7ba80098cbcc597db763d79b65a5e49fc608b8f00 | technical-seo / website | unknown | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | canonical-row-70a00a3e817d516e0074b665459c772154e4cdd294839501d0ce2f1c59d3a6ac |

## What to provide next

Requests retain declined, invalid and expired states. A provided artifact does not automatically pass an assessment.

| Artifact / scope | Status / priority | Reason | Accepted formats | How to provide | Access | Owner role | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rendered-page / website | requested / high | Can the declared pages be discovered and interpreted? Evidence is required before deciding. | HTML, browser snapshot | Provide rendered DOM plus URL, capture time, device and HTTP response; retain extraction failures. | Read-only scoped URL | Website owner | Supply repository templates and mark runtime checks pending. |
| content-sources / website | requested / high | Are claims and intended answers supported? Evidence is required before deciding. | Markdown, JSON | Supply claims and their authoritative sources, intended audience and review dates. | Read-only approved material | Content owner | Assess only supplied claims; request domain review for unsupported material. |
| business-context / website | requested / high | Are claims and intended answers supported? Evidence is required before deciding. | JSON, Markdown | Describe business outcomes, target audiences, markets, languages, journey steps and success definitions. For the selected business models, define and provide evidence for these outcomes: form-submit, accepted-lead, qualified-lead, availability, booking-confirmed, booking-cancelled, service-completed. Confirm which outcomes actually apply; profile labels are not business evidence. | No account credentials | Business owner | Use a scoped interview; keep unconfirmed definitions unknown. |
| search-export / website | requested / high | What do attributable search observations establish? Evidence is required before deciding. | JSON, CSV | Export page/query data with property identity, date range, filters, timezone, pagination and source metadata. | Read-only GSC/Bing export | Search owner | Supply attributed dashboard observations with limitations; public crawling cannot prove index state. |
| ga4-report / website | requested / high | Does measurement represent the intended business definitions? Evidence is required before deciding. | JSON | Supply GA4 runReport pages with property, query, dates, metric definitions, timezone, currency and pagination. | GA4 read-only report or export | Analytics owner | Use supplied report export; keep account configuration and instrumentation checks separate. |
| gtm-container / website | requested / high | Does the action map through instrumentation to the intended outcome? Evidence is required before deciding. | JSON | Export the GTM container version being tested; identify environment, tags, triggers, variables and version. | Container export without publish access | Analytics owner | Supply scoped configuration screenshots and browser traces; preserve unobserved dependencies. |
| tracking-trace / website | requested / high | Does the action map through instrumentation to the intended outcome? Evidence is required before deciding. | JSON, HAR | Capture action, dataLayer, tag/network observations, event identity and timestamps using approved test identities. Remove secrets/PII. | Scoped test browser session | Implementation owner | Provide a redacted trace export; leave unavailable links in the event chain unknown. |
| business-observations / website | requested / high | Does the action map through instrumentation to the intended outcome? Evidence is required before deciding. | JSON, CSV | Supply outcome status taxonomy, pseudonymous correlation keys, event times, window and source; include failures and unmatched records. For the selected business models, define and provide evidence for these outcomes: form-submit, accepted-lead, qualified-lead, availability, booking-confirmed, booking-cancelled, service-completed. Confirm which outcomes actually apply; profile labels are not business evidence. | Pseudonymized CRM/order/booking export | Business systems owner | Provide attributed manual observations; analytics events alone cannot confirm terminal outcomes. |
| consent-policy / website | requested / high | Does observed tag behavior match the supplied consent policy? Evidence is required before deciding. | JSON, Markdown | Supply intended consent modes, regions, default state, updates/revocation and applicable tag behavior. | Approved policy document | Privacy policy owner | Record technical observations only; do not infer legal compliance. |
| consent-trace / website | requested / high | Does observed tag behavior match the supplied consent policy? Evidence is required before deciding. | JSON | Supply before/after traces for defaults, reject, accept, selective choices, revoke and persistence with region and mode. | Authorized browser test | Implementation owner | Provide manual Tag Assistant evidence with timestamps; mark untested scenarios pending. |
| performance-observations / website | requested / high | What do field and lab measurements separately establish? Evidence is required before deciding. | JSON | Supply field URL/origin/device/window and lab configuration/repeats separately; preserve no-data results. | Public lab or authorized RUM export | Performance owner | Run allowed lab captures; request RUM and do not substitute lab for field. |
| accessibility-observations / website | requested / high | Which criteria and journeys were actually evaluated? Evidence is required before deciding. | JSON, Markdown | Provide automated findings with tool versions plus manual keyboard/focus/error-recovery evidence and tested criteria. | Read-only inspection or approved test journey | Accessibility reviewer | Supply manual walkthrough evidence; do not infer conformance from an automated score. |
| journey-observations / website | requested / high | Which friction is observed and which improvement remains a hypothesis? Evidence is required before deciding. | JSON, Markdown | Document each journey step, observed friction, device, failures and funnel/research provenance. | Approved test journey or supplied research | Product owner | Provide a recorded walkthrough; label heuristic advice as hypotheses. |
| optimization-scope / website | requested / high | What changes are authorized and verifiable? Evidence is required before deciding. | JSON, Markdown | Identify assets, environment, owners, authorized action classes, acceptance checks and rollback constraints. | Explicit change scope, no implicit deployment | Technical owner | Produce a recommendation backlog without applying changes. |
| seo-acquisition-services-mobile-anonymous / website | requested / medium | Supply a usable scoped capture; receipt alone does not establish semantic SEO quality. | canonical-capture-v1 | Target https://atlas.example/services; environment synthetic; profile mobile; state anonymous; kind canonical; method combined; observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). Retain original capture bytes and timestamps. A live retry outside this window requires a new target/window; never relabel its timestamp. | Read-only capture/export; separate host authorization is required for collection. Do not submit forms or change the website. | website-engineering | Keep capture availability and unresolved semantic checks unknown; continue independently supported checks. |
| canonical-eval-services-canonical-canonical-owner-intent / website | requested / medium | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | owner-canonical-policy-json, owner-canonical-policy-markdown | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"to":"2026-11-19T12:00:00Z","from":"2026-11-19T11:00:00Z"\}. seo-owner: Preferred canonical URL and rationale for this exact page, or explicit absence of a preference; formats owner-canonical-policy-json, owner-canonical-policy-markdown; Keep the affected checks unknown; continue independent checks with available evidence. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | seo-owner | Keep the affected checks unknown; continue unrelated modules. |
| canonical-eval-services-canonical-provider-index-state / website | requested / medium | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | gsc-url-inspection-v1, scoped-url-inspection-export | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"to":"2026-11-19T12:00:00Z","from":"2026-11-19T11:00:00Z"\}. search-console-owner: Supply property, inspection timestamp and exact URL with provider-returned index state and selected canonical; formats gsc-url-inspection-v1, scoped-url-inspection-export; Keep provider index state unknown; local captures do not establish indexing. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | search-console-owner | Keep the affected checks unknown; continue unrelated modules. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01-confirm-canonical-policy | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | SEO owner | Small, subject to owner review | Document the preferred representative URL and rationale for /services, or explicitly record that no preference has been established. | Retain an attributed, dated decision for the exact page and confirm the intended relationship between /services and /booking. |  |
| 02-confirm-and-align-declarations | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | Website engineering | Estimate after tracing declaration ownership | Confirm the intended target with the SEO owner. If a fresh capture reproduces the mismatch, trace which server, template or client code emits each declaration and align the declarations that are present to the approved target. | In a separately authorized fresh window, capture source HTML, rendered DOM and final response Link headers for the same URL, mobile profile and anonymous state. Confirm that all canonical declarations that are present agree with the owner-approved target and that the target is reachable and indexable as intended. Assess Google-selected canonical separately from a scoped URL Inspection export. | 01-confirm-canonical-policy |

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-services-canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 | Supplied canonical capture count | 1 | supplied captures / exact | historical | 2026-11-19 to 2026-11-19 | https://atlas.example/services; profile mobile; state anonymous; exact observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). One supplied capture, not an independent execution or quality score. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| draft-scope | limitation | Draft offline audit for Atlas demonstration business (atlas-demo / website), with lead-generation and booking profiles per inputs/brief.md:3-8. Full intake covers the declared dossier only. It contains one named page capture, /services on mobile in the anonymous state, plus a later failed attempt for the same scope. /booking appears only as a canonical target and has no independent capture. Zero pages are fully audited across the broader modules. URL discovery, page content and other devices and states remain unverified. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5, seo-acquisition-source-de372c89272155d41c19b52c8386acf138f21230655cd480c37082e17683ad9e |
| capture-freshness | observation | The supplied 11:30 UTC capture was 1,800 seconds old at the 2026-11-19 12:00 UTC assessment, inside the 3,600-second maximum age and the 11:00 inclusive to 12:00 exclusive UTC evidence window. Freshness applies at that assessment time. The export provides typed projections; native HTML, DOM and headers were unavailable for independent confirmation. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |
| attempt-one | observation | The separate synthetic attempt-one from collector synthetic-export-1 ran 11:35–11:36 UTC on 2026-11-19 for /services, mobile, anonymous. The export records browser-unavailable (inputs/collection-attempt.json:18) and an unknown acquisition result, with no replacement capture, authenticated execution or semantic acceptance. The earlier supplied capture remains assessable within its window. Website engineering should retain failure diagnostics and use a newly declared window for any separately authorized retry. | seo-acquisition-source-de372c89272155d41c19b52c8386acf138f21230655cd480c37082e17683ad9e, canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |
| unmeasured-surfaces | limitation | Production behavior, provider index state, Google-selected canonical, target status and indexability, hreflang, structured data, channel traffic, conversions and consent behavior remain unknown. Page copy, content quality, answer extractability and evidence of AI mentions or citations were unavailable. No field or lab performance data, manual accessibility results or journey evidence was supplied. The assessment has no independent reviewer decision. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5, seo-acquisition-source-de372c89272155d41c19b52c8386acf138f21230655cd480c37082e17683ad9e |
| search-exports | recommendation | Search owner should provide read-only Search Console page/query exports and Bing Webmaster search performance exports separately, with verified property/site, dates, timezone, filters, dimensions, pagination or export limits and source metadata. Provide exact /services URL Inspection separately, including the inspected property, retrieval time, last crawl, index verdict and Google-selected canonical when returned. Preserve unsupported fields and no-data states. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |
| measurement-exports | recommendation | Analytics owner should export GA4 reports with property, dates, timezone, event and key-event definitions, filters and pagination, plus the tested GTM container version JSON and its environment. Business systems owner should provide a de-identified lead and booking status export with event timestamps, agreed stage definitions and pseudonymous join keys including failed or unmatched outcomes. Implementation owner should provide existing authorized traces that link action, dataLayer, tag, request and any provider receipt for each agreed outcome. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |
| content-and-journeys | recommendation | Website and content owners should provide a scoped URL inventory or sitemap export, original HTML and rendered captures with timestamps and response metadata, approved claim sources, audience and languages. Product owner should provide step-level lead and booking journey records with device, source, failures and funnel denominators. If AI visibility is in scope, the search owner should supply attributed response-level observations with query, surface, date, locale, response text or screenshot, and cited URLs. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |
| consent-performance-accessibility | recommendation | Privacy policy owner should supply the approved consent matrix by region and state. Implementation owner should export sanitized default, reject, accept, selective, revoke and persistence traces. Performance owner should provide native CrUX field exports keyed by URL or origin, device and collection period, and comparable Lighthouse navigation JSON with run settings and failed samples retained. Accessibility reviewer should provide automated output with tool version and manual keyboard, focus, error-recovery and assistive-technology records for agreed journeys. | canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| seo-acquisition-source-de372c89272155d41c19b52c8386acf138f21230655cd480c37082e17683ad9e | supplied-technical-seo-acquisition | 2026-11-19T11:36:00Z | Unknown | de372c89272155d41c19b52c8386acf138f21230655cd480c37082e17683ad9e |
| seo-acquisition-assessment-7ee5d5841662444cb20e336ffe38325688e8d3310836c696598b607caf519df1 | supplied-technical-seo-acquisition | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 7ee5d5841662444cb20e336ffe38325688e8d3310836c696598b607caf519df1 |
| canonical-31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 31ca2d3da869149fba462da23681c95df99221344775306133d0d021cee7bcd5 |
| canonical-row-fd47123e2e3d6b9a601436fe11afe1678889c478613644f230a612676d4344fd | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | fd47123e2e3d6b9a601436fe11afe1678889c478613644f230a612676d4344fd |
| canonical-row-a80318ca6fe77dd975eb0b6b1a6a5327ca9953d5658ef385d87390798dd92c77 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | a80318ca6fe77dd975eb0b6b1a6a5327ca9953d5658ef385d87390798dd92c77 |
| canonical-row-f43030f1836972f02bb214d63a1a0bdc7f42445f398e9d8a1286d95a01bf6661 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | f43030f1836972f02bb214d63a1a0bdc7f42445f398e9d8a1286d95a01bf6661 |
| canonical-row-70a00a3e817d516e0074b665459c772154e4cdd294839501d0ce2f1c59d3a6ac | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 70a00a3e817d516e0074b665459c772154e4cdd294839501d0ce2f1c59d3a6ac |

## Review decisions

| Target | Verdict | Reviewer / type | Time | Reason | Target digest |
| --- | --- | --- | --- | --- | --- |

No entries recorded.

## Historical verdicts

Historical verdicts are excluded from current assessment counts.

| Check | Previous status | Previous reason | Invalidated | Reasons | Source run |
| --- | --- | --- | --- | --- | --- |

No entries recorded.

## Request response history

Responses are attributed statements, not proof of provider behavior.

| Request | Outcome | Actor | Time | Statement |
| --- | --- | --- | --- | --- |

No entries recorded.

## Methodology and limitations

Coverage concerns declared checks, not every possible website defect.

Historical measurements are retained separately from current observations.

Structural validation and attributed review do not independently authenticate provider data.

No raw evidence payloads are included; inspect the source run using its recorded digest.

Redaction requires review; pattern matching is not a guarantee that every confidential value was identified.
