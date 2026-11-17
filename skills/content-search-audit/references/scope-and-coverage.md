# Scope, coverage and recovery

Every item retains a stable ID, URI or absolute path, source memberships, aliases,
locale/type candidates and canonical relationships. Preserve query parameters
unless explicitly identified as tracking-only. Conflicting declarations are
review inputs, not permission to silently pick a winner.

Assign a required rule plan to each in-scope item based on type and applicability.
Missing an expected rule must fail artifact validation even if all supplied checks
pass. Required rules may resolve as pass, fail or explained not-applicable. Unknown
means unresolved. Exclusions require a concrete reason tied to declared scope.

## Scope of a semantic check

A stored check is keyed by `itemId` and `ruleId`. Its verdict covers that rule's
applicable scope within the whole inventory item. Writing "FAQ only" or a passage
locator in `reason` does not create a separate coverage unit.

Before a semantic verdict, list the distinct supplied sections or component items
that matter to that rule. Apply the rule to each relevant component:

- Pass only when every applicable component has adequate supporting evidence.
- Fail when a supported material defect violates the rule; identify the component
  precisely and preserve clean components as clean. Consolidate a shared defect
  into one finding even when several rule IDs support it.
- Unknown when no supported failure is established but relevant components remain
  unassessed or lack evidence. A clean excerpt cannot resolve the broader check.
- Not-applicable requires evidence that the rule is irrelevant to the entire item.

Do not invent questions or applicability to force failures. A complete permission
FAQ can pass a question-specific assessment while an unrelated technical appendix
has no bearing on that question. But when an item combines several customer-facing
answers, verifying one answer does not establish support for all material answers.
Explain which components are relevant and which are not, with the evidence basis.

If independent source pages already exist, enumerate them separately. A supplied
aggregate dossier may remain one item: retain component-level observations in the
report and use a conservative item/rule verdict. Do not silently split, omit or
rewrite source documents to increase completed-item counts. Any later authorized
restructuring needs explicit source lineage and a reconciled inventory denominator.
Artifact validation verifies bindings and consistency, not the semantic completeness
of the reviewer-selected scope.

Terminal item states are audited, failed, blocked, unsupported and excluded.
Pending items remain queued. A terminal collection failure is accounted for but
not audited. Keep excluded items in total counts and list their reasons. Display
both full declared inventory and in-scope denominators.

`computeCoverage` checks a declared plan only. Its result does not prove discovery
completeness, authenticity of evidence or completeness of the plan itself. A final
validator must check those gates before declaring the audit complete. No-inventory,
sampled, queued or unknown-discovery runs cannot claim a full audit.

Save single-writer checkpoints at batch boundaries. Reuse only matching config and
snapshot hashes. Track every snapshot dependency of a cross-item result. Changed
or removed inputs invalidate dependent checks; changed inventories reset the
cursor to prevent sorting changes from skipping items. Recompute cross-item plans
when adding content, even if unchanged per-item checks remain reusable.

A partial report must state what was enumerated, what was examined, what remains,
why it remains and the exact input/access/capability needed to resume. Batch size
is a throughput limit, not permission to truncate the audit inventory.

## Declared content type

New inventories resolve `type` from the preserved, unique `typeCandidates`: one
candidate yields that declaration; zero or conflicting candidates yield `unknown`.
This is source metadata, not a verified MIME type or a classification inferred
from the URL, extension or collected body. Conflicting declarations remain in
`typeCandidates` for review. Legacy inventories can omit `type`; absence does not
establish a type, and validation must not invent one. When present, `type` must
match the candidates.

## Run configuration contract

New run format `version: 0.2.0` (distinct from solution release version) includes
`contractVersion: 1`, `scope`, `sourcePermissions` and `budgets`. Scope preserves
explicit input declarations, mode, inventory completeness and tracking-parameter
policy. Permissions preserve declared local roots and exact allowed public origins;
null network means offline. Budgets record effective local/run byte limits and
network byte, timeout, redirect, retry and collection-deadline limits. These values
do not grant additional access. Fixed scheduler behavior remains documented in
robots-and-scheduling.md; campaign discovery has its separate persisted contract.

Validation reads config.json, verifies its configHash and compares all projections,
including top-level scope flags. Resume creates the projections from the new
configuration; revisions preserve and verify their bound configuration. Legacy
run formats remain readable without claiming these metadata fields. Hashes detect
inconsistency, not an adversary rewriting the entire artifact set or downgrading
its format. No cryptographic authorship or runtime attestation is claimed.
