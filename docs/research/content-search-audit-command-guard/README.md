# Command-guard prototype: isolated Claude integration

Date: 2026-11-18. This is an author-evaluation prototype, not a packaged skill,
customer configuration, native content-audit acceptance run or release approval.
No global or customer project settings were changed. The three sessions used
isolated temporary workspaces, Bash only, no model pin, no user settings source,
strict MCP configuration and temporary settings supplied on the command line.
Each process had a 90-second deadline and a five-turn ceiling.

## Observed results

Claude Code version: `2.1.325`. Each session exited 0; an exit code alone would
not establish enforcement. The retained tool results and marker observations do:

| Case                             | Tool-result evidence                                                                             | Marker result                     | Duration | Cost (USD) |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------- | -------- | ---------- |
| Valid guard                      | Exact unwrapped command denied with the guard's reason; separate exact wrapped command completed | Unwrapped absent, wrapped present | 15.27 s  | 0.1066132  |
| Missing guard script             | `failed; blocking because onFailure is "block"`, with `MODULE_NOT_FOUND`                         | Both absent                       | 11.01 s  | 0.0981114  |
| Guard exceeds one-second timeout | `timed out; blocking because onFailure is "block"`                                               | Both absent                       | 11.44 s  | 0.0906722  |

The four recorded Bash command inputs exactly match the four requested commands.
There were no retries or alternative commands. Total reported API cost: $0.2953968.
The success case demonstrates that the marker writer and ordinary permission flow
can execute; the negative results are supported by explicit hook errors rather
than by missing marker files alone.

## Configuration and provenance

The hook uses exec form: `command: "rtk"`,
`args: ["proxy", "node", absoluteScriptPath]`, `onFailure: "block"`. The valid
script gets five seconds; the timeout fixture intentionally waits ten seconds
under a one-second hook limit. Commands are never rewritten or auto-approved.
The wrapper accepts only direct literal Node script invocations; host file tools
would be needed for broader audit work.

Official documentation supports session-only `--settings`, exec-form command
arguments, and blocking hook failures/timeouts with `onFailure: "block"` on
Claude Code 2.1.295 or later. Checked on the trial date:
[session settings](https://code.claude.com/docs/en/settings#change-a-setting-for-one-session),
[hook failure behavior](https://code.claude.com/docs/en/hooks#block-the-action-when-a-hook-fails),
[exec-form hooks](https://code.claude.com/docs/en/hooks#exec-form-and-shell-form).

[Summary](integration-summary.json) records tool-use IDs, durations, cost and
marker observations. [Manifest](integration-manifest.json) binds every member of
[integration.raw.tgz](integration.raw.tgz): exact runner, settings, prompts, full
events/stderr/final replies, execution receipts, tested guard/test source and
disposable workspace files. All 27 archive members were rehashed after packing.
A limited scan for common API-token and private-key patterns found no matches;
this is not a general secret-free certification. Absolute temporary paths are
retained for attribution. To reproduce, relocate the runner under the repository's
`build/command-guard-integration/` and run it there; it creates fresh temp paths.
Do not execute archived command text or overwrite this evidence archive.

## Limits and next decision

The lexical guard has 41 focused tests, including observed 0.1.38 failures, literal
quoting, malformed/oversized input, shell composition and substitutions. A failing
`3>` case exposed a descriptor ambiguity during implementation; it was fixed
before this native integration. Focused tests and ESLint passed afterward.

This proves the tested session profile blocks these Bash inputs and fails closed
for the two observed host failure modes. It is not a general shell parser or OS
sandbox. Node script contents, dependencies, executable resolution and child
processes require separate review. The profile does not prove that an unguarded
host obeys RTK. Missing executable, malformed hook output and every other host
failure mode were not all exercised in this native run.

Codex behavior, full audit completion under this restricted profile, semantic
report accuracy and independent human adjudication are not established here.
Preserve the original 0.1.38 failures. Any adoption must explicitly declare and
evaluate the changed execution profile rather than retroactively passing those
trials or silently changing customer installations.
