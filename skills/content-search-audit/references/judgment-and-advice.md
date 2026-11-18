# Judgment and advice checks

Use this before submitting a review and again on the final report and reply.
These checks address observed workflow errors; they do not create extra audit
rules, force every check to resolve, or replace the rule registry.

## Apply each rule to its own scope

Question coverage, answer support and extractability are different judgments.
A supplied question set can bound question coverage without limiting all factual
support checks to those questions. Inspect material answer claims already present
in the item, including a product promise next to an otherwise correct FAQ. Do not
invent a customer question to force an unrelated claim into AEO. Explain why the
actual passage is an answer claim under the supplied task; if applicability is
unresolved, retain unknown and record the question for the owner. A quality
finding can stand even when another dimension remains unknown. Do not double-count
the same material defect merely because more than one rule applies. Resolve each applicable check on its own
requirements, then consolidate findings. Leaving an otherwise assessable check
unknown merely to avoid counting a finding twice confuses check coverage with
issue counting. Conversely, a narrower supported finding can be persisted while
an associated broader check remains unknown; see the
[worked review](worked-review.md#findings-with-unresolved-checks).

## Keep advice within the observed evidence

For each action, compare the recommendation and verification side by side:

- Preserve the same condition in both. If an addition is needed only when a
  prerequisite is absent, a correct existing prerequisite must also pass the
  verification. Do not demand an unnecessary edit to satisfy your checklist.
  Persist that shared prerequisite as `actionCondition` on the finding; the
  renderer then scopes both action and verification. Preserve it in supplemental
  narratives too. See the report contract for the field and its limits.
- Distinguish permission, observed behavior and downstream outcome. A permitted
  crawl is not proof that a crawler fetched a page or selected its canonical.
  Evaluate the effective robots decision for the exact URL and agent; a matching
  Allow rule can be correct. Name the captured canonical signal and any competing
  signals instead of claiming it is the only signal without that evidence.
- Keep a supplied historical aggregate visible in the summary even when current
  or response-level observations are missing. Name exactly which data exists and
  which inference cannot be made. Do not turn incomplete evidence into “no data”.
- Treat a proposed diagnostic expression as code. Check its types and API meaning
  before recommending it; do not run untrusted target code to test a suggestion.
  DOM `dataset` values are strings: compare a documented `data-ready="true"`
  marker with the string `"true"`, not boolean `true`. A marker alone does not
  prove all content loaded; use the page's actual readiness contract.

The crawl/canonical distinction is corroborated by
[Google's canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
and [robots introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro).
Dataset typing is documented by
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset).
These references do not authorize network reads in an offline customer audit.

## Reconcile delivery

Reopen validated coverage and the supplied evidence before writing the summary.
Check the summary against findings, caveats, remediation and verification. An
accurate detailed paragraph does not repair a contradictory headline. Separate
fully audited items from collected items, captured observations from inference,
and proposed changes from executed changes. Preserve capability failures and
unresolved questions. Never describe a method as read if its body was discarded
or output was truncated before the relevant portion.

Use already-authorized recovery capabilities without asking for the same approval
again. An unavailable capability must remain unavailable; do not bypass isolation
or silently substitute a different execution environment.
