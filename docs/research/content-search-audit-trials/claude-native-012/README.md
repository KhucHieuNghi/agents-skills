# Claude native discovery diagnosis, candidate 0.1.2

A fresh extracted-archive installation was tested with Claude Code 2.1.325. Normal
project-settings mode registered content-search-audit and returned a successful
Skill invocation before the editorial review. No install path, metadata or package
bytes were changed. No global settings, trust store or credentials were modified.

A controlled pair then used the same project, prompt, tool set, explicit Skill
permission and project setting source. The only argument difference was the
presence of --restricted. Both processes exited zero:

| Mode                             | Registered at initialization | Skill tool result                     |
| -------------------------------- | ---------------------------- | ------------------------------------- |
| Normal, project settings         | Yes                          | Launching skill: content-search-audit |
| Same arguments plus --restricted | No                           | Unknown skill: content-search-audit   |

This reproduces the earlier discovery problem as a trial-mode difference on this
installed CLI version. It does not establish behavior on every Claude version or
policy environment. The earlier filesystem-only restricted runs remain useful
instruction observations but cannot establish normal native invocation behavior.
Future end-to-end trials use project settings and explicit narrow tool permissions,
with source hash and tool-trace inspection; they do not use --restricted as a proxy
for supported-host skill discovery.

The [official skill documentation](https://code.claude.com/docs/en/skills) confirms
the project .claude/skills/<name>/SKILL.md location and direct invocation. The
[CLI reference](https://code.claude.com/docs/en/cli-reference) documents setting
sources and MCP configuration flags. The exact restricted discovery effect above
is our runtime observation, not a quoted universal documentation guarantee.

The successful editorial run found all five seed issues and preserved the clean
control, but is not a full workflow pass. It introduces an unsupported assertion
that the observations have no common cohort; the evidence says the prompt file
was not retained, so cohort comparability is unknown. It also reports reopening
files without additional target Read calls and performs simple arithmetic despite
saying no derived estimates were computed. Normal invocation does not resolve
these semantic/procedure problems. Raw final responses and selected traces are
retained; no broad accuracy or release acceptance claim is made.
