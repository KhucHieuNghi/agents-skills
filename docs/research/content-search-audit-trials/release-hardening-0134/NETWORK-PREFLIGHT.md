# Codex public-network preflight

2026-11-18. Codex CLI 0.166.0, Node v24.19.0, macOS.

The previous public runner used `codex exec --ignore-user-config --sandbox
workspace-write` without network configuration. Its eight fresh requests failed
with DNS errors while the parent process and Claude could collect the site.

A controlled probe now runs the same anonymous GET to the authorized
`https://nkskills.getgroove.me/en/` through `codex sandbox`, changing only
`sandbox_workspace_write.network_access`. Both retain workspace-write filesystem
isolation. Redirects are refused and the response body is cancelled, with a
15-second timeout; no personal browser session or credentials are used.

| Configuration | Observed result |
| --- | --- |
| network_access=false | fetch failed, cause ENOTFOUND, exit 2 |
| network_access=true | HTTP 200, expected URL, exit 0 |

Exact commands, output and durations are in `network-preflight/`. This reproduces
the same class of DNS failure under network-disabled configuration; it supports
attributing the old Codex public capture limitation to the evaluation harness,
not to the skill's DNS implementation or the website. It is not a proof of
semantic correctness, complete crawl coverage or absence of unrelated outages.

The public native harness should explicitly enable network access for its
authorized public collection scenario. Keep offline trials network-disabled.
Do not disable the filesystem sandbox, browser sandbox or OS protections, and do
not alter persistent user configuration. The packaged collector still enforces
allowed origins, redirect/private-destination restrictions and capture budgets.
A network-enabled sandbox alone is not a domain allowlist; scope enforcement
must also be checked in the actual tool trace and collector configuration.

Primary references, inspected 2026-11-18:
- [OpenAI approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security): workspace-write command networking defaults off; per-session network configuration is separate from filesystem access.
- [OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): sandbox_workspace_write.network_access.

Next evidence: run the public-site scenario on the frozen 0.1.34 install with
this explicit public-scenario configuration. Preserve the earlier failed trial;
do not replace or relabel its result as successful.
