# Content Search Audit 0.1.34 development evidence

Status: **not release acceptance**. Original reports and host outputs are retained.
Expanded runs completed on both hosts. Public Codex finished; public Claude
reached its fixed 900-second timeout without a final handoff. Neither is accepted
as an official release trial.

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

## Public scenario outcome

Both hosts collected 12 declared URLs, with zero fully audited and 12 pending.
Codex exited 0 in 303.81 seconds. Claude was killed by the runner at its fixed
900-second limit (exit -9), after generating a unified report but without a final
response. Both left original inputs unchanged. This is a failed end-to-end Claude
trial, even though its saved partial artifacts replay valid. The capability
preflight resolved the earlier Codex DNS issue; it did not prove audit completion.

`public.raw.tgz` preserves 963 original files (projects, exact installed package,
initial capture, raw events, reports and receipts). `public-archive.json` hashes
each member and the archive. Convenience reports and receipts are in `public/`.
The archive was rehashed member-by-member after creation. The limited token scan
is explicitly limited to the patterns named in the manifest.

Claude replay used trusted source checkout `5bec2de` with matching 0.1.34 package
bytes. Current 0.1.35 validator correctly rejected the older package, so no guard
was bypassed. `public-replay.mjs.txt` records the actual baseline import path;
reconstruct that trusted checkout and adapt paths in a separate working copy for
replay. Absolute original paths remain preserved in evidence.

Codex reports one candidate reproducibility concern: the source-build guide
clones the default branch but uses a 1.1.0 output directory name. The captured
instructions do not explicitly promise byte-identical reproduction from a tag.
Treat materiality as unresolved until the intended release contract is reviewed;
do not count a sensible hardening recommendation automatically as a true defect.
No public gold labels or accuracy percentages are claimed.

Independent source tracing also found a real host-installation copy mismatch:
`HostGuidePage.astro` described both-host symlink behavior on single-host pages,
while `src/solution-install.ts` installs Claude-only skills directly into
`.claude/skills/`. Fresh installs confirmed the behavior. Commit `6381247` fixes
the host-specific EN/VI copy; a rendered-route regression failed before the fix,
then all 18 site tests, Astro checks and product-claim checks passed. This finding
used author repository access unavailable to the public native audit; it is not
retroactively added to its labels or treated as evidence of its success.

Full public report/trace semantic adjudication and independent human verdicts
remain pending. Native 0.1.35 Expanded evaluation is separate ongoing work.
