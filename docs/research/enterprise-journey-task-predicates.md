# Internal journey task predicates

Development-only checkpoint for journey plan step 2. `task-rules.mjs` evaluates declared UI response and terminal business outcome separately. It is not a new customer CLI, browser collector, source importer or packaged release. Candidate 0.3.24 remains unchanged.

The existing accessibility journey-outcome predicate asks whether a desired outcome was confirmed. Its rejection result must not be promoted into an automatic UX defect. The new internal predicate instead supports explicit valid-input, invalid-input and unavailable conditions, expected UI feedback and expected business statuses. A rejection can match the declared negative test while an unexpected rejection can miss the business goal; neither implies a site-wide usability verdict. UI success does not stand in for provider acceptance or settlement.

Independent reviewer `enterprise_contract_review` found no material defect within this internal boundary. The review did not execute tests. It required the forthcoming observation adapter to resolve source conflicts and maturity before setting review flags: a short no-feedback trace is insufficient before the declared response horizon. This requirement is retained in the plan. Detailed protocols, original bytes, source attribution, correlation and timelines are still mandatory implementation work.

Twenty-one focused tests cover expected success, legitimate rejection, UI success with unexpected business rejection, unavailable conditions, pending/attempt/missing outcomes, source-review/correlation/maturity gates, environment and condition mismatch, null/false prerequisites, unproven UI observations, UI-only tasks and malformed input. Initial red execution showed the module was absent; after implementation all tests passed. Scope remains declared task predicates, not native host, clinical/domain correctness, conversion improvement or commercial acceptance.

Final repository checks passed: 137 files / 1687 tests; format, lint, typecheck, build, site typecheck and site tests. [Verification receipt](enterprise-journey-task-verification.json) binds sources and local logs.
