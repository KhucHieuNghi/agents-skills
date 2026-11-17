# Candidate 0.1.32 native evidence

Status: **development evaluation; not official release acceptance**.
See [release readiness](../../content-search-audit-release-readiness-0132.md).

## Reports and judgments

| Cohort | Codex | Claude Code | Review status |
| --- | --- | --- | --- |
| Technical controls | [report](technical-controls/codex.report.txt) | [report](technical-controls/claude-code.report.txt) | Primary-agent adjudications and evaluator receipts only |
| Support methods | [report](support/codex.report.txt) | [report](support/claude-code.report.txt) | Primary-agent adjudications and evaluator receipts only |
| Expanded semantic | [report](expanded/codex.report.txt) | [report](expanded/claude-code.report.txt) | Replay complete; independent semantic adjudication pending |
| HTML/PDF/OCR | [report](extraction/codex.report.txt) | [report](extraction/claude-code.report.txt) | Replay complete; independent semantic adjudication pending |
| Public pilot | [notes](public/codex.report.txt) | [summary](public/claude-code.report.txt) | Campaign/global review replay valid; semantic review pending |
| Real process interruption | [validation](resume/codex.independent-validation.json) | [validation](resume/claude-code.independent-validation.json) | Recovery accounting only, not semantic acceptance |

Every narrative copy retains original bytes. Relative links inside a narrative resolve in its original project layout in the raw archive, not in this convenience index. Replay receipts contain original absolute temporary paths; these are execution provenance, not portable links.

The user selected [Claude Expanded review](expanded/CLAUDE-REVIEW.md) first. This is a review priority, not acceptance.

`human-review.pending.json` is a blank worklist, not an accepted adjudication.
`observed-blockers.json` records positive observed failures; remaining trace review must not be marked complete merely because artifacts validate.

For each host/cohort, inspect the complete report, final response, tool trace and generated scripts against the unchanged target files and gold annotations. Use the schema accepted by `scripts/eval-content-audit.mjs`; existing primary-agent adjudications are examples, not human verdicts. `goldIds` can match one consolidated finding to multiple distinct gold units. Never duplicate gold credit or inflate finding precision. The evaluator deliberately does not issue commercial release acceptance.

## Trial provenance

- Fresh installs from the exact 0.1.32 archive; configured host models, no product model pin.
- Prior frozen prompts and target bytes reused; gold withheld from native projects. Local extraction config paths alone were remapped to fresh workspaces.
- Recorded original-file comparisons are empty for completed ordinary trials. Resume separately verifies original project, shared inputs and original stopped tree.
- Native prompts enforce the RTK convention, including nested commands. Some recorded hosts violate it; preserved as failures, not rewritten.
- `installations.json`: six fresh-install/upgrade combinations.
- `historical-review-integrity.json`: old frozen packets verified from the baseline commit.
- Raw archives include inputs, installed packages, traces, generated evidence, host responses and execution receipts. Swift compiler caches are omitted from extraction with explicit exclusions in the manifest; they are not audit evidence.
- Public pilot uses only the authorized anonymous origin. Do not infer live search rankings, AI visibility or product accuracy from it.

## Verification limits

Package validity, exact quote matching, immutable inputs and recovery accounting are separate gates. A correctly quoted source can still be summarized wrongly. Method hashes prove bytes available, not that a host read or applied those bytes. A partial audit is legitimate when evidence is missing, but contradicting supplied evidence is not.

The main suite passed 467 tests in 63 files with two workers. An earlier concurrently loaded run hit the existing 5-second release-builder test timeout (466 passed); no assertion failure occurred and no test timeout was increased to suppress it. Format, lint, typecheck and build passed. Final file-integrity and whitespace checks are recorded with the final packet.


## Packet integrity and replay

Run `rtk proxy python3 docs/research/content-search-audit-trials/release-hardening-0132/verify-evidence.py` from the repository. The verifier checks exact packet inventory, file hashes and every archived member without executing captured code. Integrity is not acceptance.

For artifact replay, restore the appropriate raw archive into an isolated local directory and remap original absolute workspace paths in a separate working copy. Preserve the frozen archive. `replay.mjs.txt` and `replay-public.mjs.txt` are exact harness copies; restore them under `build/release-hardening-0132/` with the `.txt` suffix removed to use their repository-relative imports. Rebuild the candidate using the locked manifest first. Quotes and campaign source bindings may require original-path remapping in the working copy; do not silently rewrite frozen hashes or call a remapped copy original bytes.

Public outcome: Claude collected 12/12 records (all pending); Codex fresh collection failed for 8/8 records with DNS errors. Both retained incomplete scope and validated campaigns/global reviews. Claude six-quote ledger replays; Codex supplied no quote ledger. Do not treat zero ledgers as quote verification success.
