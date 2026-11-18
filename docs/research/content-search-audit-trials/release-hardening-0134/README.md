# Content Search Audit 0.1.34 development evidence

Status: **not release acceptance**. Original reports and host outputs are retained.
Expanded runs completed on both hosts; public scenario is a separate running
trial and must not be inferred complete from this document.

| Evidence | Codex | Claude Code |
| --- | --- | --- |
| Native exit / input hashes | 0 / unchanged | 0 / unchanged |
| Trusted replay | 3 valid partial run revisions | 3 valid partial run revisions |
| Quotes | 18 verified | 35 verified |
| Inventory | 12 declared, 0 audited, 10 pending, 2 blocked | Same |
| Historical study | Attached, scope retained | Attached and detailed section retained; summary still contradicts it |
| Conditional integrity advice | Condition retained | Condition retained on both action and verification |
| RTK convention | Nested-shell violations remain | Nested-shell violations remain |
| Human semantic verdict | Pending | Pending |

Reports: [Codex](expanded/codex.report.txt), [Claude](expanded/claude-code.report.txt).
Final responses, commands, replay receipts and preliminary review status are
beside them. Review status files describe positive and negative observations;
they do not claim exhaustive adjudication. Do not publish accuracy percentages
from them. Gold annotations remain in the existing semantic-expanded fixture;
they were not copied into native projects.

`expanded.raw.tgz` preserves both exact projects, prompts, installs, raw events,
generated scripts, evidence and reports. `expanded-archive.json` binds every
member and the archive hash. Relative narrative links resolve in the original
project layout, not beside the convenience report copies. Absolute paths in
receipts identify the actual executed workspace. The replay harness copy is
stored as text; restore under `build/release-hardening-0134/replay.mjs` for its
relative imports, using the frozen 0.1.34 release directory. Do not rewrite
original evidence to remap paths; replay from a separate working copy.

A limited private-key/token-pattern scan found no matches in the archived files;
this is not a guarantee that every possible sensitive value was detected.

See [network preflight](NETWORK-PREFLIGHT.md): controlled workspace-write tests
reproduce DNS failure with network off and HTTP 200 with network on. The public
runner now explicitly grants network access for the authorized origin scenario,
retaining the filesystem sandbox and packaged collector's scope/SSRF controls.
Public collection progress is not semantic or full-coverage acceptance.

## Next release work

The new structured study path improves the canonical helper report, but free
narrative summaries can still contradict it. Build delivery summaries from the
validated data rather than requiring the host to rederive availability and counts.
Keep meaningful narrative reasoning and evidence; do not remove the executive
summary requirement or substitute structural validation for human judgment.

The user selected Claude Expanded for review first. Review the five material
findings against targets 01–05, clean controls 06–10, the repeated summary error,
and instruction failures. A general deployment request is not per-finding
acceptance, and the fixed conditional phrasing does not clear the summary error.
