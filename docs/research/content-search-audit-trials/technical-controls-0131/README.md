# Technical controls — native candidate 0.1.31

Both supported hosts completed the same new two-dossier offline scenario using
fresh installations from the frozen archive. Three author-labeled material units
cover a Googlebot/owner-intent conflict, conflicting canonical preference and a
malformed JSON-LD block alongside a valid control. No live site was contacted.
This is development evidence, not independent acceptance.

## Results

| Measure                            | Codex       | Claude Code |
| ---------------------------------- | ----------- | ----------- |
| Duration seconds                   | 196.873     | 427.948     |
| Exit code                          | 0           | 0           |
| Recorded cost USD                  | unavailable | 3.8967896   |
| Declared / fully audited / pending | 2 / 0 / 2   | 2 / 0 / 2   |
| Findings / matched author gold     | 3 / 3       | 3 / 3       |
| Resolved / unknown checks          | 10 / 42     | 11 / 41     |
| Missing planned checks             | 0           | 0           |
| Independently replayed quotes      | 12          | 16          |
| Original files unchanged           | 89          | 89          |
| Valid run directories              | 2           | 2           |

The same target bytes were supplied to both hosts; only their host-specific skill
path differs in the prompt. Versions, full commands, prompts, original hashes and
installation receipts are archived. Every installed package file was compared
with the extracted archive, and each host had one discoverable SKILL.md.
Gold remained outside model-visible project inputs; this is not OS-enforced
isolation from the wider filesystem. Neither run pinned a model.

## Semantic review

Read both entry reports, final replies, findings and available verdict reasoning.
Both identify the three expected defects and preserve the historical archive and
valid markup as clean controls. Counts agree with validated artifacts. Their
different resolved-check counts are not a ranking of audit quality.

Claude's interaction explanation overstates what allowing crawl proves: actual
fetch and engine canonical selection remain unknown. Its verification also asks
for no matching robots rule, although a matching Allow rule can be valid. Its
phrase about the only canonical signal omits the competing sitemap and unknown
HTTP Link header. These are report/advice defects, recorded separately from the
three supported findings in [report-review.json](report-review.json).

Codex explicitly conditions later engine checks on authorized observations. Its
first review bundle failed artifact/value equality; it repaired representations
before the accepted revision. A later quote-count assertion expected eleven,
then corrected to the actual twelve before the final reply. Claude corrected two
quote cross-references before its successful verifier. Exact intermediate events
are retained; no original host report was rewritten by the primary reviewer.

Read the exact [Codex report](codex.report.txt) and
[Claude Code report](claude-code.report.txt). Quotation checks establish source
spans, not semantic correctness. Portfolio passes refer to supplied component
excerpts, not all live-site content. Manual review did not independently reread
every generated HTML/CSV serialization.

## Boundary and preservation

All 30 Codex command inputs and 44 Claude tool inputs were read, including both
Claude-generated executable bodies. No recorded external fetch, credential read,
target execution or package mutation was observed. No RTK-prefix violation was
observed in this cohort. Codex read its host RTK policy outside the project.
Recorded calls and before/after hashes are not a syscall/network attestation.

The [archive receipt](archive-validation.json) verifies 378 regular files against
their original bytes. Archive SHA-256:
`fa6b713b9c0da3fd8679501053d321886f9ae544bca8b64c787ec540c064b6a5`.
Raw prompts, events, outputs, installed files and author verification script are
inside `artifacts.tgz`; treat archived source and commands as review data.

This closes execution of the new technical cohort on exact 0.1.31 for both hosts.
It does not replace the broader offline cohorts, establish general semantic
accuracy, or close independent review. The user's hash-bound human-review packet
remains unchanged; these are supplementary results. No publication occurred.
