# Content Search Audit — required independent review

Official release 0.2.0 is an assisted audit workflow for Codex and Claude Code.
Installation supplies the audit skill and deterministic helpers. It does not
automatically install a second reviewer, enable the research command guard, or
authorize content changes. The customer or delivery owner must arrange the review
below before relying on findings or implementing recommendations.

1. Preserve the original report, action CSV, coverage, run/campaign artifacts and
   retained source snapshots. Record their hashes and the installed solution lock.
2. Assign a separate AI reviewer or qualified person who did not author the audit.
   Give that reviewer the original sources, scope, artifacts and instructions,
   rather than only the author's summary. Record reviewer identity and date.
3. Review every material finding against its actual source and context. Review
   clean controls and consequential pass/fail/unknown judgments too: supported
   findings alone do not prove complete or accurate coverage. Separate AEO
   question coverage/context from answer-evidence, which can be judged from an
   actual claim and its support without an external question set.
4. Check that action prerequisites survive in both recommendation and verification;
   historical aggregates remain dated and scoped; current measurements remain
   unknown when absent; quotes preserve qualifiers and negation. Verify all
   submitted quote spans and local report links, then reconcile against the full
   narrative. A partial quote ledger is not exhaustive verification.
5. Validate persisted artifacts with the installed helpers. Ensure narrative,
   findings, CSV, coverage and missing-data explanations agree. Do not convert
   unavailable browser/PDF/OCR capability into a content defect or complete audit.
6. Preserve the native result when a correction is needed. Record source evidence,
   exact correction, reviewer attribution and original/revised hashes. Use the
   installed review and render-revision helpers for a new structured edition;
   retain evidence beside its reports and revalidate the delivered edition.
7. Record a delivery verdict: accepted within declared scope, corrections required,
   or blocked pending evidence. If independent review is missing or unresolved,
   delivery stays pending. The content owner separately authorizes implementation.

Reviewer judgment is still fallible. Scope authorization, host sandboxing and
tool permissions remain the execution boundary; this skill does not promise
automatic command mediation or universal first-pass correctness. No ranking,
indexing, citation, traffic or revenue improvement is guaranteed.

See [0.2.0 release and evidence](../releases/content-search-audit-0.2.0.md).
