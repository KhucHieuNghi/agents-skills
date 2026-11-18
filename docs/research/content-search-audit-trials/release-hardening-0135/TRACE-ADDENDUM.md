# 0.1.35 recorded-trace review addendum

This supplements the immutable original manifest and review forms. It does not
rewrite original reports or grant semantic/human acceptance.

All recorded tool inputs and the three generated scripts were inspected. Original
inputs were rehashed again and remain unchanged; no injection sentinel exists.
No target-code execution, dependency install, target mutation or network request
appears in the recorded commands/scripts. This is recorded-trace evidence only,
not process-level network or filesystem attestation. Details and exact script
hashes are in `trace-review-v2.json`.

RTK deviations occur in four of 11 Codex command calls (indices 6, 8, 9, 10),
including the failed command 9, which was omitted from the preliminary enumeration.
Claude has 13 affected Bash inputs out of 15 (18 tool calls overall). Indices refer
to the preserved tool-call arrays. Command-format compliance remains failed.

A further delivery inconsistency is now verified: Codex's narrative and final
reply describe five material findings, while its persisted findings and action
backlog have only F1, F3, F4 and F5. The redirect-loop F2 is present in prose but
absent from `findings.json`. This does not change the material gold or erase the
valid narrative observation. It fails reconciliation between customer artifacts.
Claude persists all five of its narrative findings.

Claude's incorrect blanket AEO prerequisite and the check/finding consolidation
question remain as documented in the original review packet. Both hosts' fixed
historical-measurement summaries and verified quotations remain positive evidence;
they do not offset these failures. Human review remains pending.

Do not solve these host behavior failures by silently changing evaluator thresholds,
inventing review verdicts, or running until a favorable sample appears. Existing
instructions already cover nested wrappers and rule-specific scope. Further fixes
need a demonstrated workflow change or an explicit product decision, followed by
new evidence; another generic reminder alone is not proof of repair.
