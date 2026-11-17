# Redacted standalone report presentation — 0.1.18

`redact-report SOURCE_RUN POLICY.json NEW_DIRECTORY` now creates HTML, Markdown,
CSV and coverage documents beside redacted evidence derivatives. Source validation
occurs first. Text masking happens at presentation boundaries before escaping;
original numerical coverage and check/finding evaluation remain unchanged.
Evidence links and displayed hashes point to derivatives. The manifest binds all
output document hashes and original snapshot hashes. A visible report section
identifies transformed text and unavailable measurement exports.

The new regression failed because redactReport did not yet exist, then passed
with the implementation. It checks an HTML-sensitive customer name, email and
local path, derivative link targets, output hashes, unchanged source run and
coverage numbers. Full suite: 60 files / 429 tests. Root lint, format, typecheck,
build and diff checks passed.

Run `python3 docs/research/content-search-audit-trials/redacted-report-0118/verify.py`.
The retained runner verifies the frozen archive, extracts and freshly installs it
for Codex, Claude Code and combined, then runs the installed CLI. Every report
document hash, evidence link and unchanged source file hash is checked.
[Receipt](receipt.json) records outcomes and runner hash. This is synthetic offline
CLI evidence, not native host semantic acceptance or arbitrary PII detection.

Component: b9a64b70291131ad5971730ecbaaa8e27dc9aae7b86289451ca249381f140b4d

Release: feac2e6b93ee27c7151aefdf9061a2a9c6d34e6807d7261ac131f25c84ba45be

Archive: b075d893436616c65fc4c0da0767891adccdd46042cd5e4b74225f1d8f1fe520

Limits: standalone/partition base reports only. Existing custom narratives,
campaign-wide reports and supplied measurement exports are not included. Literal
matching leaves undeclared/encoded private data unresolved; human review remains
required before sharing. Native semantic reporting errors remain open.
