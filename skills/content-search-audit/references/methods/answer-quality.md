# Answer quality and AEO

Adapted from Profound's ai-answer-accuracy-auditor and aeo-operator-2026 methods.
See [NOTICE](../../NOTICE.md). This module audits answer usefulness and factual
support; it does not manufacture a preferred answer-engine response.

## Procedure

1. Identify real questions from supplied search/support/sales/customer evidence.
   Keep hypothetical questions labeled as hypotheses and preserve their source.
2. Match each question to the appropriate page and passage. Record unanswered
   conditions, prerequisites, exceptions and follow-up tasks. Do not require
   every page to target every question or contain an FAQ block.
3. Evaluate whether an answer stands on its own without changing its meaning.
   Definitions need context; comparisons need criteria; procedures need ordered
   steps and prerequisites. A table is useful only when the comparison is real.
4. Verify decision-relevant claims using the content-quality procedure. Separate
   facts, recommendations and subjective judgments. Keep dates and versions
   attached to facts that change.
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
