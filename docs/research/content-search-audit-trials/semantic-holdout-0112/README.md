# Supplemental native semantic trial — candidate 0.1.12

Twelve new synthetic dossiers exercise the previously missing dedicated semantic
cases: task prerequisites, media equivalents, metadata, complete/partial graphs,
supplied rendering, task facts, question coverage, answer context, duplication,
journeys, cohort comparability and structured-data boundaries. The author-labeled
gold has 15 material units with separate clean controls. This is a development
holdout, not independent human acceptance or an unseen production distribution.

## Execution

The frozen 0.1.12 archive was extracted and installed into fresh Codex and Claude
Code projects. Only targets/ was copied; gold/ was absent from both projects.
Prompts are identical apart from each host's skill path. Both use their configured
model; no model is pinned. Versions, prompt bytes, exact final responses and report
bytes are retained. Execution took about 199 seconds for Codex and 95 for Claude.
Claude reported USD 0.2262549; no comparable Codex cost was available. These are
one-run observations, not a cost/performance benchmark.

Both processes exited 0. Twelve Codex command calls and seven Claude tool calls
have recorded terminal results. Source fixture hashes, all copied target bytes,
both installed component digests and the current source component match the frozen
inputs. No tool calls observed a live site or credentials; tool logs are not
process-level network attestation. Some Claude shell invocations omitted the
requested RTK prefix, an instruction-following deviation retained in the trace.

## Bounded findings review

Both reports account for all 12 dossiers and identify all 15 declared gold units.
Codex F01–F15 follow gold order; Claude swaps the two graph findings (F5 is broken
diagnostic, F6 is scoped glossary reachability). Multi-dimension tags do not create
additional gold units. Both retain the main decorative-image, scoped-answer,
locale/history, partial-graph and unavailable-render controls and leave live
measurements unknown. This records a primary-agent review of these outputs, not
general precision or accepted semantic accuracy.

Codex independently checked its findings quotations during the run. Rechecking
the retained report matched all 30 smart-quoted finding spans within their cited
source line ranges. This narrow mechanical check does not establish every report
claim or quotation elsewhere in the report.

Claude's F3 presents a shortened sentence as an exact quotation, without an
ellipsis: “There is no other descriptive transcript or equivalent instruction.”
The source continues “for this visual selection.” Its report nevertheless claims
every quotation was checked. The exact source/report binding is recorded in the
validation receipt. Its uncertain-case wording also says the observed A→B change
cannot be called “real,” despite correctly describing the supplied change earlier;
that ambiguity needs full reporting adjudication. Do not erase these errors
because all seeded material findings were found.

Complete-report adjudication and evaluator receipts are now retained as
`*.report-adjudication.json` and `*.report-evaluation.json`. Both have 15 supported
findings / 15 adjudicated findings and 15 matched gold / 15 gold units, with all
12 dossiers plus context accounted for. These are local primary-agent rubric
results, not estimates of general precision/recall. Codex meets this local rubric;
Claude fails its reporting and instruction gates because of the two report errors
above and four commands beginning with cd rather than the requested RTK prefix.
No fabricated metric was identified in this bounded full-report review. All gold
units here are noncritical; broader critical fixtures remain separate.

Both receipts keep releaseAccepted=false. Existing earlier trial failures remain
historical evidence; this set does not override their results or complete product
acceptance. Input hashes bind the adjudication text and exact complete report.
Re-running the author evaluator must reproduce the saved result exactly.

## Evidence

- `*.report.txt` and `*.response.txt`: exact final bytes, never reformatted.
- `*.prompt.txt`, `*.execution.json`, versions.json: invocation and execution facts.
- `*.tool-calls.json`: recorded tool input inventories; raw local stream hashes
  are in independent-validation.json. Streams remain at the recorded temp root.
- fixture-snapshot.json: frozen fixture and withheld gold hashes.
- artifacts.tgz: 28 files, the 13 model-visible inputs plus report for each host.
  Extraction was compared byte-for-byte; hashes are in independent-validation.json.
- execution-runner.py: the actual runner; it expects the prepared projects and
  prompts under its own root. It is execution evidence, not a turnkey installer.

The [fixture README](../../../../tests/fixtures/content-audit/semantic-holdout/README.md)
describes scope and gold handling. No package bytes or upstream pins changed.
