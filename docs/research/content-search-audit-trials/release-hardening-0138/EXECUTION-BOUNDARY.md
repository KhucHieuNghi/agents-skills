# Execution-boundary follow-up

The repeated unwrapped-command failure is not resolved by the two documentation
revisions. Preserve the unguarded trials; a guarded trial would be a different
execution configuration and cannot retroactively make these results pass.

## Official host behavior checked 2026-11-18

Claude's permission rules account for compound commands, but its built-in
read-only command set includes `head`, `echo` and `cd`. Those can run without an
allow rule. Therefore merely replacing the broad Bash allowlist with
`Bash(rtk proxy *)` is not sufficient evidence of wrapper enforcement.
See [Claude permissions](https://code.claude.com/docs/en/permissions#read-only-commands).

A `PreToolUse` hook can inspect a tool input and deny execution. This is a possible
host-level mechanism to investigate, not a tested control in the current package.
See [Claude hooks](https://code.claude.com/docs/en/hooks#pretooluse-decision-control).

## Implications for this release

A command-policy guard would need explicit scope, supported shell grammar,
fail-closed handling of unsupported constructs, and meaningful tests for compound
commands, quoting, substitutions and nested execution. Prefix matching alone is
not such a guard. A Bash hook is not an OS sandbox or proof about arbitrary child
processes. Generated scripts and final compliance claims still need review.

Do not silently add an untested hook to customer installations, rewrite denied
commands into allowed commands, change the gold/thresholds, or claim a guarded
execution proves the skill follows the same rules without that guard. The current
product supports both hosts and does not require RTK in projects without that
convention. Any execution-contract change must preserve those boundaries and
retain comparable unguarded evidence.
