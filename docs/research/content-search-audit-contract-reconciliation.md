# Contract reconciliation — candidate 0.1.10

This checkpoint inspects the current source and retained artifacts against the
original design/plan. It is not a declaration that the goal or every numbered task
is complete. The existing completion audit remains authoritative for broader
semantic and release work. No package bytes change in this checkpoint.

## Inventory and recovery requirements

| Plan requirement                                                          | Inspected evidence                                                                                                                                                                                                                                          | Disposition                                                                                                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sitemap/crawl/CMS/repository/analytics union, query and locale identities | inventory.test.ts unions sitemap/crawl/CMS while preserving query and locale variants; discovery.test.ts unions sitemap/CMS/repository/analytics and parses captured HTML links; native mixed-locale trials preserve five identities and source memberships | Task 3 fixture-union item established across these fixtures, not a claim of universal CMS connectors                             |
| Conflicting canonical/locale declarations                                 | inventory.test.ts retains both canonical candidates and locale unknown; IDs/order remain stable when inputs reorder                                                                                                                                         | Established                                                                                                                      |
| Unknown source completeness                                               | discovery.test.ts persists missing/incomplete source and invalid-row queues; native mixed-locale reports retain missing analytics                                                                                                                           | Established                                                                                                                      |
| Unsupported media remains accounted                                       | collect.test.ts returns unsupported with no fabricated content for a PDF; missing file is failed and a directory unsupported; coverage.test.ts prevents these states from becoming audited                                                                  | Established for these fixtures                                                                                                   |
| 1,200 items, interruption, cursor and complete enumeration                | resume.test.ts checks 1,200 items, 31,200 checks and cursor 1,200; process-interruption.test.ts observes a committed cursor, SIGKILLs the real helper and resumes all unique items; native interrupted-process-016 repeats recovery on both hosts           | Task 3 recovery test item established at committed checkpoints; arbitrary multi-file crash consistency is not established        |
| Changed input and cross-item invalidation                                 | resume.test.ts changes source bytes, invalidates affected/dependent reviews and preserves historical runs; state tests bind config and snapshot identity                                                                                                    | Established                                                                                                                      |
| Exclusions keep reasons and denominators                                  | coverage.test.ts retains total/in-scope/excluded counts and rejects missing exclusion reason                                                                                                                                                                | Established                                                                                                                      |
| All transcript/PDF extraction availability contracts                      | Local text and unsupported/missing-media behavior exists, but the compound plan item includes broader transcript/extraction semantics                                                                                                                       | Keep Task 3 preservation/extraction item open pending explicit artifact-level reconciliation; do not imply PDF extraction exists |

The inspected tests are part of the prior verified 58-file/417-test run for the
unchanged 0.1.10 implementation. This documentation checkpoint does not pretend
that merely reading test names proves their assertions: the relevant bodies for
normalization, collection, coverage, state and resume were inspected, including
record counts, hashes, reasons and completion rejection.

## Customer output contracts

| Named output/requirement                          | Current evidence                                                                                                                                          | Remaining work                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| run/config, inventory, evidence, checks, findings | Persisted standalone/partition artifacts and schemas; collector fills contentHash after collection; required evidence includes hash/redaction/limitations | Keep run state distinct from config and unknown collection; complete field-by-field cross-format audit still required                                                                            |
| coverage.json                                     | Standalone buildReportDocuments emits it; campaign report embeds aggregate coverage in report-manifest.json only                                          | Add a named aggregate coverage.json to the unified report and hash it; do not silently treat a renamed/nested contract as delivered                                                              |
| ai-observations.jsonl                             | Shared measurement renderer persists exact input plus computed receipt in ai-observation-evidence.json                                                    | Add the named optional JSONL observation output while retaining exact raw input, provenance, synthetic labeling and dedup semantics; no output should imply observations when none were supplied |
| Customer HTML/Markdown                            | Standalone uses options.brandName; campaign uses config.brandName; both escape text and use neutral offline styling, not NKSkills visual identity         | Verify branding through both public workflow entrypoints; source support alone is weaker than an end-to-end contract check                                                                       |
| Priority, owner, effort, verification             | 0.1.10 regression and fresh installed CLI reports preserve fields in all formats; optional legacy global values show Not supplied                         | Implemented; actual assignment truth remains reviewer responsibility                                                                                                                             |
| CSV action types                                  | Standalone emits default update/investigate; campaign emits recommendation text but no action column                                                      | Reconcile explicit keep/update/consolidate/investigate contract with reviewer decisions across both paths; do not invent consolidation or implementation approval                                |
| Rule sources and review dates                     | Standalone report renders lastReviewedAt/authoritativeSources; unified campaign report does not have that equivalent appendix                             | Add a shared source/date appendix to the campaign report, preserving actual registry lineage                                                                                                     |
| Source age / missing measurements                 | Evidence collection dates and unavailable measurements are displayed                                                                                      | Distinguish dates from a computed age and inspect whether every required surface explains missing timestamps; avoid invented elapsed durations                                                   |
| Summary consistency and source corroboration      | Native 0.1.9 findings are correct but Claude overstates CMS coverage and contradicts its own AEO finding in the summary                                   | Reporting acceptance remains failed for that host trial; deterministic structural checks do not certify prose                                                                                    |

The [directory snapshot](content-search-audit-output-contract-snapshot.json)
records exact filenames and hashes for the current 0.1.10 campaign report and the
historical 0.1.7 AI report. The latter is historical evidence only; current
measurement-report.mjs was inspected and hash-bound separately. Lack of a JSONL
file in a report without supplied AI data is not itself a defect. The relevant
missing-output observation is the supplied-AI case plus the current producer.

## Work order based on these findings

1. Close named output parity: aggregate coverage JSON, optional AI observation
   JSONL, and rule-source/date appendix. Test exact equality with validated data
   and manifest hashes; reject invalid data before writing output.
2. Reconcile action type and customer-brand contracts across standalone/campaign
   entrypoints without fabricating customer decisions or approval.
3. Retain full-report semantic adjudication and repair demonstrated source-scope
   and summary contradictions; use holdouts rather than only repeating one seed.
4. Finish remaining source-to-rule-to-fixture mapping and broader specification
   coverage, then independent human acceptance. The current local rubric is not
   the full benchmark.

This sequence preserves the original requested outcome. It does not replace a full
content audit with inventory collection, a single happy-path example or a green
package validator. No new commercial publication, deployment or completion claim.

## Resolution checkpoint — 0.1.11

The named coverage JSON, optional AI observation JSONL and campaign rule-source/date
appendix gaps above are now implemented and verified. See
[output-parity-0111](content-search-audit-trials/output-parity-0111/README.md). The
0.1.10 directory snapshot remains historical evidence of the omissions. Do not
read its missing-file flags as the current version's state. Action-type/decision
parity, remaining branding checks and broad semantic acceptance remain separate.

## Action parity resolution — 0.1.12

The CSV action-type gap is now implemented across both paths, with explicit
reviewer proposals, reasons and labelled fallback triage. See
[actions-0112](content-search-audit-trials/actions-0112/README.md). Retention or
consolidation is never inferred from an unreviewed finding and does not alter
inventory, evidence or completion. Broader branding/extraction/semantic acceptance
items remain separate; do not read the historical 0.1.10 gap table as current absence.

## Customer-brand workflow verification — 0.1.12

The [installed CLI branding trial](content-search-audit-trials/branding-0112/README.md)
checks standalone and campaign reports on fresh Codex, Claude Code and combined
installs. Vietnamese customer names and hostile-looking punctuation remain safely
escaped; no NKSkills identity is imposed. Both formats retain every evidence date,
all 26 rule review dates, unavailable measurements and partial completion. Source
and installed bytes are unchanged; archived files replay exactly. This closes the
CLI branding verification gap. Dates are not computed elapsed source age, so the
compound output requirement remains open. No new package or semantic acceptance.

## Source-age implementation — candidate 0.1.13

The [source-age trial](content-search-audit-trials/source-age-0113/README.md) closes
the computed-age omission: one actual report time anchors captures, date-only rule
reviews, provider exports and AI observation/review/source dates. UTC calendar-day
age is distinguished from full elapsed 24-hour intervals. Missing/invalid/future
values remain unavailable; age alone never marks content stale or changes coverage.
Fresh three-target installed CLI reports retain exact provider/AI input bundles,
source bytes and component digests. 59 test files / 423 tests and required root
checks pass. Historical frozen archives and semantic failures are unchanged; this
is not a new native host evaluation or independent acceptance.

## Transcript and extraction availability resolution — 0.1.25

The historical Task 3 availability gap is now covered by
[transcript-accounting-0125](content-search-audit-trials/transcript-accounting-0125/README.md),
whose fresh installed standalone/campaign paths preserve source memberships,
exact supplied text and separate unavailable/unsupported states. The new
`content-audit-run.test.ts` regression checks the same invariants against current
source. Native-extraction-0125 separately proves actual PDFKit/OCR recovery and
unavailable browser/media states; extraction-recovery tests reject missing pages,
changed source hashes and invalid cross-item lineage. Native OCR output is not a
general extraction-fidelity certification. Inventory variant/canonical tests and
these artifacts satisfy availability accounting, not audiovisual comprehension.
The other historical gaps in this document retain their own resolution records.
