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

Run: atlas-acquisition. Inventory: sample. Operation: audit. Assessment time: 2026-11-19T12:00:00Z.

Planning stage: intake-only. Profiles: booking, lead-generation.

| Entity | Type |
| --- | --- |
| website | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | medium / low | Source and rendered canonical declarations disagree on /services | The synthetic mobile anonymous capture at 11:30 UTC on 2026-11-19 declares https://atlas.example/services in the source head and https://atlas.example/booking in the rendered head. The complete HTTP Link projection contains zero canonical targets. See page-capture.json:11 and page-capture.json:13-28. | The declarations send conflicting canonical signals. Provider selection, indexing, rankings, traffic and business impact are unknown. | Confirm the intended URL and investigate which layer supplies each declaration before aligning them. | Repeat the source head, rendered head and final HTTP Link capture for the same URL, profile and state. Check for one consistent declared target. Compare to owner intent only if a specific expected URL is supplied. | canonical-row-7cd358376e01645dbd171b492054c5fa93cf3b115ed088cf9b23e5268bf59083 |

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
| a5e55766d191811b7f364f6eae226f1bd3d69411e4800aa3f767ae183bcc1139 | technical-seo / website | pass | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); observed-target-format-valid. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-446d2b20224a0d6a5d9f04aa088fec2912d9d6d42968bb08a4c00160b4b239ca |
| ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | technical-seo / website | fail | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); conflicting-declared-targets. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-7cd358376e01645dbd171b492054c5fa93cf3b115ed088cf9b23e5268bf59083 |
| 7bc44895b036684c354a116a02751575b35d30c9a4b18e0e0557b3a78a4d77dc | technical-seo / website | unknown | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-cfe89cd5d743ecbe33d5efc8480c336f4e3ba05389fb195d6078fd09b8520c46 |
| 27a2fb8f7b8514c1f93d5ab7ba80098cbcc597db763d79b65a5e49fc608b8f00 | technical-seo / website | unknown | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | canonical-row-cb2723975cf9afa7b3ef87ca14fda7374714f6098413ef4c5f5f222ac5ec3417 |
| 791342aa832523deb65cb2beafcd6be08b3da979bd8e25260417a1e10cc0b7e8 | technical-seo / website | unknown | Capture availability only: capture-unavailable. Supplied attribution; no authenticated collection or semantic SEO acceptance. | seo-acquisition-assessment-6f5e7ece1ed6d7197c1515ee1f821a7adfa66b69c1f7f3a225ef4c9f12e4d7b7 |

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
| canonical-eval-services-canonical-canonical-owner-intent / website | requested / medium | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | owner-canonical-policy-json, owner-canonical-policy-markdown | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"to":"2026-11-19T12:00:00Z","from":"2026-11-19T11:00:00Z"\}. seo-owner: Preferred canonical URL and rationale for this exact page, or explicit absence of a preference; formats owner-canonical-policy-json, owner-canonical-policy-markdown; Keep the affected checks unknown; continue independent checks with available evidence. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | seo-owner | Keep the affected checks unknown; continue unrelated modules. |
| canonical-eval-services-canonical-provider-index-state / website | requested / medium | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | gsc-url-inspection-v1, scoped-url-inspection-export | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"to":"2026-11-19T12:00:00Z","from":"2026-11-19T11:00:00Z"\}. search-console-owner: Supply property, inspection timestamp and exact URL with provider-returned index state and selected canonical; formats gsc-url-inspection-v1, scoped-url-inspection-export; Keep provider index state unknown; local captures do not establish indexing. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | search-console-owner | Keep the affected checks unknown; continue unrelated modules. |
| seo-acquisition-services-canonical-capture / website | requested / medium | Supply a usable scoped capture; receipt alone does not establish semantic SEO quality. | canonical-capture-v1 | Target https://atlas.example/services; environment synthetic; profile mobile; state anonymous; kind canonical; method combined; observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). Retain original capture bytes and timestamps. A live retry outside this window requires a new target/window; never relabel its timestamp. | Read-only capture/export; separate host authorization is required for collection. Do not submit forms or change the website. | website-engineering | Keep capture availability and unresolved semantic checks unknown; continue independently supported checks. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| resolve-services-canonical | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | Website engineering with SEO owner | Scope after reproducing the discrepancy | First reproduce the /services discrepancy using authorized read-only evidence. Trace the source and rendered declarations to their emitting components, then propose aligning the declarations with the agreed policy. Keep provider inspection separate. | Repeat the source head, rendered head and final HTTP Link capture for the same URL, profile and state. Check for one consistent declared target. Compare to owner intent only if a specific expected URL is supplied. |  |

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-services-canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d | Supplied canonical capture count | 1 | supplied captures / exact | historical | 2026-11-19 to 2026-11-19 | https://atlas.example/services; profile mobile; state anonymous; exact observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). One supplied capture, not an independent execution or quality score. | canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| scope | limitation | Partial development draft for Atlas, a synthetic lead-generation and booking business (brief.md:3-8). Fixed assessment at 2026-11-19T12:00:00Z. Evidence window begins 11:00 UTC inclusive and ends 12:00 UTC exclusive. Maximum capture age is 3600 seconds. One website entity and one captured URL were supplied. /booking appears only as a declared target. Zero pages were fully audited. Site inventory and discovery completeness remain unknown. No live collection or provider measurements were performed. | owner-brief, canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d |
| capture | observation | The 11:30 UTC capture was 1800 seconds old at assessment and supplies complete canonical projections for source head, rendered head and HTTP Link. Observed target format passed the scoped evaluator. Consistency failed. Owner intent, provider-selected canonical and index status are unknown. The cause of the disagreement is unverified. | canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d |
| acquisition | observation | The supplied synthetic attempt attempt-one used collector version synthetic-export-1 on https://atlas.example/services for atlas-demo / website, mobile, anonymous. It began at 2026-11-19T11:35:00Z and ended at 2026-11-19T11:36:00Z with status unknown and gap browser-unavailable (collection-attempt.json:2-21). Execution authentication and semantic acceptance were both false. The attempt yielded no capture and leaves acquisition availability unknown. The separately supplied 11:30 capture remains usable within its scope. | seo-acquisition-source-e43278a3e52574452ea538b4ce9fc47d622c60184aed5fc108a073054e87ace4, canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d |
| unavailable | limitation | Page bodies, full inventory and native page evidence were unavailable. Content quality, on-page SEO beyond the scoped canonical checks, AI search optimization, answer quality, generative visibility, crawl and index controls, structured data, measurement, tracking, consent, performance, accessibility and lead/booking journey behavior remain unassessed. No production or independent acceptance is established. | owner-brief, canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d |
| collection-recovery | recommendation | Website engineering should provide the original response/source HTML, final HTTP Link headers and rendered head from a separately authorized capture of /services for the same mobile/anonymous state, with exact UTC time, environment, tool/version and layer completeness. Use a fresh target/window for a later retry. Include direct target controls for /booking if evaluating its eligibility. | seo-acquisition-source-e43278a3e52574452ea538b4ce9fc47d622c60184aed5fc108a073054e87ace4, canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d |
| content-recovery | recommendation | Website and content owners should supply a CMS URL inventory and sitemap export, with locale, template and exclusion reason, plus source/rendered page bodies and authoritative claim references. Search owner should supply dated, attributed query/answer/citation observations per AI surface if visibility is in scope. Until then, account for readiness only and leave visibility unknown. | owner-brief |
| provider-recovery | recommendation | Search Console owner should export page/query Search Performance rows with property, dates, search type, filters and pagination, and separately supply scoped URL Inspection for /services with retrieval time, index status and Google-selected canonical. Bing Webmaster Tools owner should provide an attributable site search-performance export with site, date window, locale, market, timezone, surfaces and filters. Analytics owner should provide paginated GA4 landing-page and event report rows with property, query, date range, metrics, dimensions, timezone and currency. Separately provide GA4 property, streams and event/key-event definitions with scope and completeness, and a GTM container-version JSON with account/container, version and environment. | owner-brief |
| business-recovery | recommendation | Business and product owners should confirm lead and booking success definitions, then export de-identified CRM and booking status records with UTC window, outcome dictionary, pseudonymous matching keys and failures. Implementation owner should provide existing approved test traces covering action, dataLayer, network and event timestamps with secrets and personal data removed. Privacy owner should supply the dated policy by region and intended default, update, revocation and tag behavior. Request separately attributed existing consent traces for those states and persistence. | owner-brief |
| experience-recovery | recommendation | Performance owner should provide CrUX URL or origin field exports with device, period and missingness, plus separate Lighthouse JSON runs with version, settings, URL, device and run conditions. Accessibility reviewer should provide axe output and criterion-linked manual keyboard, focus, form-error and recovery evidence with page, state, device/browser and timestamps. Product owner should attach existing journey evidence by step for lead and booking flows. | owner-brief |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| owner-brief | inputs/brief.md | 2026-11-19T12:00:00Z | Unknown | efea08357f3536a68a1469205ab4df8dd78659d0a32801d09131e02df858d60f |
| canonical-105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 105754a8dfd38f3be729c7cef049a186ee57e05a252179718d00d0e2f891489d |
| canonical-row-446d2b20224a0d6a5d9f04aa088fec2912d9d6d42968bb08a4c00160b4b239ca | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 446d2b20224a0d6a5d9f04aa088fec2912d9d6d42968bb08a4c00160b4b239ca |
| canonical-row-7cd358376e01645dbd171b492054c5fa93cf3b115ed088cf9b23e5268bf59083 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 7cd358376e01645dbd171b492054c5fa93cf3b115ed088cf9b23e5268bf59083 |
| canonical-row-cfe89cd5d743ecbe33d5efc8480c336f4e3ba05389fb195d6078fd09b8520c46 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | cfe89cd5d743ecbe33d5efc8480c336f4e3ba05389fb195d6078fd09b8520c46 |
| canonical-row-cb2723975cf9afa7b3ef87ca14fda7374714f6098413ef4c5f5f222ac5ec3417 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | cb2723975cf9afa7b3ef87ca14fda7374714f6098413ef4c5f5f222ac5ec3417 |
| seo-acquisition-source-e43278a3e52574452ea538b4ce9fc47d622c60184aed5fc108a073054e87ace4 | supplied-technical-seo-acquisition | 2026-11-19T11:36:00Z | Unknown | e43278a3e52574452ea538b4ce9fc47d622c60184aed5fc108a073054e87ace4 |
| seo-acquisition-assessment-6f5e7ece1ed6d7197c1515ee1f821a7adfa66b69c1f7f3a225ef4c9f12e4d7b7 | supplied-technical-seo-acquisition | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 6f5e7ece1ed6d7197c1515ee1f821a7adfa66b69c1f7f3a225ef4c9f12e4d7b7 |

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
