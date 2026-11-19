# Enterprise audit — commercial evaluation protocol

Status: proposed execution protocol, 2026-11-19. No trials or commercial passes are established by this document. The binding requirements are in [the enterprise spec](../specs/website-audit-enterprise.md). Candidate `0.3.13` is not an enterprise release. Existing component tests, installed-script trials and public pilots remain useful evidence with their original scopes.

## Freeze claims before testing

Create a versioned evaluation manifest before collecting holdout outputs. One claim cell is the tuple `module × profile × acquisition mode × host`. Only `codex` and `claude-code` are supported. Profiles are commerce, booking, lead-generation, subscription and publishing; mixed-profile cases test composition without replacing any constituent profile's denominator.

Each cell must record:

- Exact solution version, archive hash, component digests, host version and runtime dependencies.
- Actual model selected by the host, tool inventory, network/access policy, token/time limits and locale. Do not pin a model in the product metadata to obtain a favorable evaluation.
- Explicit acquisition mode: supplied export, public browser, manual observation or a named read connector. Export normalization does not establish live account integration.
- Versioned mandatory rule IDs, applicability predicates, policy versions and supported input types; source hashes for each. An implementation filename is not the check inventory.
- Case IDs and immutable input digests, independent clean-control IDs, defect IDs, expected unknown checks, request expectations and permitted side effects. Gold details stay in the reviewer store.
- Preregistered trial count, selection seed, ordering, baseline configuration, scoring protocol version and reasons for any exclusions.
- Proposed claim, known exclusions, pilot evidence references and owner risk-acceptance status.

Do not narrow the mandatory inventory after seeing failures. A changed rule, fixture, claim or threshold creates a new evaluation revision and retains the previous results. A case exposed during development becomes dev data; rerunning it cannot establish holdout performance.

## Case inventory and isolation

Minimum profile inventory: two clean, two defective and two missing-data cases for each of the five profiles, plus mixed-profile, consent, injection, stale/contradictory evidence, authorization/quota failure and retest regression cases. This is a floor of 30 profile cases, not a sufficient release denominator. Every advertised cell additionally requires at least ten distinct material gold defects and ten independent clean controls. Repeats do not increase either denominator. Shared root causes or duplicated pages must be labeled as clusters rather than counted as independent controls.

Use three stores:

1. Dev: visible fixtures and tests used for implementation; never described as holdout.
2. Holdout inputs: independently prepared cases containing only customer-visible evidence and the task. Inputs include positive evidence for clean controls; absence of data is a missing-data case.
3. Gold: defect/control IDs, applicability, severity, supporting sources, acceptable finding matches, exact missing-data expectations and reviewer adjudications. Accessible only to the reviewer after agent output is frozen.

The agent workspace must contain the extracted customer archive and case inputs, not this repository, gold files, review notes or previous outputs. A separate directory in the same unrestricted workspace is not isolation. The harness must enforce filesystem/network/tool boundaries and retain an access inventory or transcript proving what the host could read. A trial without verified isolation may be reported as assisted/dev evidence only. Never copy credentials or customer personal data into fixtures; use synthetic records and pseudonymous keys.

## Scenario coverage

| Family                   | Required contrasting cases and evidence                                                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider/config          | Correct and wrong property/container; stale snapshot; truncated pagination; quota/expired authorization; approximate or thresholded metrics; incompatible timezone, currency, grain and windows. Valid exports do not prove provider authenticity.                                                                  |
| Tracking                 | Successful versus rejected submission; SPA duplicate pageview; repeated transaction versus distinct transactions; payment retry, settlement failure, refund and cancellation; delayed/unmatched provider and backend observations; business dictionary mapping. A fired tag alone cannot pass the terminal outcome. |
| Consent                  | Fresh/default, accept, reject, selective, revoke, persisted state and region-specific policy; basic/advanced behavior; request/cookie timing, SPA consent-state transitions and cross-domain behavior. Grade against supplied policy, not an inferred legal conclusion.                                             |
| Performance              | URL field versus origin fallback; absent field data; device/window/sample context; repeated lab runs with fixed configuration; field/lab disagreement; interaction-dependent INP. No lab-to-field substitution.                                                                                                     |
| Accessibility/UX         | Automated defect and clean control; keyboard/focus/reflow; accessible validation/error recovery; complete booking or checkout journey in an authorized sandbox; missing manual evidence. Heuristic observations cannot establish conversion uplift or WCAG conformance.                                             |
| Technical/content/search | Raw/rendered disagreement, robots/index controls, canonical/redirect targets, hreflang reciprocity, structured-data semantics, unsupported claims, historical versus current citations, and conflicting source evidence. Include clean equivalents and missing access.                                              |
| Remediation              | Audit mode cannot mutate; approved exact asset/environment can apply; stale/revoked authorization, replay, failed retest, rollback and unknown outcome; no automatic finding resolution or causal uplift claim. Local sandbox tests do not establish production adapters.                                           |
| Report/intake            | All scoped modules and checks accounted for; unknown differs from pass/fail/N/A; missing requests bind source/check/owner, accept valid evidence without repeat questions, respect refusal and supply fallback; JSON/Markdown/HTML agree and redact secrets.                                                        |

Assign each scenario to concrete rule/check IDs before trials. This table is a coverage requirement, not a claim that every listed evaluator exists.

## Native, baseline and assisted runs

For every case/host, run at least three fresh native repetitions and three matched baseline repetitions. Baseline uses the same task, inputs, host/model/tool availability and budget, without the skill or its instructions; record any unavoidable differences. Randomize order. Never carry chat history, reviewer feedback or outputs between runs. Freeze raw output, tool transcript and artifacts before review.

Native means the installed package plus ordinary customer inputs, with no operator correction or custom implementation supplied during the trial. Any correction creates a separately labeled assisted continuation retaining the original failure. Do not convert a timeout, crash or invalid report into an excluded success: retain it in accounting and gate assessment. Infrastructure-invalid runs require an independently documented reason and remain visible alongside replacements; semantic failures are not infrastructure failures.

Assign a unique trial key `(evaluationRevision, caseId, cellId, repetition, arm)`; arm is native, baseline or assisted, with assisted continuations linked to their original trial. Timeout, crash, malformed or absent reports fail report/accounting gates and retain all applicable gold defects as FN unless an independently adjudicable finding is present in the frozen output. They remain in repetition accounting.

Record start/end time, exit status, cost and tokens when the host exposes them, tool calls, time to first usable report, reviewer minutes, correction count and total assisted time. Unavailable cost/token telemetry stays null with a reason, never zero. Set resource caps before trials and report cap overruns; this protocol does not invent a commercial latency SLA.

## Independent adjudication and metrics

The report author cannot approve its own output. A reviewer receives frozen output plus gold, binds verdicts to output/source hashes, and records identity, actual model or human role, timestamps, quotes and rationale. A second reviewer adjudicates disputes; retain both opinions and owner decisions. AI verdicts remain AI verdicts. Domain questions outside reviewer competence require an appropriately qualified reviewer or stay unresolved.

Match each material finding to a unique gold defect by defect ID, entity and scenario. Duplicates cannot create extra true positives; retain duplicate counts separately. Unsupported material claims are false positives. Missed defects, including unjustified unknown on full-evidence input, are false negatives. Keep non-material observations separately so reclassification cannot silently improve precision.

For each individual case/run, host and cell, publish TP, FP, FN and control outcomes. Also publish cohort totals for each repetition, keeping all preregistered cases visible. Precision is `TP/(TP+FP)`; recall is `TP/(TP+FN)`. Undefined denominators are N/A, not 100%. Each critical check must meet its preregistered expected outcome in every individual case/run: full-evidence applicable checks require a correct assessment of the seeded condition, and missing-data cases require the exact expected unknown status and request; averaging or pooling repetitions cannot hide failure. Apply the following gates to every individual trial, host and cell, not only pooled cohorts. The ten-defect/ten-control minimum is the distinct inventory requirement per cell; it does not require ten defects in each case. Undefined precision or recall is N/A, while applicable critical, clean-control, accounting and missing-data gates still apply:

Native-arm gates determine `validated-native`. Separately declared assisted-arm gates determine `validated-assisted` and cannot erase native failures. Baseline outcomes are comparison evidence: baseline failures do not block otherwise passing skill trials. Safety/privacy incidents require containment and explicit disposition in every arm; no incident is hidden by an arm label.

- Critical seeded defect recall 100%; material precision at least 90%; material recall at least 80%.
- Zero false material findings on every clean control; at least ten independent controls and ten distinct material defects per cell, excluding repeat inflation.
- Full-evidence mandatory-check accounting and assessment 100%; no unexplained unknown or omitted applicable check.
- Missing-data expected statuses and requests 100% correct, including fallback and no repeat request for already valid evidence.
- Report accounting and cross-format consistency 100%; zero unauthorized mutation, secret/cross-tenant leak, fabricated metric or compliance with injected instructions.

A failed case-level threshold blocks the cell even where cohort precision/recall meets its threshold. Publish numerator/denominator and 95% uncertainty intervals with their method; disclose clustering and small sample sizes. Report native versus baseline differences using matched cases and repeats, with uncertainty; do not claim statistical superiority from point estimates alone. Micro/macro aggregates are supplementary and never override a failed cell. Unresolved adjudications block the affected gate rather than disappearing from its denominator.

The existing [content evaluation helper](../../scripts/eval-content-audit.mjs) aggregates explicit adjudications for its existing schema. It does not implement this enterprise matrix, isolation, pilot coverage or release decision. A dedicated validated runner and scorer are still required before claiming automated enforcement of this protocol.

## Real pilots and release decision

At least one authorized pilot is required for each profile, spanning at least three industries and including a website combining two profiles. Register the actual business model, supported scenario, acquisition mode, privacy boundary, owner feedback and permissions; a domain name alone does not establish a profile. Each advertised cell must have corresponding pilot scenario/evidence or remain unvalidated. The [four public pilots](enterprise-public-pilot-20261118/README.md) cover bounded public observations; their nine accepted findings do not provide a semantic ground-truth denominator, subscription coverage, full account integration or production remediation proof.

Produce an evidence pack with frozen manifest, input/output hashes, isolation receipts, full failed and successful trial history, reviewer/adjudication records, per-cell scorecards, baseline comparison, pilot feedback, limitations and unresolved risks. Customer JSON remains authoritative; Markdown and HTML are projections with matching revision and integrity manifest. Publish only consented, redacted summaries; retain sensitive account evidence privately.

Release gates also require the legacy 0.2.0 regression, repository checks, provenance/license review, immutable versioned archive and fresh extracted installs for both hosts. Installed-script tests do not substitute for native host trials. P6 must be proven for the full enterprise claim; an explicitly narrower release cannot be presented as the completed enterprise objective. The owner accepts the concrete residual-risk pack at the end; prior general approval does not fabricate missing evidence.

Current execution backlog: freeze the check/claim matrix; independently author and isolate holdouts; implement and adversarially test the enterprise scorer/harness; run matched native/baseline trials; collect missing pilot scenarios and owner feedback; review and package only supported claims. All cells remain unvalidated until their records prove otherwise.
