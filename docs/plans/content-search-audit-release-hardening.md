# Content Search Audit release hardening

Baseline: `4a623204aa3b53d79f30e13c0623df340d87d3fc`, published candidate 0.1.31.
The owner requests completion toward an official release. This does not supply
the missing independent semantic verdict or waive the spec's quality thresholds.

## Work

1. Reconcile current gates from spec, implementation and immutable native reports.
2. Correct demonstrated packaging/workflow weaknesses and evaluation accounting;
   add regression tests that exercise behavior. Preserve five upstream pins.
3. Build a new immutable candidate, verify both host installations and run fresh
   native behavioral regression against unchanged targets with gold withheld.
4. Record exact-version evidence, remaining defects and a concrete independent
   review handoff. Promote only when all gates actually pass.

## Initial findings

- Engineering checks and offline installs passed for 0.1.31; this is not semantic
  acceptance. Six current offline reports have no human adjudication.
- Claude reports retain conditional-advice, measurement-summary and technical
  inference errors. AEO applicability across mixed components remains disputed.
- Codex extraction trace discards method bodies and its narrative uses the wrong
  type for a DOM dataset readiness predicate. These are bounded observed failures.
- The package README still describes implemented discovery/global review as
  unfinished. Correct this without implying behavioral acceptance.
- The evaluator grants only one gold unit per finding although the expanded
  fixture explicitly allows five findings covering six distinct gold units.
  Support multiple explicit unit matches without inflating finding precision.
- Frozen reviewer manifests bind source-tree files. Historical verification must
  use the baseline checkout after package changes; do not rewrite their hashes.

## Decisions

- Keep the existing spec thresholds and clean controls. No redefinition to make
  recorded results pass; repeated trials remain separate development evidence.
- Independent review remains the user's selected role. Agent/source tests cannot
  impersonate that verdict. Prepare the actual results before requesting it.
- Optional live connectors and guaranteed search uplift are not V1 release gates.
  Supplied-export support and explicit missingness are the promised contract.

## Verification ledger

Initial audit: clean working tree; baseline commit matches the publication handoff.
Primary source refresh: Google canonicalization and robots introductions, and MDN
HTMLElement.dataset inspected for the specific retained technical mistakes.

## Outcome

Candidate 0.1.32 prepared with new native development evidence. See
[release readiness](../research/content-search-audit-release-readiness-0132.md).
Technical package/install gates pass; behavioral and human acceptance gates do
not all pass. No official promotion or production deployment performed.
The native expanded report repeats known summary/conditional-advice errors and
Claude extraction discards method bodies despite guidance. Preserve these as
negative results; do not treat the new helper as semantic enforcement.
