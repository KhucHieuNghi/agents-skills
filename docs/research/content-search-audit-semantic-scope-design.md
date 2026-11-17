# Semantic assessment scope and coverage

## Problem observed

The review-diagnostic-0127 trial created valid records for an aggregate dossier:
a clean permission FAQ received two AEO pass decisions, while the same inventory
item also contained an unsupported setup guarantee. A textual "FAQ only" limitation
in the reason field did not change the stored check's item-level identity.

The evidence is strongest for `aeo-answer-evidence`, whose procedure covers source
support for material answer claims. For `aeo-answer-context`, a known permission
question can be a legitimate narrower applicability set. That distinction requires
an explicit applicability assessment; unrelated content is not automatically a
failure. The previous trial note should not be read as a universal prohibition on
question-specific assessments.

## Current contract

A check is `(itemId, ruleId)`. Verdicts describe the entire applicable portion of
that item for that rule. Source excerpts explain a finding but do not silently
create another coverage unit. Reviewers must account for relevant component
passages before resolving the stored check.

| Component evidence                                              | Aggregate rule verdict            |
| --------------------------------------------------------------- | --------------------------------- |
| All relevant components assessed and supported                  | Pass                              |
| At least one supported material violation                       | Fail, with a precise finding      |
| No supported failure, but relevant components unassessed        | Unknown                           |
| Evidence shows no relevant component                            | Not-applicable with rationale     |
| A passage is clean, another component's relevance is unresolved | Unknown; retain clean observation |

A failure does not make every component defective. Preserve clean controls and
consolidate one issue across rules/dimensions. Do not invent questions, required
FAQs or applicability to create artificial failures. Each decision must follow the
specific rule procedure, not a generic rule that every answer must serve every task.

## Implementation decision

Candidate 0.1.28 clarifies the entrypoint, scope contract and answer-quality method.
No parser guesses semantic scope from English phrases in `reason`. Such matching
would reject valid scoped assessments and miss paraphrased omissions. The validator
continues checking identities, evidence bindings and structural consistency; it
cannot attest that the human/model examined every applicable component.

Use independently supplied pages as separate inventory items where available. An
aggregate export can stay one item with conservative check verdicts. Do not split
or rewrite customer input merely to increase completed counts. A future formal
sub-item model would require explicit source offsets, parent lineage, collision-safe
identities, review/resume invalidation, report aggregation and denominator migration.
That is not claimed by the current package.

## Evaluation

Keep the failed original trial immutable. Replay identical prompts/targets on fresh
installs to check normal orchestration, then inspect actual stored reviews and both
report and final reply. A host that omits review has not demonstrated correct scope,
even if its prose is accurate. A helper pass is not a semantic pass. Question-specific
clean controls must remain clean. Record evidence scope and uncertainty per rule.

The native scope-0128 trial tests the changed guidance on the known development
fixture. It is not an independent held-out benchmark or proof of general reliability.
