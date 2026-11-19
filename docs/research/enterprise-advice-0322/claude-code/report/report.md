# Atlas demonstration business

Revision: atlas-draft-1 · 2026-11-19T12:00:00Z · customer

## Scope and decision summary

Report accounting: all declared checks are represented. Assessment coverage: 13.3%.

Site health: failed-checks-observed. Failed checks: 1. Unknown checks: 13. Implementation: proposed.

Independent review: pending (0/13 targets accepted). Review attribution is not proof of reviewer independence.

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

Run: atlas-tseo-attempt. Inventory: sample. Operation: audit. Assessment time: 2026-11-19T12:00:00Z.

Planning stage: intake-only. Profiles: booking, lead-generation.

| Entity | Type |
| --- | --- |
| website | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-services-source-rendered-conflict | medium / low | Source and rendered canonical declarations disagree on /services (supplied capture) | Observed in the supplied synthetic capture of https://atlas.example/services (mobile profile, anonymous state, capturedAt 2026-11-19T11:30:00Z): the complete source-head layer declares https://atlas.example/services, the complete rendered-head layer declares https://atlas.example/booking, and the complete HTTP Link layer declares no canonical target. The evaluator recorded canonical-consistency = fail (conflicting-declared-targets). The capture does not identify which mechanism (template, script, rewrite or other) produces the rendered value, and it is not authenticated browser execution. | Unquantified. Conflicting declarations can make the services page's preferred URL ambiguous to search engines, and the rendered target points to a different business page (booking). No indexing, ranking, lead or booking impact is measured; no Search Console, GA4 or Bing evidence was supplied. | Website engineering should first confirm the conflict on an authorized read-only capture of the same URL, profile and state, then trace which mechanism changes the canonical between source and rendered head. Separately, the SEO owner should state the preferred canonical for /services; do not choose a value from this capture alone. | Supply a fresh canonical-capture-v1 export (source head, rendered head, HTTP Link, each complete) for https://atlas.example/services, mobile/anonymous, under a new evaluation ID and window; canonical-consistency should pass with a single target. Owner-intent passes only once a concrete owner expectation is supplied; provider index state needs a separately scoped URL Inspection export. | canonical-row-a9fe95e659cb04ceda35524f86e3a28168932eec925d27100b9fc0feb0526b4d |

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
| a5e55766d191811b7f364f6eae226f1bd3d69411e4800aa3f767ae183bcc1139 | technical-seo / website | pass | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); observed-target-format-valid. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-d584d42bd53e1e22e8af864da37d5b55174e25d2853180a472e114cd1bdc0e84 |
| ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | technical-seo / website | fail | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); conflicting-declared-targets. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-a9fe95e659cb04ceda35524f86e3a28168932eec925d27100b9fc0feb0526b4d |
| 7bc44895b036684c354a116a02751575b35d30c9a4b18e0e0557b3a78a4d77dc | technical-seo / website | unknown | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-e4e685b894b06f9ec6741c7aa85cf16b9a3a11f8a1e2c03f31b891fbdf5222a8 |
| 27a2fb8f7b8514c1f93d5ab7ba80098cbcc597db763d79b65a5e49fc608b8f00 | technical-seo / website | unknown | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | canonical-row-a2b6215f275c2a34a0875495312680a85b038cbc02e85427117f80fdc7e7ab78 |
| f1bb727fcf0db18fbf57b61e87091af5b8167cbc80a90f85b940ded733eb66d0 | technical-seo / website | unknown | Capture availability only: capture-unavailable. Supplied attribution; no authenticated collection or semantic SEO acceptance. | seo-acquisition-assessment-8af8b8c8c501b1b9872195e78295db8d1cb73fdb278308f78e8f0df9794b51fe |

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
| seo-acquisition-services-canonical-collection / website | requested / medium | Supply a usable scoped capture; receipt alone does not establish semantic SEO quality. | canonical-capture-v1 | Target https://atlas.example/services; environment synthetic; profile mobile; state anonymous; kind canonical; method combined; observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). Retain original capture bytes and timestamps. A live retry outside this window requires a new target/window; never relabel its timestamp. | Read-only capture/export; separate host authorization is required for collection. Do not submit forms or change the website. | website-engineering | Keep capture availability and unresolved semantic checks unknown; continue independently supported checks. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| confirm-and-trace-canonical | canonical-services-source-rendered-conflict | proposed | website-engineering | small (investigation) | Re-capture /services (mobile, anonymous) read-only with source, rendered and HTTP Link layers; if the booking URL still appears only in the rendered head, identify the responsible mechanism. No site change is authorized by this audit. | New canonical evaluation in a new run shows the same or a resolved discrepancy; retain the original failed check as historical. |  |
| state-canonical-policy | canonical-services-source-rendered-conflict | proposed | seo-owner | small | Record the preferred canonical URL and rationale for https://atlas.example/services (or an explicit statement of no preference) as owner-canonical-policy JSON or Markdown. | Answer recorded through enterprise-revise; canonical-owner-intent is re-evaluated only against a concrete expectation (no preference keeps it unknown). |  |
| correct-canonical-if-confirmed | canonical-services-source-rendered-conflict | proposed | website-engineering | unknown until mechanism is identified | If the conflict is confirmed and the owner policy is known, align all three layers to the owner-stated URL in a separately authorized change. | Post-change capture: all layers complete with one target matching owner intent; URL Inspection export reviewed separately for Google-selected canonical. | confirm-and-trace-canonical, state-canonical-policy |

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| supplied-collection-attempts | Supplied collection attempts without capture | 1 | attempts / exact | historical | 2026-11-19 to 2026-11-19 | attempt-one, collector synthetic-export-1, https://atlas.example/services, environment synthetic, profile mobile, state anonymous; started 2026-11-19T11:35:00Z, finished 2026-11-19T11:36:00Z; status unknown; gap browser-unavailable; synthetic; not execution-authenticated. No capture produced. | seo-acquisition-source-e9ca211c9b289ae5877ddc5e409cd7d689a3eef722659ae2fc31c33d5afb6294, seo-acquisition-assessment-8af8b8c8c501b1b9872195e78295db8d1cb73fdb278308f78e8f0df9794b51fe |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| scope | limitation | Scope: one synthetic page capture of https://atlas.example/services (mobile, anonymous) and one failed synthetic collection attempt for the same scope, assessed at 2026-11-19T12:00:00Z within the 2026-11-19T11:00:00Z to 12:00:00Z window (capture max age 3600 s). No page HTML, content inventory, GA4, Search Console, Bing, GTM, consent policy, performance or accessibility evidence was supplied, so content-quality, AI-search, answer-quality and generative-visibility dimensions were not assessed and no content inventory was created. Neither export authenticates production behavior. | canonical-e4e78a1b26460d1f9413219588df68eb87286146bec3fa97409421ad70384508, seo-acquisition-assessment-8af8b8c8c501b1b9872195e78295db8d1cb73fdb278308f78e8f0df9794b51fe |
| observed-canonical | observation | Observed: canonical target format passed (all declared targets are absolute URLs without fragments). Canonical consistency failed: source head declares https://atlas.example/services while rendered head declares https://atlas.example/booking; the HTTP Link layer is complete and empty. | canonical-row-d584d42bd53e1e22e8af864da37d5b55174e25d2853180a472e114cd1bdc0e84, canonical-row-a9fe95e659cb04ceda35524f86e3a28168932eec925d27100b9fc0feb0526b4d |
| unavailable-canonical | limitation | Unavailable, not failed: owner canonical intent is unknown because the owner supplied no preferred canonical policy; provider index state and Google-selected canonical are unknown because no URL Inspection export was supplied. A local capture cannot establish either. | canonical-row-e4e685b894b06f9ec6741c7aa85cf16b9a3a11f8a1e2c03f31b891fbdf5222a8, canonical-row-a2b6215f275c2a34a0875495312680a85b038cbc02e85427117f80fdc7e7ab78 |
| failed-attempt | observation | Failed collection recorded: attempt-one (collector synthetic-export-1) for https://atlas.example/services, mobile/anonymous, ran 2026-11-19T11:35:00Z to 11:36:00Z, returned status unknown with gap browser-unavailable, and produced no capture. Its capture-availability check stays unknown (capture-unavailable). It does not invalidate or confirm the separately supplied 11:30 capture and supplies no page observations. | seo-acquisition-source-e9ca211c9b289ae5877ddc5e409cd7d689a3eef722659ae2fc31c33d5afb6294, seo-acquisition-assessment-8af8b8c8c501b1b9872195e78295db8d1cb73fdb278308f78e8f0df9794b51fe |
| interpretation | interpretation | Interpretation: the source/rendered disagreement is a real inconsistency within the supplied capture, but its cause is not identified and, because the capture is synthetic and unauthenticated, confidence is low. Whether /services or /booking is intended cannot be decided without owner policy. | canonical-row-a9fe95e659cb04ceda35524f86e3a28168932eec925d27100b9fc0feb0526b4d |
| requests | recommendation | Priority evidence requests: (1) SEO owner - preferred canonical for /services as owner-canonical-policy JSON/Markdown; (2) Search Console owner - URL Inspection export for https://atlas.example/services from the verified property, read-only; (3) website engineering - a usable canonical-capture-v1 export for the same URL/profile/state within a new window, retaining original bytes and timestamps. Broader intake requests (rendered page, content sources, business context, search, GA4 report, GTM container, tracking/consent traces, performance, accessibility, journeys, optimization scope) remain open with owners and export instructions listed in the data-request section. | canonical-row-e4e685b894b06f9ec6741c7aa85cf16b9a3a11f8a1e2c03f31b891fbdf5222a8, canonical-row-a2b6215f275c2a34a0875495312680a85b038cbc02e85427117f80fdc7e7ab78, seo-acquisition-assessment-8af8b8c8c501b1b9872195e78295db8d1cb73fdb278308f78e8f0df9794b51fe |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| canonical-e4e78a1b26460d1f9413219588df68eb87286146bec3fa97409421ad70384508 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | e4e78a1b26460d1f9413219588df68eb87286146bec3fa97409421ad70384508 |
| canonical-row-d584d42bd53e1e22e8af864da37d5b55174e25d2853180a472e114cd1bdc0e84 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | d584d42bd53e1e22e8af864da37d5b55174e25d2853180a472e114cd1bdc0e84 |
| canonical-row-a9fe95e659cb04ceda35524f86e3a28168932eec925d27100b9fc0feb0526b4d | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | a9fe95e659cb04ceda35524f86e3a28168932eec925d27100b9fc0feb0526b4d |
| canonical-row-e4e685b894b06f9ec6741c7aa85cf16b9a3a11f8a1e2c03f31b891fbdf5222a8 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | e4e685b894b06f9ec6741c7aa85cf16b9a3a11f8a1e2c03f31b891fbdf5222a8 |
| canonical-row-a2b6215f275c2a34a0875495312680a85b038cbc02e85427117f80fdc7e7ab78 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | a2b6215f275c2a34a0875495312680a85b038cbc02e85427117f80fdc7e7ab78 |
| seo-acquisition-source-e9ca211c9b289ae5877ddc5e409cd7d689a3eef722659ae2fc31c33d5afb6294 | supplied-technical-seo-acquisition | 2026-11-19T11:36:00Z | Unknown | e9ca211c9b289ae5877ddc5e409cd7d689a3eef722659ae2fc31c33d5afb6294 |
| seo-acquisition-assessment-8af8b8c8c501b1b9872195e78295db8d1cb73fdb278308f78e8f0df9794b51fe | supplied-technical-seo-acquisition | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 8af8b8c8c501b1b9872195e78295db8d1cb73fdb278308f78e8f0df9794b51fe |

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
