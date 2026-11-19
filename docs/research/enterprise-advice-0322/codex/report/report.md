# Atlas demonstration business

Revision: atlas-draft-1 · 2026-11-19T12:00:00Z · customer

## Scope and decision summary

Report accounting: all declared checks are represented. Assessment coverage: 13.3%.

Site health: failed-checks-observed. Failed checks: 1. Unknown checks: 13. Implementation: proposed.

Independent review: pending (0/12 targets accepted). Review attribution is not proof of reviewer independence.

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

Run: atlas-attempt. Inventory: sample. Operation: audit. Assessment time: 2026-11-19T12:00:00Z.

Planning stage: intake-only. Profiles: booking, lead-generation.

| Entity | Type |
| --- | --- |
| website | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | medium / low | Source and rendered canonical declarations disagree on /services | In the 11:30 UTC synthetic capture, the complete source head declares https://atlas.example/services, the complete rendered head declares https://atlas.example/booking, and the complete HTTP Link layer declares no canonical. Both supplied targets pass the format check. The consistency check fails. Source: inputs/page-capture.json, /layers. | Competing declarations could make URL consolidation less predictable for this page if reproduced. The selected canonical, indexing and effects on leads or bookings are unknown. | Have website engineering reproduce the disagreement from authorized captures and trace where the canonical declaration diverges. If the discrepancy is reproduced, align the declarations with the agreed canonical strategy. Confirm that strategy with the SEO owner before choosing a URL or changing the site. | In a fresh authorized same-URL mobile anonymous capture, compare complete source head, rendered head and HTTP Link layers. Verify target format and consistency pass. Verify owner intent only when a concrete policy is supplied. Otherwise keep owner intent unknown. | canonical-row-6905e933752bb6f3d1ff0dca3e6f2a666c7b105ab4497dc01af11457b50fba89 |

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
| a5e55766d191811b7f364f6eae226f1bd3d69411e4800aa3f767ae183bcc1139 | technical-seo / website | pass | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); observed-target-format-valid. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-789129f537fbc9f71006b61e6920e4f299b26fd0bc9f98fa38adb6df197f985b |
| ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | technical-seo / website | fail | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); conflicting-declared-targets. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-6905e933752bb6f3d1ff0dca3e6f2a666c7b105ab4497dc01af11457b50fba89 |
| 7bc44895b036684c354a116a02751575b35d30c9a4b18e0e0557b3a78a4d77dc | technical-seo / website | unknown | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | canonical-row-f61ce53e51fd3c38525129163af47ef0df6ba2dc18a6c49c8a1f8e0ed30f4524 |
| 27a2fb8f7b8514c1f93d5ab7ba80098cbcc597db763d79b65a5e49fc608b8f00 | technical-seo / website | unknown | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | canonical-row-16dc8f1d52c352b88563bf7983a4a5b751069d20b26ab3a83a0d226a166ee079 |
| dab043bd2b325aae37ee44e4f24e4fd593341187532b656659fb83f9d232acab | technical-seo / website | unknown | Capture availability only: capture-unavailable. Supplied attribution; no authenticated collection or semantic SEO acceptance. | seo-acquisition-assessment-29bb6b2a21719e27afd1932e186668d01f0edcf7a35c6a1163f4e528e6e1e24b |

## What to provide next

Requests retain declined, invalid and expired states. A provided artifact does not automatically pass an assessment.

| Artifact / scope | Status / priority | Reason | Accepted formats | How to provide | Access | Owner role | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rendered-page / website | requested / high | Can the declared pages be discovered and interpreted? Evidence is required before deciding. | HTML, browser snapshot | Provide rendered DOM plus URL, capture time, device and HTTP response; retain extraction failures. | Read-only scoped URL | Website owner | Supply repository templates and mark runtime checks pending. |
| content-sources / website | requested / high | Are claims and intended answers supported? Evidence is required before deciding. | Markdown, JSON | Supply claims and their authoritative sources, intended audience and review dates. | Read-only approved material | Content owner | Assess only supplied claims; request domain review for unsupported material. |
| business-context / website | requested / high | Are claims and intended answers supported? Evidence is required before deciding. | JSON, Markdown | Describe business outcomes, target audiences, markets, languages, journey steps and success definitions. For the selected business models, define and provide evidence for these outcomes: form-submit, accepted-lead, qualified-lead, availability, booking-confirmed, booking-cancelled, service-completed. Confirm which outcomes actually apply; profile labels are not business evidence. | No account credentials | Business owner | Use a scoped interview; keep unconfirmed definitions unknown. |
| search-export / website | requested / high | What do attributable search observations establish? Evidence is required before deciding. | JSON, CSV | Provide a Google Search Console Search Performance export with page and query dimensions, clicks and impressions, property, date range, search type, filters, timezone where available, pagination or row limits, and extraction time. Keep URL Inspection results separate. | Read-only GSC/Bing export | Search owner | Supply attributed dashboard observations with limitations; public crawling cannot prove index state. |
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
| ga4-configuration / website | requested / medium | Determine stream and event configuration for lead and booking outcomes. | Scoped JSON, Dated settings snapshots | Provide property and web stream IDs, tested environment, event definitions and key-event settings, including counting methods and effective dates. Export configuration separately from GA4 report data and GTM. | Owner-provided read-only exports with personal data removed | GA4 property administrator | Use an owner-signed configuration inventory and leave provider configuration unverified. |
| bing-search-performance / website | requested / medium | Establish Bing search observations for the declared property. | CSV, JSON | Provide page and query clicks, impressions and available dimensions with property, dates, filters and any row limits. Include an explicit no-data state where applicable. | Owner-provided read-only exports with personal data removed | Bing Webmaster Tools property owner | Keep Bing performance unknown and record property access or data availability. |
| ai-search-observations / website | requested / medium | Establish observed answer visibility for a declared query set. | CSV, JSON | Provide retained response observations by surface, query, timestamp, locale and device where available. Include responses, citations, mentions, empty results and errors. Label Google AI Overviews independently of other AI answer surfaces. | Owner-provided read-only exports with personal data removed | Search research owner | Keep visibility unmeasured and document the proposed query set and surfaces. |
| url-inventory-and-index-controls / website | requested / medium | Discover the declared site population and assess effective crawl and index controls. | CSV with scoped response artifacts, JSON | Export CMS URL inventory and sitemap membership with scope, variants and exclusions. For /services and /booking provide timestamped direct status, redirect chains, robots.txt and effective Googlebot rule, X-Robots-Tag and meta robots from relevant layers. Retain failed captures. | Owner-provided read-only exports with personal data removed | Technical SEO owner | Provide an explicit partial inventory and keep missing URL controls unknown. |
| canonical-eval-services-canonical-canonical-owner-intent / website | requested / medium | single-supplied-capture; https://atlas.example/services; environment synthetic; profile mobile; state anonymous; window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive); owner-intent-not-supplied. Supplied attribution; no authenticated execution or independent acceptance. | owner-canonical-policy-json, owner-canonical-policy-markdown | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"from":"2026-11-19T11:00:00Z","to":"2026-11-19T12:00:00Z"\}. seo-owner: Preferred canonical URL and rationale for this exact page, or explicit absence of a preference; formats owner-canonical-policy-json, owner-canonical-policy-markdown; Keep the affected checks unknown; continue independent checks with available evidence. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | seo-owner | Keep the affected checks unknown; continue unrelated modules. |
| canonical-eval-services-canonical-provider-index-state / website | requested / medium | This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence. | gsc-url-inspection-v1, scoped-url-inspection-export | Target https://atlas.example/services; profile mobile; state anonymous; environment synthetic; window \{"from":"2026-11-19T11:00:00Z","to":"2026-11-19T12:00:00Z"\}. search-console-owner: Supply property, inspection timestamp and exact URL with provider-returned index state and selected canonical; formats gsc-url-inspection-v1, scoped-url-inspection-export; Keep provider index state unknown; local captures do not establish indexing. | Read-only scoped exports; no passwords, tokens, production submissions or website changes. | search-console-owner | Keep the affected checks unknown; continue unrelated modules. |
| seo-acquisition-services-browser-recovery / website | requested / medium | Supply a usable scoped capture; receipt alone does not establish semantic SEO quality. | canonical-capture-v1 | Target https://atlas.example/services; environment synthetic; profile mobile; state anonymous; kind canonical; method combined; observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). Retain original capture bytes and timestamps. A live retry outside this window requires a new target/window; never relabel its timestamp. | Read-only capture/export; separate host authorization is required for collection. Do not submit forms or change the website. | website-engineering | Keep capture availability and unresolved semantic checks unknown; continue independently supported checks. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p1-reproduce-and-resolve | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | Website engineering with SEO owner | Triage first. Implementation effort depends on the cause. | Have website engineering reproduce the disagreement from authorized captures and trace where the canonical declaration diverges. If the discrepancy is reproduced, align the declarations with the agreed canonical strategy. Confirm that strategy with the SEO owner before choosing a URL or changing the site. | In a fresh authorized same-URL mobile anonymous capture, compare complete source head, rendered head and HTTP Link layers. Verify target format and consistency pass. Verify owner intent only when a concrete policy is supplied. Otherwise keep owner intent unknown. |  |
| p2-provider-inspection | canonical-ea0eed3e79cf6f97948611b0dc7e2e486dae02231dc38044abea69edbdba281a | proposed | Search Console property owner | One scoped export and review | Provide exact-URL Inspection evidence for the corresponding authorized property and environment, if eligible. Include property, inspected URL, retrieval time, last crawl, indexing verdict, and user-declared and Google-selected canonicals where returned. | Evaluate the export with a distinct GSC URL Inspection evaluation ID and scope. Report its provider results alongside the original canonical evaluation. Its provider-index-state placeholder and request remain unknown under the original evaluation. If this synthetic URL has no corresponding property, retain the gap. |  |

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canonical-services-canonical-0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f | Supplied canonical capture count | 1 | supplied captures / exact | historical | 2026-11-19 to 2026-11-19 | https://atlas.example/services; profile mobile; state anonymous; exact observation window 2026-11-19T11:00:00Z to 2026-11-19T12:00:00Z (exclusive). One supplied capture, not an independent execution or quality score. | canonical-0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| scope | observation | Draft for the Atlas demonstration business. The supplied brief identifies a mixed lead-generation and booking site. Assessment at 2026-11-19T12:00:00Z covers the supplied evidence window from 11:00 UTC inclusive to 12:00 UTC exclusive, with a maximum capture age of 3,600 seconds. Sources are inputs/brief.md and the two original synthetic exports. The enterprise inventory setting is bounded sample because no site inventory is available. All three supplied files were reviewed. | atlas-brief, canonical-0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f, seo-acquisition-source-747b421a5108997198c60a3692f87fdab10fc1c3e46cb45f23c0397faeb97c4d |
| coverage-boundary | limitation | One site entity and one directly captured URL, /services, are represented. /booking appears only as a canonical target and remains a discovery and target-verification candidate. Zero pages were fully audited. The captured URL remains pending for page-wide assessment. No captured URLs were excluded or unsupported. The failed browser attempt is separate from page counts and added no page evidence. Site-wide item totals and exclusions are unknown because discovery was unavailable. | atlas-brief, canonical-0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f, seo-acquisition-source-747b421a5108997198c60a3692f87fdab10fc1c3e46cb45f23c0397faeb97c4d |
| collection-failure | observation | The original inputs/collection-attempt.json records attempt-one by synthetic-export-1 for atlas-demo / website, synthetic environment, https://atlas.example/services, mobile and anonymous. It ran from 2026-11-19T11:35:00Z to 2026-11-19T11:36:00Z. Status unknown, gap browser-unavailable, synthetic true, executionAuthenticated false and semanticAcceptance false. This attempt yielded no capture. The standalone 11:30 UTC capture remains usable for its scoped semantic checks. | seo-acquisition-source-747b421a5108997198c60a3692f87fdab10fc1c3e46cb45f23c0397faeb97c4d, canonical-0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f |
| collection-recovery | recommendation | Ask website engineering to supply a fresh read-only canonical capture for the same URL, mobile profile and anonymous state. Preserve all three canonical layers, completeness, timestamps and original bytes. A later retry requires a new target window. Verify capture availability in that population and evaluate canonical semantics separately. Preserve attempt-one and its unknown availability in the original window. | seo-acquisition-source-747b421a5108997198c60a3692f87fdab10fc1c3e46cb45f23c0397faeb97c4d |
| unknown-seo | limitation | The evidence leaves owner canonical intent, provider-selected canonical, index state, crawl permission, effective index controls, target eligibility, hreflang, structured data and the cause of the discrepancy unknown. The supplied head-layer summary provides no page body or claim sources for content quality, answer accuracy, or AI search readiness. No search surface was measured. Google AI Overviews and other AI answer surfaces remain unmeasured. | atlas-brief, canonical-0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f |
| unknown-operational | limitation | GA4 reporting and configuration, GTM, lead and booking outcome mapping, consent policy and runtime, field and lab performance, accessibility and journey outcomes remain unassessed. No live acquisition was performed. The exports are synthetic, and independent review remains pending. | atlas-brief, seo-acquisition-source-747b421a5108997198c60a3692f87fdab10fc1c3e46cb45f23c0397faeb97c4d |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| atlas-brief | inputs/brief.md | 2026-11-19T12:00:00Z | Unknown | 70f2041b150476774b832a70ece0fd7ba5c2bd1b4470399db026b51c24a60e99 |
| canonical-0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 0dda36d9cdb6c0d1844f8701dbf8411987aef9b150b0562a70bd48886e244d2f |
| canonical-row-789129f537fbc9f71006b61e6920e4f299b26fd0bc9f98fa38adb6df197f985b | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 789129f537fbc9f71006b61e6920e4f299b26fd0bc9f98fa38adb6df197f985b |
| canonical-row-6905e933752bb6f3d1ff0dca3e6f2a666c7b105ab4497dc01af11457b50fba89 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | 6905e933752bb6f3d1ff0dca3e6f2a666c7b105ab4497dc01af11457b50fba89 |
| canonical-row-f61ce53e51fd3c38525129163af47ef0df6ba2dc18a6c49c8a1f8e0ed30f4524 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:30:00.000Z | f61ce53e51fd3c38525129163af47ef0df6ba2dc18a6c49c8a1f8e0ed30f4524 |
| canonical-row-16dc8f1d52c352b88563bf7983a4a5b751069d20b26ab3a83a0d226a166ee079 | supplied-canonical-canonical | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 16dc8f1d52c352b88563bf7983a4a5b751069d20b26ab3a83a0d226a166ee079 |
| seo-acquisition-source-747b421a5108997198c60a3692f87fdab10fc1c3e46cb45f23c0397faeb97c4d | supplied-technical-seo-acquisition | 2026-11-19T11:36:00Z | Unknown | 747b421a5108997198c60a3692f87fdab10fc1c3e46cb45f23c0397faeb97c4d |
| seo-acquisition-assessment-29bb6b2a21719e27afd1932e186668d01f0edcf7a35c6a1163f4e528e6e1e24b | supplied-technical-seo-acquisition | 2026-11-19T12:00:00Z | 2026-11-19T12:00:00Z | 29bb6b2a21719e27afd1932e186668d01f0edcf7a35c6a1163f4e528e6e1e24b |

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
