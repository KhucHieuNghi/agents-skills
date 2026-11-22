# Answer quality and AEO

Adapted from Profound's ai-answer-accuracy-auditor and aeo-operator-2026 methods.
See [NOTICE](../../NOTICE.md). This module audits answer usefulness and factual
support; it does not manufacture a preferred answer-engine response.

## Procedure

Apply the steps for the evidence and rule being assessed; they are not a single
prerequisite chain. `aeo-question-coverage` and `aeo-answer-context` require a
question set. `aeo-answer-evidence` requires content and claim sources instead.
A missing question set leaves question coverage/context unknown; it does not by
itself prevent assessing the support for an actual material answer claim.

Tie a failure to the exact visible answer passage that is unsupported or
wrong. A conflicting schema value can be a structured-data finding while the
visible answer remains supported. See the [public review handoff](../helper-commands.md#public-review-handoff)
for the evidence record required when submitting a public failure.

1. For question coverage/context, identify real questions from supplied
   search/support/sales/customer evidence. Keep hypothetical questions labeled as
   hypotheses and preserve their source.
2. Match each question to the appropriate page and passage. Record unanswered
   conditions, prerequisites, exceptions and follow-up tasks. Do not require
   every page to target every question or contain an FAQ block.
3. Evaluate whether an answer stands on its own without changing its meaning.
   Definitions need context; comparisons need criteria; procedures need ordered
   steps and prerequisites. A table is useful only when the comparison is real.
4. For answer-evidence, identify actual decision-relevant answer claims in the
   supplied task and verify them using the content-quality procedure. Do not
   invent a question or answer purpose; retain unknown if applicability is unclear.
   Separate facts, recommendations and subjective judgments. Keep dates and
   versions attached to facts that change.
5. Test whether headings accurately describe the passage and whether supporting
   evidence is reachable. Avoid mechanical word counts or adding unsourced
   statistics to make an answer appear more authoritative.
6. For captured AI answers, inspect both requested facts and unsolicited caveats,
   rankings and comparisons. Accurate negative information is not an error to
   suppress. Classify uncertainty rather than inventing a correction.

Before persisting a verdict, reconcile all applicable answer passages within the
inventory item using the [scope contract](../scope-and-coverage.md#scope-of-a-semantic-check).
A sourced FAQ does not validate a separate unsupported product answer in the same
item. Preserve the FAQ's clean result in the report while assigning the broader
check only the conclusion its evidence supports. Do not create hypothetical
questions merely to make unrelated content fail.

## Deliverable

Question → evidence source → page/passage → answer gap → supported proposed
improvement → verification. Explain whether the issue affects human task success,
factual accuracy or measured answer representation; do not merge these outcomes.

## Limits

No promise of featured snippets, voice answers or AI citations follows from a
clear answer. Structured-data eligibility needs separate current validation.
Use source excerpts sparingly and preserve context and licensing restrictions.
