# Author-side semantic evaluation aggregation

`node scripts/eval-content-audit.mjs ADJUDICATION.json NEW-RESULT.json` aggregates
one explicitly adjudicated response. It is an author tool outside the customer
skill and does not introduce a second customer invocation. Output is new-only;
existing results are never overwritten. No API, model, network or external
installer is used.

## Input contract

Use the retained `semantic-expanded-014/codex.material-adjudication.json` or
`interrupted-process-016/claude-code.reporting-adjudication.json` as a concrete
example. Paths in `response.path` resolve relative to the adjudication file.

- `schemaVersion: 1`, unique `trialId` and `cohortId`, supported `host`, exact
  installed `componentDigest`, and `response.path` / `response.sha256` identify
  the reviewed bytes and cohort. The tool verifies the response hash; it does not
  independently prove which installed package generated the response.
- `reviewer` names the person or primary agent and its `kind` (`human` or
  `primary-agent`). This is attribution, not authenticated independence.
- `goldUnits` lists unique material issue IDs with explicit `critical` flags.
  These come from a separately curated rubric. An empty set cannot yield recall.
- `findings` inventories distinct predicted material issues: unique `id`,
  `verdict` (`supported`, `unsupported`, `unjudged`), exact response `quote`,
  adjudication `rationale` and `sourceRefs`. A supported issue may receive one
  known `goldId`; duplicate credit is rejected. Consolidate repeated descriptions
  of the same issue before scoring. Supported novel findings can contribute to
  precision, but not recall against gold they do not match.
- `findingsComplete` explicitly states whether all predicted material issues were
  inventoried and adjudicated. A subset matching known gold is not a precision
  evaluation. If false, or if any issue is unjudged, both precision and recall
  remain null; matched/unmatched gold counts remain visible, and unmatched IDs
  are not classified as definitive misses.
- `requiredCases` / `accountedCases` preserve scenario coverage, including clean
  controls. Unknown or duplicate IDs are rejected. Empty required cases cannot
  satisfy accounting.
- `criticalChecks` records each critical behavioral check's ID, verdict
  (`pass`, `fail`, `unjudged`) and evidence-based rationale. An empty set cannot
  satisfy the critical gate. The author must define all required checks; this
  aggregator cannot infer omitted checks from a prose specification.
- `reportingErrors` and `fabricatedMetrics` require exact response quotes and
  rationales. `instructionFailures` requires trace references and rationales.
  `instructionReviewComplete` requires explicit trace review independently of a
  successful recovery check. `reportingReviewComplete` distinguishes fully reviewed absence from unreviewed
  absence. Reporting errors are not silently treated as missing content findings.

All quoted passages must occur in the hash-bound response. Source/trace references
and adjudication truth require reviewer inspection; their presence is not proof
that the conclusion is correct. The CLI also binds the exact input JSON hash in
its output, so changing the rubric or review changes its identity.

## Computation and gates

Precision uses supported / (supported + unsupported) predicted issue units.
Recall uses distinct matched gold / total gold units. No zero denominator becomes
100%; unknown is represented by null. A complete adjudication exposes missed gold
IDs. Distinct scopes and repetitions stay in separate output records; this tool
does not pool hosts, repeated seeds or cohorts to inflate sample size.

`thresholdsMet` requires the spec's 90% precision / 80% recall targets, all critical
gold and critical behavioral checks, full case accounting, complete reporting
review, no recorded reporting errors, no fabricated metrics and no instruction
failures. These are gates for the supplied adjudication, not proof that the
rubric is exhaustive. `releaseAccepted` is always false: packaging, domain
coverage, independent human acceptance and other product gates remain external.

## Retrospective application

The Codex expanded-fixture receipt binds six observed gold matches but deliberately
marks its predicted-issue/reporting inventory incomplete. The tool reports six
matches with null precision/recall and does not convert selected examples into a
perfect score. The interruption receipt binds Claude's incorrect 28,200 total and
its overlooked cursor statement; successful artifact recovery does not erase
these report defects. Both generated results remain below acceptance gates.

Eight tests cover denominators, unjudged/partial inventories, exact quotation and
response integrity, duplicate/unknown gold credit, report/case gates, empty sets,
actual CLI file binding and new-only output. They verify arithmetic and contracts,
not reviewer truth or model behavior. Frozen skill candidate 0.1.6 is unchanged.

## Complete saved-report application

`content-search-audit-trials/capability-freshness-019/*.report-adjudication.json`
now demonstrates complete predicted-issue and report review rather than a selected
gold-match subset. Each bound input is the entire archived report (`*.report.txt`),
not only final chat prose. Both reports contain two supported material issues and
match two gold units. Codex meets the local rubric's gates; Claude fails reporting
because the complete report contains two independently identified inconsistencies.
Both outputs retain `releaseAccepted: false`. The seven-case, two-gold retrospective
rubric is not the full product benchmark and is not independent human review.
All recorded tool invocations are separately accounted in tool-review-receipt.json;
source/trace references still require human/agent inspection, not mere presence.
