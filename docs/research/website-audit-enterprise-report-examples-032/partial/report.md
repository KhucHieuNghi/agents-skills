# SYNTHETIC EXAMPLE — partial

Revision: synthetic-report-partial · 2026-11-18T13:00:00Z · customer

## Scope and decision summary

Report accounting: all declared checks are represented. Assessment coverage: 10.0%.

Site health: failed-checks-observed. Failed checks: 1. Unknown checks: 9. Implementation: not-started.

Independent review: pending (0/4 targets accepted). Review attribution is not proof of reviewer independence.

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
| technical-seo | 1 | 0 | 1 | 0 | 0 | 100.0% | assessed |
| tracking | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| ux-cro | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |

## Declared scope and methods

Run: synthetic-partial. Inventory: sample. Operation: audit. Assessment time: 2026-11-18T12:00:00Z.

Planning stage: intake-only. Profiles: booking, commerce.

| Entity | Type |
| --- | --- |
| site | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-1 | high / high | Synthetic redirect failure | The sample route does not reach its destination. | Illustrates a disrupted product journey; no measured revenue impact. | Inspect the redirect target in an authorized environment. | Retest the declared route. | sample-technical-seo |

## Assessment details

| Check | Module / entity | Status | Reason | Evidence |
| --- | --- | --- | --- | --- |
| 9d7628875d024921b3f85cf9ccff4c4af5c63e52ab89f47f16d2a7af37c795f9 | technical-seo / site | fail | Synthetic redirect defect | sample-technical-seo |
| ed8698bab3dd30850eb082269beecd4517c4606596b469ed8459623e96716023 | content-search / site | unknown | Intake only; collect evidence and assess this check |  |
| efe5deb8433a03bd79147cf4e08358c0a75f293a0496d5d5ea90d49ddea76e43 | search-measurement / site | unknown | Intake only; collect evidence and assess this check |  |
| 5ab3d863ccba45e39e2bd103ac2ae344239449edc78079ad4de289be8e19b9dd | analytics / site | unknown | Intake only; collect evidence and assess this check |  |
| e26ff4fba44d2692db77b656d515759153125085c2893f2711adbed9a9d1f678 | tracking / site | unknown | Intake only; collect evidence and assess this check |  |
| 27f0c75155351bf343c8f44496e97670c2e34bf222fc1e7ccee41ae7035ab2ec | consent / site | unknown | Intake only; collect evidence and assess this check |  |
| c6f9bc5a49db5bd4eb52dbac5a4f1c749683010bf6b67ee1f7e35d4fdf97dbfb | performance / site | unknown | Intake only; collect evidence and assess this check |  |
| bc59a774f50dd4cff653c538cc66a81f6032a535e1e95ffbd2107b8b7748a7f5 | accessibility / site | unknown | Intake only; collect evidence and assess this check |  |
| 3fd669fec2d411c2cec92533aa3438742f35c81c32ecfdcdf16e7b7c790581ab | ux-cro / site | unknown | Intake only; collect evidence and assess this check |  |
| c07c08ec9410fb2b67cc7009e14ca2e07487125f8df4e2a7ba18665880db904a | optimization / site | unknown | Intake only; collect evidence and assess this check |  |

## What to provide next

Requests retain declined, invalid and expired states. A provided artifact does not automatically pass an assessment.

| Artifact / scope | Status / priority | Reason | Accepted formats | How to provide | Access | Owner role | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rendered-page / site | requested / high | Can the declared pages be discovered and interpreted? Evidence is required before deciding. | HTML, browser snapshot | Provide rendered DOM plus URL, capture time, device and HTTP response; retain extraction failures. | Read-only scoped URL | Website owner | Supply repository templates and mark runtime checks pending. |
| content-sources / site | requested / high | Are claims and intended answers supported? Evidence is required before deciding. | Markdown, JSON | Supply claims and their authoritative sources, intended audience and review dates. | Read-only approved material | Content owner | Assess only supplied claims; request domain review for unsupported material. |
| business-context / site | requested / high | Are claims and intended answers supported? Evidence is required before deciding. | JSON, Markdown | Describe business outcomes, target audiences, markets, languages, journey steps and success definitions. For the selected business models, define and provide evidence for these outcomes: checkout, order-created, settled-payment, refund, availability, booking-confirmed, booking-cancelled, service-completed. Confirm which outcomes actually apply; profile labels are not business evidence. | No account credentials | Business owner | Use a scoped interview; keep unconfirmed definitions unknown. |
| search-export / site | requested / high | What do attributable search observations establish? Evidence is required before deciding. | JSON, CSV | Export page/query data with property identity, date range, filters, timezone, pagination and source metadata. | Read-only GSC/Bing export | Search owner | Supply attributed dashboard observations with limitations; public crawling cannot prove index state. |
| ga4-report / site | requested / high | Does measurement represent the intended business definitions? Evidence is required before deciding. | JSON | Supply GA4 runReport pages with property, query, dates, metric definitions, timezone, currency and pagination. | GA4 read-only report or export | Analytics owner | Use supplied report export; keep account configuration and instrumentation checks separate. |
| gtm-container / site | requested / high | Does the action map through instrumentation to the intended outcome? Evidence is required before deciding. | JSON | Export the GTM container version being tested; identify environment, tags, triggers, variables and version. | Container export without publish access | Analytics owner | Supply scoped configuration screenshots and browser traces; preserve unobserved dependencies. |
| tracking-trace / site | requested / high | Does the action map through instrumentation to the intended outcome? Evidence is required before deciding. | JSON, HAR | Capture action, dataLayer, tag/network observations, event identity and timestamps using approved test identities. Remove secrets/PII. | Scoped test browser session | Implementation owner | Provide a redacted trace export; leave unavailable links in the event chain unknown. |
| business-observations / site | requested / high | Does the action map through instrumentation to the intended outcome? Evidence is required before deciding. | JSON, CSV | Supply outcome status taxonomy, pseudonymous correlation keys, event times, window and source; include failures and unmatched records. For the selected business models, define and provide evidence for these outcomes: checkout, order-created, settled-payment, refund, availability, booking-confirmed, booking-cancelled, service-completed. Confirm which outcomes actually apply; profile labels are not business evidence. | Pseudonymized CRM/order/booking export | Business systems owner | Provide attributed manual observations; analytics events alone cannot confirm terminal outcomes. |
| consent-policy / site | requested / high | Does observed tag behavior match the supplied consent policy? Evidence is required before deciding. | JSON, Markdown | Supply intended consent modes, regions, default state, updates/revocation and applicable tag behavior. | Approved policy document | Privacy policy owner | Record technical observations only; do not infer legal compliance. |
| consent-trace / site | requested / high | Does observed tag behavior match the supplied consent policy? Evidence is required before deciding. | JSON | Supply before/after traces for defaults, reject, accept, selective choices, revoke and persistence with region and mode. | Authorized browser test | Implementation owner | Provide manual Tag Assistant evidence with timestamps; mark untested scenarios pending. |
| performance-observations / site | requested / high | What do field and lab measurements separately establish? Evidence is required before deciding. | JSON | Supply field URL/origin/device/window and lab configuration/repeats separately; preserve no-data results. | Public lab or authorized RUM export | Performance owner | Run allowed lab captures; request RUM and do not substitute lab for field. |
| accessibility-observations / site | requested / high | Which criteria and journeys were actually evaluated? Evidence is required before deciding. | JSON, Markdown | Provide automated findings with tool versions plus manual keyboard/focus/error-recovery evidence and tested criteria. | Read-only inspection or approved test journey | Accessibility reviewer | Supply manual walkthrough evidence; do not infer conformance from an automated score. |
| journey-observations / site | requested / high | Which friction is observed and which improvement remains a hypothesis? Evidence is required before deciding. | JSON, Markdown | Document each journey step, observed friction, device, failures and funnel/research provenance. | Approved test journey or supplied research | Product owner | Provide a recorded walkthrough; label heuristic advice as hypotheses. |
| optimization-scope / site | requested / high | What changes are authorized and verifiable? Evidence is required before deciding. | JSON, Markdown | Identify assets, environment, owners, authorized action classes, acceptance checks and rollback constraints. | Explicit change scope, no implicit deployment | Technical owner | Produce a recommendation backlog without applying changes. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |

No entries recorded.

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O-1 | Synthetic historical citation sample | 40/100 | cited responses / responses / exact | historical | 2026-10-01 to 2026-10-31 | Invented rendering example only | sample-technical-seo |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| N-1 | limitation | All observations and verdicts in this example are invented rendering fixtures. Intake requests remain visible. No real website, provider account, commercial acceptance or reviewer approval is represented. | sample-technical-seo |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| sample-technical-seo | Synthetic fixture; not a provider observation | 2026-11-18T11:00:00Z | 2026-11-19T12:00:00Z | c79c001b2f5dc70c1f97c517ec8aacc56ba4dffbce0f8838c739380893af14cf |

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
