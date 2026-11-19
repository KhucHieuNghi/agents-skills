# Experiment evidence in immutable enterprise reports

This development checkpoint connects supplied experiment evidence and attributed review to enterprise run revisions and JSON/Markdown/HTML reports. It does not release a packaged skill, authenticate reviewers/providers, authorize rollout or establish causal acceptance.

## Contract and lifecycle

`evaluateEnterpriseExperiments(sourceDirectory, bundle, outputDirectory)` in `scripts/enterprise-journeys/experiment-workflow.mjs` requires sourceDigest, newRunId, assessmentAt and a nonempty evaluations list. Each entry binds evaluationId, original context without assessmentAt, aggregateSources, supportSources, reviewPolicy, receipt and presentation labels. Customer/entity scope and the selected ux-cro module must match the run. Retained evaluations are reassessed as part of each revision; an empty incoming bundle is not supported.

Original entry bytes, evaluation time and an evaluator source fingerprint are retained as private evidence. Replay checks ownership, lineage, exact evidence identity and evaluator compatibility before rebuilding the decision. Unsupported historical evaluator fingerprints reject rather than silently reinterpret history. Context/protocol and synthetic classification cannot change under the same evaluation ID. Policy and presentation revisions retain prior evidence. Fresh output directories prevent overwriting source runs.

One canonical request remains attached to every retained evaluation. Provided means the attributed review is accepted and the decision is not blocked, not that the experiment succeeded. Adverse or inconclusive evidence can fulfill the request. Expired review/source eligibility reopens it as expired; fresh conflicts or changed review bindings can invalidate it. An explicit declined state remains declined even when subsequently supplied evidence is usable. Fulfillment binds the exact private evaluation evidence, and deleting a retained request is rejected.

Customer narratives allow only supplied bounded labels, validated numbers/enums and fixed explanatory text. Raw support documents, reviewer reasons and receipts remain private. Reports retain original arm counts, missingness, metric roles/directions/margins and applicable interval method, family size and approximate coverage. Missing eligible evidence stays unknown; blocked interpretation does not become zero effect. Historical and current narratives remain separate. Neutral unknown UX checks do not automatically become findings or a site-wide UX pass. Public editions withhold customer narratives.

## Verification and independent review

Ten workflow cases cover canonical output, expiration/history, refusal, policy change, synthetic-to-real rebinding, index deletion, output preservation, deleted declined requests, conflicting fresh evidence and forged fulfillment. Fourteen existing receipt cases remain in place; their fixture is shared through `tests/helpers/experiment-reviewed.ts`.

The independent reviewer initially ran 21 cases and reproduced a P2 ownership defect: deleting a declined request could recreate a provided request. A failing regression reproduced it before the exactly-one-owned-request guard was added. The independent reviewer rechecked the final correction and independently ran all 24 workflow/receipt cases successfully, with no remaining material finding in that scoped review. It did not run the full repository suite or browser harness. The initial expiration test also attempted an unsupported empty incoming bundle; its fixture was corrected to resubmit the original entry. This was a harness correction, not a change to the shared fork contract.

The offline browser harness `tests/browser/enterprise-experiment-report.mjs` covers fresh/expired revisions, customer/public editions and widths 390/1440: eight cases passed. It checks canonical narrative parity, absence of external network/scripts/page errors, horizontal overflow, skip focus and literal escaping of an adversarial HTML label. Receipts and screenshots are retained locally in `build/enterprise-experiment-report-browser/`. These synthetic checks do not establish real-experiment validity, native host behavior, accessibility conformance or general usability.

## Remaining acceptance

Multi-module assembly, installed native Codex/Claude behavioral trials, real authorized experiment evidence, independent holdouts, full remediation/recovery and commercial evaluation remain open. Private evidence here is not a complete enterprise retention/access-control system. No archive, package lock, customer website or deployment is changed by this checkpoint.

Final repository verification: format, lint, typecheck, build, root tests, site typecheck and site tests all returned exit code zero. Logs are retained locally in `build/enterprise-experiment-workflow-verification/`. These checks do not close the remaining acceptance gates above.
