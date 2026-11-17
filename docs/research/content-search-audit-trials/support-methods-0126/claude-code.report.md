# Content Search Audit: offline synthetic dossiers (PARTIAL, manual review)

Report date: 2026-11-16. All organizations, prices and metrics are synthetic. Each dossier is a separate scenario; market (US), currency (USD, before tax), billing, audience and date scope are preserved per finding. Owner-approved records are comparison evidence only, not independently verified live behavior.

## 1. Scope, accounting and coverage

| Dossier | Source | Items assessed | Findings | Clean items |
|---|---|---|---|---|
| 01 | targets/01-competitor-claims.md | 3 (assertion A, assertion B, /monthly-comparison caption) | F1, F2 | caption |
| 02 | targets/02-measurement-windows.md | 3 (Draft A, 1–7 Oct caption, Draft B) | F3, F4 | 1–7 Oct caption |
| 03 | targets/03-template-service-area.md | 3 (/north-delivery, /south-delivery, /terms-v1) | F5 | /north-delivery, /terms-v1 |
| 04 | targets/04-editorial-proof.md | 3 (setup claim, permissions FAQ, /status-codes) | F6 | FAQ, /status-codes |

- Dossiers supplied and inspected: **4 of 4** (plus targets/context.md as scope). None excluded, blocked or failed.
- Content items read and assessed: **12** (6 with a material finding, 6 clean). Material findings: **6** (F1–F6), none merged across dossiers because they are different scenarios.
- Validator coverage fields (`audited`, `states.pending` and so on): **not produced**. I did not run the helper inventory, coverage or report pipeline, so there is no validated `coverage.json`. I therefore do not claim a number of "fully audited" items in the validator's sense, and I make **no full-coverage claim**. Every dossier was read, and applicable offline checks were completed for the evidence supplied. The checks below that need live data are listed as missing.
- Source file SHA-256 (at audit time): 01 `78ae98b9ff3173c3eb6a2607f5ca808a869fb2260588b85142ef263524b2ca08`; 02 `c7bf7c1cbaab988ecd467d39cbb700d7af443f0684bc1316a46af03e5c95c975`; 03 `7215e6edd3d998e0e51cde50c39136389bf37349a0351825db23560ea62ff65f`; 04 `0dd28fa3b7a1b1c1c144df34a31431fa083c76415f95541479516a5000bc5791`.
- No URLs were fetched, no accounts accessed, no targets or skill files modified, no other skill invoked, nothing installed.

## 2. Material findings

Dimension labels: CQ content quality, SEO, AIO (AI search optimization), AEO (answer quality), GEO (generative visibility), PF portfolio. Each issue is one finding even if it touches several labels.

### F1. Draft /compare assertion A: SSO claim is contradicted by supplied docs (CQ, AEO, GEO risk) — High

Scenario: dossier 01, current Nov 2026 US plans. Affected item: draft /compare assertion A.

Observation (01-competitor-claims.md:17):

> A. "Fir has no SSO, as its pricing table proves."

Supplied evidence (01-competitor-claims.md:12-14):

> Fir pricing-table excerpt does not mention SSO. Supplied current Fir SSO docs: "SAML SSO is available on Enterprise, with a minimum of 20 paid seats." No SSO statement is supplied for Fir's other plans.

Interpretation: a table that does not mention SSO cannot prove absence. The owner-supplied docs say SSO exists on Fir Enterprise with a 20-seat minimum, so the claim is contradicted for that plan. Whether other Fir plans lack SSO is unknown from the supplied evidence.

Proposed action (recommendation only, no edit made): remove the claim, or replace it with a sourced statement that preserves scope, for example that the supplied docs describe SAML SSO on Enterprise with a 20-paid-seat minimum, and say nothing about other plans unless a current source is added.
Verification: owner re-checks the current Fir SSO documentation and records its capture date; the revised sentence is compared against the quoted doc text and carries that scope. Treat the owner-supplied quote as attributed, not independently verified.

### F2. Draft /compare assertion B: "every billing option" is false for annual billing (CQ, SEO, AEO, GEO risk) — High

Scenario: dossier 01. Affected item: draft /compare assertion B.

Observation (01-competitor-claims.md:18):

> B. "Cedar is cheaper per seat than Fir on every billing option."

Prices (01-competitor-claims.md:7-9):

> Our annual option: USD 10 per seat per month equivalent, billed annually. Competitor Fir monthly option: USD 15 per seat per month, billed monthly. Fir annual option: USD 9 per seat per month equivalent, billed annually.

Interpretation: monthly, Cedar USD 12 (01-competitor-claims.md:6) vs Fir USD 15, so Cedar is cheaper by USD 3. Annual, Cedar USD 10 vs Fir USD 9 equivalent, so Cedar is USD 1 more expensive. The universal claim fails on the annual option.

Proposed action: limit the claim to monthly billing, or state both options accurately. Do not add total-cost or feature-equivalence claims; no evidence supports them.
Verification: recompute each billing option from the owner price records, and confirm the final wording names billing period, US market, USD, before tax.

### F3. Draft A: October cost per conversion divides full-month spend by a one-week conversion count (CQ, AEO) — High

Scenario: dossier 02, one campaign, USD, October 2026. Affected item: Draft A.

Observation (02-measurement-windows.md:10):

> Draft A: "October cost per conversion was USD 85.71, from 3000 divided by 35."

Windows (02-measurement-windows.md:5-8):

> Spend is complete for October 1–31: USD 3000. Conversion export covers only October 1–7: 35 completed conversions. No conversion data exists for October 8–31. The same spend export gives October 1–7 spend of USD 700.

Interpretation: numerator covers Oct 1–31, denominator covers Oct 1–7, so the figure is not an October cost per conversion. Conversions for Oct 8–31 are unmeasured, not zero. Arithmetic 3000/35 = 85.71 is correct but the windows do not match. The conversion-linked October figure is unavailable.

Proposed action: withdraw Draft A, or relabel it as unmeasured. Use the matched-window caption, and state that the remaining October is unmeasured.
Verification: every ratio names one window with numerator and denominator drawn from that same window; a reviewer confirms the Oct 8–31 conversion export was obtained before any full-month ratio is published.

### F4. Draft B: extrapolation from 15 tracked AI referrals to 150 is unsupported (CQ, AIO, GEO) — High

Scenario: dossier 02, independent October referral report (separate from the campaign counts). Affected item: Draft B.

Observation (02-measurement-windows.md:17-18):

> Draft B: "These 15 tracked sessions prove AI assistants generated 150 sessions in total, because only one in ten AI referrals can be tracked."

Supplied evidence (02-measurement-windows.md:14-16):

> Independent referral report: 15 October sessions have an identified AI-assistant referrer. Other sessions have unknown origin. No model estimating untracked AI influence, incrementality test, complete session count or conversion linkage exists.

Interpretation: the 1-in-10 tracking rate is asserted with no supplied basis, and "prove" and "generated" overstate it. The supported fact is only 15 sessions with an identified AI-assistant referrer in October; the rest are unknown origin, not zero and not AI.

Proposed action: report "15 October sessions had an identified AI-assistant referrer; other sessions have unknown origin." Do not state a total or causal influence.
Verification: any total needs a documented tracking-rate method or an incrementality test; until then, check that the published text has no multiplier and does not join these sessions to campaign conversions (02-measurement-windows.md:20-21 forbids combining them).

### F5. /south-delivery states same-day delivery, contradicting approved South policy (CQ, AEO, PF) — High

Scenario: dossier 03, current policy. Affected item: /south-delivery. The identical-text issue is not a separate duplicate finding.

Approved policy (03-template-service-area.md:4-5):

> Current approved policy: North serves same-day delivery, Monday–Friday, orders placed before 10:00 local time. South serves next-business-day delivery only.

Page text (03-template-service-area.md:10-11):

> /south-delivery: "South: same-day delivery Monday–Friday for orders before 10:00 local time. Orders outside that window require a later delivery date."

Interpretation: the page appears to carry the North passage under a South label. It promises a service that approved policy says South does not offer; this is customer-facing and likely to cause failed expectations. The 2024 archive describing same-day South service is not the cause (see clean cases).

Proposed action: owner updates /south-delivery to the approved next-business-day-only policy.
Verification: compare final page text with the approved policy sentence; confirm /north-delivery is unchanged and /terms-v1 is still labeled 2024 and links to both current pages.

### F6. Draft landing-page guarantee exceeds the supplied evidence (CQ, AEO, GEO risk) — High

Scenario: dossier 04. Affected item: draft landing-page claim.

Claim (04-editorial-proof.md:6):

> Draft landing-page claim: "Every team is guaranteed to finish setup in 10 minutes."

Evidence (04-editorial-proof.md:3-5):

> Approved product record: for 20 observed onboarding sessions in a supplied study, the median completion time was 15 minutes. The owner supplies no maximum time, guarantee, refund policy, percentile distribution or wider population estimate.

Interpretation: the record gives a median of 15 minutes for 20 sessions. A median does not bound any one team's time, there is no guarantee or refund policy, and the 10-minute figure is below the observed median. The claim has no support.

Proposed action: remove the guarantee and 10-minute figure. If the owner wants a time statement, state only the supplied one with its scope: median 15 minutes across 20 observed sessions in a supplied study.
Verification: the published wording matches the approved record, with sample size and statistic stated, and contains no "every", "guaranteed" or population generalization unless a policy and data are supplied.

## 3. Clean and uncertain cases

Clean (observation supports the item as scoped):

- **/monthly-comparison caption** (01-competitor-claims.md:21): "On the supplied monthly plans, Cedar is USD 3 less per seat per month before tax." 15 − 12 = 3, and it is limited to monthly billing, USD, before tax. The owner's stated limits (no total cost, equivalence or universal superiority, lines 22-23) are consistent. Clean.
- **October 1–7 caption** (02-measurement-windows.md:11-12): "For October 1–7, observed cost per completed conversion was USD 20 (700 divided by 35). The rest of the month is unmeasured." 700/35 = 20, windows match, and the gap is disclosed. Clean.
- **/north-delivery** (03-template-service-area.md:8-9) matches approved North policy (lines 4-5). Clean.
- **/terms-v1**: owner states it is a clearly labeled 2024 archive that accurately describes the 2024 contract, with links to current pages and no mixed-version task (03-template-service-area.md:13-16). I did not see the page itself; this rests on owner attestation. No finding, and no outdated-content or consolidation finding is raised.
- **Shared layout and generic contact wording across the two current pages**: intentional, different regions, both retained (03-template-service-area.md:18-20). No duplication, cannibalization or consolidation finding; no overlap data exists to support one. The only defect is F5's incorrect South policy text.
- **Permissions FAQ** (04-editorial-proof.md:9): "Can editors delete the workspace? No. Only workspace owners can delete it." The owner states the policy matches and no further conditions are needed (lines 10-13). Complete and direct. Clean.
- **/status-codes** (04-editorial-proof.md:15-19): owner-approved terse reference. No authorship, readability, CTA or task-failure evidence; style is not evidence of authorship. Clean, with no change recommended.

Uncertain:

- Whether Fir's non-Enterprise plans have SSO (F1): unknown.
- Conversions and cost per conversion for Oct 8–31 (F3): unmeasured.
- Total AI-assistant referral volume and influence (F4): unmeasured.
- Rendered page state, metadata, structured data, canonicals, indexability, internal links, titles, headings, schema and crawl directives for all pages: not supplied, so technical SEO and AIO structural checks are unassessed. Only text claims were assessed.

## 4. Missing measurements and coverage limits

- No Search Console, GA4, Bing, server log, ranking, keyword-volume, backlink or index data. Absence is unmeasured, not zero.
- No AI observations, generated-answer captures, citations or engine output in any dossier (explicitly stated in dossiers 01 and 02). GEO visibility, mention rate and citation rate are not assessed; this report offers readiness observations only (for example, claims that could be repeated by an answer engine, F1, F2, F4, F6, should be corrected first). No visibility score is given.
- No conversion data for dossier 01 and no conversion linkage for AI referrals in 02.
- Pages were never seen as live or rendered; content comes from owner-supplied excerpts in the dossiers, not collected snapshots. Quoted pricing, SSO docs and policy are owner-supplied and unverified against live sources.
- Dossier 02 figures are owner-supplied counts, not a connector export.
- Helper pipeline (inventory, coverage validation, rendered report, CSV) not run; no validated coverage output exists.
- Where a dossier says its inventory is complete (03 only), that is owner attestation. Dossiers 01, 02 and 04 do not declare a complete page inventory, so completeness beyond the named items is unknown.

## 5. Next steps (recommendations only)

1. Owner corrects F5 first (policy contradiction on a service page), then F1, F2, F6 (unsupported or false comparative/guarantee claims).
2. Re-state F3 and F4 using matched-window and observed-only wording.
3. Obtain Oct 8–31 conversions, current Fir plan SSO docs, and any live captures for a fuller audit. Re-run with measurement imports.

Ledger and receipt for the quotations in this report are saved beside it (quote-ledger.json, quote-receipt.json). The ledger submits 15 quotations (12 finding quotations, 3 clean-case quotations), and the receipt verifies those spans only. Unsubmitted: short cited fragments and paraphrases such as the Cedar USD 12 price (01-competitor-claims.md:6), the no-combination instruction (02-measurement-windows.md:20-21), the /north-delivery passage and owner attestations in 03 and 04 were checked manually against the source lines cited.
