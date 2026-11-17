# Explicit semantic recovery diagnostic — 0.1.27

A fresh Claude invocation received a copy of its coverage-0127 project and an
explicit instruction to finish the missing semantic review. This is diagnostic
prompting, not a replacement for the failed single-invocation acceptance trial.
The original absolute paths in retained run metadata still refer to preserved
fixture files; this does not test project relocation or migration.

The host exited 0 after 172.26 seconds, reported cost USD 0.5949233, and submitted
six findings plus nine check assessments. The final revision is
`audit-run-reviewed-v2`; an earlier valid revision is preserved because the host
found a malformed attributed FAQ excerpt and corrected it in a new revision.
No review-helper rejection occurred. Both final validation and quote verification
were replayed successfully. All 111 preexisting files remained byte-identical.

Coverage: five declared inputs (four dossiers plus context), zero fully audited,
five pending; 130 checks, four fail, two pass, three not-applicable and 121 unknown.
These are structurally valid counts, not acceptance of the semantic decisions.

A material review issue remains: both AEO pass decisions on dossier 04 are scoped
in prose to its clean FAQ. The persisted check's unit is the entire dossier, which
also contains the unsupported setup guarantee. A clean subpart cannot establish
an item-wide pass. The host should split the inventory into meaningful assessment
units or leave the broader check unresolved/failing as supported. Its blanket
statement about missing question sets also overlooks the FAQ evidence it added.

This establishes that the helper is usable under direct recovery instruction;
it does not explain internal model motivation or prove reliable orchestration.
The next correction must preserve item/rule scope, not merely increase resolved
check counts. Independent human acceptance remains open.

`artifacts.tgz` preserves 88 files, including native logs, prompt, both review
revisions, builder, evidence, validation and original report. Archive bytes were
compared with originals. The installed package is excluded, but its preexisting
hashes are retained. `adjudication.json` records the semantic limitation; report
and final response copies are raw text. No package bytes changed in this diagnostic.
