# Atlas demonstration business

Revision: atlas-report-r1 · 2026-11-19T12:00:00Z · customer

## Scope and decision summary

Report accounting: all declared checks are represented. Assessment coverage: 13.3%.

Site health: failed-checks-observed. Failed checks: 1. Unknown checks: 13. Implementation: proposed.

Independent review: pending (0/15 targets accepted). Review attribution is not proof of reviewer independence.

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

Run: atlas-acquisition. Inventory: sample. Operation: audit. Assessment time: 2026-11-19T12:00:00Z.

Planning stage: intake-only. Profiles: booking, lead-generation.

| Entity | Type |
| --- | --- |
| website | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| finding-canonical-conflict-services | medium / low | Source and rendered canonical declarations conflict on /services (mobile, anonymous) | Observed in the supplied synthetic capture (capturedAt 2026-11-19T11:30:00Z, inside the 2026-11-19T11:00:00Z–12:00:00Z window and within the 3600-second max age): the source-head layer (complete) declares canonical https://atlas.example/services, the rendered-head layer (complete) declares https://atlas.example/booking, and the HTTP Link layer (complete) declares no canonical. The evaluator returned canonical-consistency = fail (conflicting-declared-targets). Both declared targets are well-formed absolute URLs without fragments (canonical-target-format = pass). Which target the owner intends is not supplied, so owner intent remains unknown, and the cause of the change between source and rendered head (for example client-side head rewriting) is not established by this evidence. | Unquantified. Conflicting canonical hints can make the preferred URL for the services page ambiguous to search engines, and a rendered hint pointing at the booking page could consolidate signals away from /services. No indexing, ranking, traffic, lead or booking effect is established: no Search Console, URL Inspection, GA4 or Bing evidence was supplied. | After the SEO owner states the preferred canonical for https://atlas.example/services, website engineering should make the source head, rendered head and (if used) HTTP Link header declare that single target for the mobile/anonymous state, and identify what changes the rendered canonical to /booking. This report does not choose the correct target and does not authorize any website change. | Supply a fresh canonical-capture-v1 export for the same URL, environment, mobile profile and anonymous state with all three layers complete; rerun enterprise-technical-seo-evaluate with the owner's expectedCanonical and confirm canonical-consistency and canonical-owner-intent both pass; then supply a scoped URL Inspection export to check the provider-selected canonical. | canonical-row-692b9f64e61ff060932728919e08fff44931308eaa6c8c270c456b4e2d84a8fd |

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
| a5e55766d191811b7f364f6eae226f1bd3d69411e4800aa3f767ae183bcc1139 | technical-seo / website | pass | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); observed-target-format-valid. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-15cbd0a25b5816027f703ac27330968a5200c2e59c7b0ec756c6c4c5fabe85fa |
| ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | technical-seo / website | fail | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); conflicting-declared-targets. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-692b9f64e61ff060932728919e08fff44931308eaa6c8c270c456b4e2d84a8fd |
| 7bc44895b036684c354a116a02751575b35d30c9a4b18e0e0557b3a78a4d77dc | technical-seo / website | unknown | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-19aafd40d2e72ba2f9a407363d7e83344054d97efb710b29bd24fb435f7e12b9 |
| 27a2fb8f7b8514c1f93d5ab7ba80098cbcc597db763d79b65a5e49fc608b8f00 | technical-seo / website | unknown | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | canonical-row-f1de1cec4dc634fa0a94cc542f56ad1ad53dc4ff411dc554a07a7c74f3a584b7 |
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
| canonical-eval-services-canonical-canonical-owner-intent / website | requested / medium | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | owner-canonical-policy-json, owner-canonical-policy-markdown | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"from":"2026-11-19T11:00:00Z","to":"2026-11-19T12:00:00Z"\}. seo-owner: Preferred canonical URL and rationale for this exact page, or explicit absence of a preference; formats owner-canonical-policy-json, owner-canonical-policy-markdown; Keep the affected checks unknown; continue independent checks with available evidence. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | seo-owner | Keep the affected checks unknown; continue unrelated modules. |
| canonical-eval-services-canonical-provider-index-state / website | requested / medium | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | gsc-url-inspection-v1, scoped-url-inspection-export | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"from":"2026-11-19T11:00:00Z","to":"2026-11-19T12:00:00Z"\}. search-console-owner: Supply property, inspection timestamp and exact URL with provider-returned index state and selected canonical; formats gsc-url-inspection-v1, scoped-url-inspection-export; Keep provider index state unknown; local captures do not establish indexing. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | search-console-owner | Keep the affected checks unknown; continue unrelated modules. |
| seo-acquisition-services-canonical-capture / website | requested / medium | Supply a usable scoped capture; receipt alone does not establish semantic SEO quality. | canonical-capture-v1 | Target https://atlas.example/services; environment synthetic; profile mobile; state anonymous; kind canonical; method combined; observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). Retain original capture bytes and timestamps. A live retry outside this window requires a new target/window; never relabel its timestamp. | Read-only capture/export; separate host authorization is required for collection. Do not submit forms or change the website. | website-engineering | Keep capture availability and unresolved semantic checks unknown; continue independently supported checks. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| act-1-owner-canonical-policy | finding-canonical-conflict-services | proposed | SEO owner | small | Record the preferred canonical URL and rationale for https://atlas.example/services (or explicitly state there is no preference) as owner-canonical-policy JSON or Markdown, scoped to environment synthetic, profile mobile, state anonymous. | Policy document is supplied with author, date and validity; it is recorded via enterprise-revise as an attributed owner answer and used as expectedCanonical in re-evaluation. |  |
| act-2-trace-rendered-canonical | finding-canonical-conflict-services | proposed | Website engineering | unknown | In a non-production environment, read the services page template and client-side code as text to identify what produces the rendered-head canonical https://atlas.example/booking, and plan a change so all layers match the owner's policy. No change is made by this audit. | Engineering note naming the responsible template/script and a reviewed change plan; no form submission or production change as part of the audit. | act-1-owner-canonical-policy |
| act-3-recapture-and-reevaluate | finding-canonical-conflict-services | proposed | Website engineering | small | Produce a fresh, complete canonical-capture-v1 (sourceHead, renderedHead, httpLink) for the same scope using an authorized browser, in a new observation window, and rerun the technical SEO evaluation and acquisition workflows in a new run. | canonical-consistency passes and canonical-owner-intent passes against the supplied policy; the acquisition availability check for the new target passes; earlier failed attempt remains in history. | act-2-trace-rendered-canonical |
| act-4-url-inspection | finding-canonical-conflict-services | proposed | Search Console owner | small | Export a URL Inspection result (property, inspection timestamp, exact URL, index state, Google-selected and user-declared canonical) for https://atlas.example/services after the change. | Evaluate the export with the gsc-url-inspection workflow; provider index state is reported only from that export. | act-3-recapture-and-reevaluate |

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-services-canonical-a32f5a10433a6b754e272697bf01868ed97d4d3575e0839c2c345a1f31df62c2 | Supplied canonical capture count | 1 | supplied captures / exact | historical | 2026-11-19 to 2026-11-19 | https://atlas.example/services; profile mobile; state anonymous; exact observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). One supplied capture, not an independent execution or quality score. | canonical-a32f5a10433a6b754e272697bf01868ed97d4d3575e0839c2c345a1f31df62c2 |
| acquisition-attempt-failed-services | Supplied collection attempts without a usable capture | 1 | failed attempts / exact | historical | 2026-11-19 to 2026-11-19 | attempt-one (collector synthetic-export-1), https://atlas.example/services; environment synthetic; profile mobile; state anonymous; started 2026-11-19T11:35:00Z, finished 2026-11-19T11:36:00Z; status unknown; gap browser-unavailable; synthetic; not execution-authenticated. A failed attempt is unavailable evidence, not a site defect. | seo-acquisition-source-e43278a3e52574452ea538b4ce9fc47d622c60184aed5fc108a073054e87ace4 |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| n01-scope | limitation | Scope: one synthetic URL (https://atlas.example/services), environment synthetic, mobile profile, anonymous state, observation window 2026-11-19T11:00:00Z (inclusive) to 12:00:00Z (exclusive), assessed at 2026-11-19T12:00:00Z for the lead-generation and booking profiles. Inventory mode is sample and discovery is not complete; no page content, HTML or rendered DOM was supplied, so no content inventory was created and the content quality, SEO-content, AI search optimization (AIO, not the Google product AI Overviews), answer-quality (AEO) and generative-visibility (GEO) dimensions were not assessed. | canonical-a32f5a10433a6b754e272697bf01868ed97d4d3575e0839c2c345a1f31df62c2 |
| n02-observed-canonical | observation | Observed (supplied capture, 11:30:00Z, fresh until 12:30:00Z): source head declares https://atlas.example/services; rendered head declares https://atlas.example/booking; HTTP Link declares none; all three layers are marked complete. Result: canonical-target-format pass, canonical-consistency fail. | canonical-row-15cbd0a25b5816027f703ac27330968a5200c2e59c7b0ec756c6c4c5fabe85fa, canonical-row-692b9f64e61ff060932728919e08fff44931308eaa6c8c270c456b4e2d84a8fd |
| n03-interpretation | interpretation | The services page sends different canonical hints before and after rendering. Because owner intent was not supplied, this report treats the conflict itself as the defect and does not state which URL should be canonical or why the rendered head changes. | canonical-row-692b9f64e61ff060932728919e08fff44931308eaa6c8c270c456b4e2d84a8fd, canonical-row-19aafd40d2e72ba2f9a407363d7e83344054d97efb710b29bd24fb435f7e12b9 |
| n04-failed-attempt | observation | Recorded separately: collection attempt attempt-one (11:35:00Z–11:36:00Z, synthetic) returned status unknown with gap browser-unavailable and no capture. The capture-availability check for target services-canonical-capture stays unknown (capture-unavailable). The failure does not alter or invalidate the earlier supplied capture, and it is not evidence of a site defect. | seo-acquisition-source-e43278a3e52574452ea538b4ce9fc47d622c60184aed5fc108a073054e87ace4, seo-acquisition-assessment-6f5e7ece1ed6d7197c1515ee1f821a7adfa66b69c1f7f3a225ef4c9f12e4d7b7 |
| n05-unavailable | limitation | Unavailable evidence, kept unknown (not pass, not zero): owner canonical policy, URL Inspection / provider index state and Google-selected canonical, GA4, Google Search Console, Bing, GTM, consent policy, performance field/lab, accessibility, and runtime indexability. Neither supplied export authenticates production behaviour; hash checks establish integrity only. | canonical-row-19aafd40d2e72ba2f9a407363d7e83344054d97efb710b29bd24fb435f7e12b9, canonical-row-f1de1cec4dc634fa0a94cc542f56ad1ad53dc4ff411dc554a07a7c74f3a584b7, seo-acquisition-assessment-6f5e7ece1ed6d7197c1515ee1f821a7adfa66b69c1f7f3a225ef4c9f12e4d7b7 |
| n06-recommendation | recommendation | Priority order: (1) SEO owner supplies the canonical policy for /services; (2) engineering traces the rendered-head rewrite to /booking; (3) recapture all three layers and re-evaluate in a new run; (4) supply URL Inspection. Outstanding owner requests and export instructions are listed in the data request section. | canonical-row-692b9f64e61ff060932728919e08fff44931308eaa6c8c270c456b4e2d84a8fd, canonical-row-19aafd40d2e72ba2f9a407363d7e83344054d97efb710b29bd24fb435f7e12b9, canonical-row-f1de1cec4dc634fa0a94cc542f56ad1ad53dc4ff411dc554a07a7c74f3a584b7 |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| canonical-a32f5a10433a6b754e272697bf01868ed97d4d3575e0839c2c345a1f31df62c2 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | a32f5a10433a6b754e272697bf01868ed97d4d3575e0839c2c345a1f31df62c2 |
| canonical-row-15cbd0a25b5816027f703ac27330968a5200c2e59c7b0ec756c6c4c5fabe85fa | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 15cbd0a25b5816027f703ac27330968a5200c2e59c7b0ec756c6c4c5fabe85fa |
| canonical-row-692b9f64e61ff060932728919e08fff44931308eaa6c8c270c456b4e2d84a8fd | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 692b9f64e61ff060932728919e08fff44931308eaa6c8c270c456b4e2d84a8fd |
| canonical-row-19aafd40d2e72ba2f9a407363d7e83344054d97efb710b29bd24fb435f7e12b9 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 19aafd40d2e72ba2f9a407363d7e83344054d97efb710b29bd24fb435f7e12b9 |
| canonical-row-f1de1cec4dc634fa0a94cc542f56ad1ad53dc4ff411dc554a07a7c74f3a584b7 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | f1de1cec4dc634fa0a94cc542f56ad1ad53dc4ff411dc554a07a7c74f3a584b7 |
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
