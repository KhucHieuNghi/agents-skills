# Atlas demonstration business

Revision: atlas-draft-1 · 2026-11-19T12:05:00Z · customer

## Scope and decision summary

Report accounting: all declared checks are represented. Assessment coverage: 13.3%.

Site health: failed-checks-observed. Failed checks: 1. Unknown checks: 13. Implementation: proposed.

Independent review: pending (0/18 targets accepted). Review attribution is not proof of reviewer independence.

Measurements attached: 2 historical and 0 current. Historical results do not establish current performance.

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

Run: atlas-seo-attempts. Inventory: sample. Operation: audit. Assessment time: 2026-11-19T12:00:00Z.

Planning stage: intake-only. Profiles: booking, lead-generation.

| Entity | Type |
| --- | --- |
| website | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | medium / low | Conflicting canonical declarations between source head and rendered head on /services | Observed in one supplied synthetic capture of https://atlas.example/services (profile mobile, state anonymous, captured 2026-11-19T11:30:00Z, valid until 2026-11-19T12:30:00Z): the source-head layer declares canonical https://atlas.example/services while the rendered-head layer declares https://atlas.example/booking; the HTTP Link layer is complete with no canonical target. All three layers are marked complete, so the evaluator recorded canonical-consistency as fail (conflicting-declared-targets). The capture does not identify which script, template or rewrite produces the difference, and it is not authenticated production behaviour. | Unquantified. Conflicting canonical signals can make a search engine's canonical selection for /services less predictable, and the rendered target points to a different page (/booking). No indexing, ranking, lead or booking impact is claimed: provider index state and Google-selected canonical are unknown. | First obtain the owner's preferred canonical for /services (request owner-intent). Then have website engineering identify the mechanism that changes the canonical between source and rendered head and make all declared layers agree on the owner-approved target. Do not change the site as part of this audit. | Supply a fresh canonical-capture-v1 for https://atlas.example/services (mobile, anonymous) with complete source-head, rendered-head and HTTP Link layers inside a new declared window; re-run enterprise-technical-seo-evaluate and confirm canonical-consistency passes and, once a concrete owner expectation exists, canonical-owner-intent passes. Confirm provider-selected canonical separately with a scoped URL Inspection export. | canonical-row-1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8 |

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
| a5e55766d191811b7f364f6eae226f1bd3d69411e4800aa3f767ae183bcc1139 | technical-seo / website | pass | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); observed-target-format-valid. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-3cc6e1c1a867fadab9917d3f9654dfbd368f31b52bbf4b8912619c30b61bb732 |
| ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | technical-seo / website | fail | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); conflicting-declared-targets. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8 |
| 7bc44895b036684c354a116a02751575b35d30c9a4b18e0e0557b3a78a4d77dc | technical-seo / website | unknown | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-33abdde812e96d1816a5cee35a85277771c4a380c1745bb06810b3277fb1d3d9 |
| 27a2fb8f7b8514c1f93d5ab7ba80098cbcc597db763d79b65a5e49fc608b8f00 | technical-seo / website | unknown | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | canonical-row-878c71f40c06a062d01255d7ec7df82fccaff37af054ba37ea68aa95b187010c |
| 7e68782166ed6a8350755cf86c9dc1b2d1cdc37985dbcf8bf4834896e2b30ad5 | technical-seo / website | unknown | Capture availability only: capture-unavailable. Supplied attribution; no authenticated collection or semantic SEO acceptance. | seo-acquisition-assessment-04c0a539d01b0a2e79979c8e5c480173e36c77187543ed4036604b460a196890 |

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
| canonical-eval-services-canonical-canonical-owner-intent / website | requested / medium | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | owner-canonical-policy-json, owner-canonical-policy-markdown | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"from":"2026-11-19T11:00:00Z","to":"2026-11-19T12:00:00Z"\}. seo-owner: Preferred canonical URL and rationale for this exact page, or explicit absence of a preference; formats owner-canonical-policy-json, owner-canonical-policy-markdown; Keep the affected checks unknown; continue independent checks with available evidence. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | seo-owner | Keep the affected checks unknown; continue unrelated modules. |
| canonical-eval-services-canonical-provider-index-state / website | requested / medium | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | gsc-url-inspection-v1, scoped-url-inspection-export | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"from":"2026-11-19T11:00:00Z","to":"2026-11-19T12:00:00Z"\}. search-console-owner: Supply property, inspection timestamp and exact URL with provider-returned index state and selected canonical; formats gsc-url-inspection-v1, scoped-url-inspection-export; Keep provider index state unknown; local captures do not establish indexing. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | search-console-owner | Keep the affected checks unknown; continue unrelated modules. |
| seo-acquisition-services-canonical-browser / website | requested / medium | Supply a usable scoped capture; receipt alone does not establish semantic SEO quality. | canonical-capture-v1 | Target https://atlas.example/services; environment synthetic; profile mobile; state anonymous; kind canonical; method combined; observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). Retain original capture bytes and timestamps. A live retry outside this window requires a new target/window; never relabel its timestamp. | Read-only capture/export; separate host authorization is required for collection. Do not submit forms or change the website. | website-engineering | Keep capture availability and unresolved semantic checks unknown; continue independently supported checks. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1-owner-canonical-policy | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | seo-owner | small | State the preferred canonical URL and rationale for https://atlas.example/services (or explicitly state there is no preference) in owner-canonical-policy-json or owner-canonical-policy-markdown. This answers open request canonical-owner-intent; a 'no preference' answer keeps owner-intent unknown. | Record the answer with enterprise-revise; owner-intent check is re-evaluated only against a concrete expectation in a fresh evaluation. |  |
| A2-investigate-render-canonical | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | website-engineering | medium | Investigate why the rendered head of /services declares https://atlas.example/booking while the source head declares https://atlas.example/services (mechanism unknown; do not assume a specific script or template). Propose a change so source, rendered and HTTP Link layers declare one owner-approved target. | Fresh complete three-layer canonical capture for the same URL/profile/state shows exactly one target; canonical-consistency passes on re-evaluation. | A1-owner-canonical-policy |
| A3-retry-browser-capture | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | website-engineering | small | Re-run an authorized read-only browser capture for https://atlas.example/services (mobile, anonymous) under a new target ID and observation window, because attempt-one (collector synthetic-export-1, 2026-11-19T11:35:00Z to 11:36:00Z) returned status unknown with gap browser-unavailable. Retain original capture bytes and timestamps; do not relabel a later capture into the original window. | Record the new attempt with enterprise-technical-seo-acquisition; capture availability may pass, then evaluate semantics separately with enterprise-technical-seo-evaluate. |  |
| A4-url-inspection-export | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | search-console-owner | small | Export a Search Console URL Inspection result for https://atlas.example/services with property, inspection timestamp, exact URL, provider-returned index state and Google-selected canonical (formats gsc-url-inspection-v1 or scoped-url-inspection-export). Use least-privilege read access; do not share credentials. | Evaluate as kind gsc-url-inspection; provider-index-state stays unknown until a valid scoped export is supplied. |  |

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-services-canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2 | Supplied canonical capture count | 1 | supplied captures / exact | historical | 2026-11-19 to 2026-11-19 | https://atlas.example/services; profile mobile; state anonymous; exact observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). One supplied capture, not an independent execution or quality score. | canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2 |
| seo-acquisition-attempt-one | Supplied collection attempts recorded for target services-canonical-browser | 1 | supplied attempts / exact | historical | 2026-11-19 to 2026-11-19 | attempt-one, collector synthetic-export-1, https://atlas.example/services, environment synthetic, profile mobile, state anonymous; started 2026-11-19T11:35:00Z, finished 2026-11-19T11:36:00Z; status unknown; gap browser-unavailable; synthetic, executionAuthenticated false. It produced no capture; this count is not a page observation. | seo-acquisition-source-728c7e6a165c2e8982ec416173e5951e9bf646749d456696a2bb8c75840b4f56, seo-acquisition-assessment-04c0a539d01b0a2e79979c8e5c480173e36c77187543ed4036604b460a196890 |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| N1-scope | limitation | Scope: one synthetic page target (https://atlas.example/services, mobile, anonymous) for customer atlas-demo, entity website, evidence window 2026-11-19T11:00:00Z (inclusive) to 12:00:00Z (exclusive), assessment time 2026-11-19T12:00:00Z, inventory mode sample. No content inventory, page text, GA4, Search Console, Bing, GTM, consent policy, performance or accessibility evidence was supplied, so the content-quality, SEO-content, AIO, AEO and GEO dimensions and the measurement modules were not assessed and remain unknown. Absent analytics is not zero performance. | canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2 |
| N2-source-head | observation | Observed: the source-head layer (complete) lists the canonical target "https://atlas.example/services" (page-capture.json:16). | canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2, canonical-row-1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8 |
| N3-rendered-head | observation | Observed: the rendered-head layer (complete) lists a different canonical target "https://atlas.example/booking" (page-capture.json:22). | canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2, canonical-row-1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8 |
| N4-http-link | observation | Observed: the HTTP Link layer is complete with "targets": \[\] (page-capture.json:27), i.e. no Link-header canonical was declared in this capture. | canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2, canonical-row-3cc6e1c1a867fadab9917d3f9654dfbd368f31b52bbf4b8912619c30b61bb732 |
| N5-check-results | interpretation | Evaluator results for this capture: canonical-target-format pass (both observed targets are valid absolute URLs without fragments); canonical-consistency fail (two distinct declared targets); canonical-owner-intent unknown (no owner expectation supplied); provider-index-state unknown (a local capture cannot establish indexing or Google-selected canonical). The capture was fresh at assessment (captured 11:30:00Z, max age 3600 s, valid until 12:30:00Z). Its SHA-256 establishes integrity of the supplied bytes, not authenticity. | canonical-row-3cc6e1c1a867fadab9917d3f9654dfbd368f31b52bbf4b8912619c30b61bb732, canonical-row-1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8, canonical-row-33abdde812e96d1816a5cee35a85277771c4a380c1745bb06810b3277fb1d3d9, canonical-row-878c71f40c06a062d01255d7ec7df82fccaff37af054ba37ea68aa95b187010c |
| N6-attempt | observation | Failed collection attempt recorded: attempt-one, collector synthetic-export-1, started 2026-11-19T11:35:00Z, finished 2026-11-19T11:36:00Z, status unknown, gap "browser-unavailable" (collection-attempt.json:18), synthetic, executionAuthenticated false, semanticAcceptance false. It produced no capture, so capture availability for target services-canonical-browser is unknown (capture-unavailable). No page observations were inferred from the attempt metadata; the separately supplied page capture is the only canonical evidence and was not produced by this attempt. | seo-acquisition-source-728c7e6a165c2e8982ec416173e5951e9bf646749d456696a2bb8c75840b4f56, seo-acquisition-assessment-04c0a539d01b0a2e79979c8e5c480173e36c77187543ed4036604b460a196890 |
| N7-owner-policy | limitation | The brief states: The owner has supplied no preferred canonical policy. (brief.md:6). Owner intent therefore remains unknown and is requested from the SEO owner; this audit does not infer the intended canonical from the observed page. | canonical-row-33abdde812e96d1816a5cee35a85277771c4a380c1745bb06810b3277fb1d3d9 |
| N8-recommendation | recommendation | Priority: (1) SEO owner supplies the preferred canonical for /services; (2) website engineering investigates the source-versus-rendered canonical discrepancy and aligns all layers to the approved target; (3) retry the authorized browser capture under a new window; (4) Search Console owner supplies a URL Inspection export. All actions are proposals; no site change, form submission or external contact was performed. | canonical-row-1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8, canonical-row-33abdde812e96d1816a5cee35a85277771c4a380c1745bb06810b3277fb1d3d9, seo-acquisition-assessment-04c0a539d01b0a2e79979c8e5c480173e36c77187543ed4036604b460a196890, canonical-row-878c71f40c06a062d01255d7ec7df82fccaff37af054ba37ea68aa95b187010c |
| N9-limitations | limitation | Limitations: single synthetic capture; supplied projections not verified against native HTML, DOM or headers; no reachability, content-equivalence, indexing or ranking claim; no aggregation across devices, states or other URLs; report brand accent is a neutral placeholder because no customer brand profile was supplied; no independent review decision has been recorded, so no claim is accepted. | canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2, seo-acquisition-assessment-04c0a539d01b0a2e79979c8e5c480173e36c77187543ed4036604b460a196890 |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| canonical-d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | d9f7988f5df59a711bc5485bcd8a6ee60c3140b12050e655edd853a807c468b2 |
| canonical-row-3cc6e1c1a867fadab9917d3f9654dfbd368f31b52bbf4b8912619c30b61bb732 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 3cc6e1c1a867fadab9917d3f9654dfbd368f31b52bbf4b8912619c30b61bb732 |
| canonical-row-1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 1248d66f8b4c706e8e9069c07c8073c40c19d0b81c8d9a45cf7616d26fe431d8 |
| canonical-row-33abdde812e96d1816a5cee35a85277771c4a380c1745bb06810b3277fb1d3d9 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 33abdde812e96d1816a5cee35a85277771c4a380c1745bb06810b3277fb1d3d9 |
| canonical-row-878c71f40c06a062d01255d7ec7df82fccaff37af054ba37ea68aa95b187010c | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 878c71f40c06a062d01255d7ec7df82fccaff37af054ba37ea68aa95b187010c |
| seo-acquisition-source-728c7e6a165c2e8982ec416173e5951e9bf646749d456696a2bb8c75840b4f56 | supplied-technical-seo-acquisition | 2026-11-19T11:36:00Z | Unknown | 728c7e6a165c2e8982ec416173e5951e9bf646749d456696a2bb8c75840b4f56 |
| seo-acquisition-assessment-04c0a539d01b0a2e79979c8e5c480173e36c77187543ed4036604b460a196890 | supplied-technical-seo-acquisition | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 04c0a539d01b0a2e79979c8e5c480173e36c77187543ed4036604b460a196890 |

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
