# Redacted measurement presentations — 0.1.20

Standalone and campaign redaction commands accept optional final OPTIONS.json.
Measurement importers validate original supplied data before any presentation
transformation. JSON attachments and each JSONL record use an explicit
redacted-measurement-presentation wrapper, original source hash and limitations.
Embedded receipt hashes retain their original meaning and must not be used to
validate masked strings. The output manifests hash transformed file bytes.
Numbers and booleans are unchanged; literal-selected strings can be masked.
The original import schema intentionally does not match these derivative wrappers.

Regression first failed because measurement attachments were absent. Implemented
tests cover GSC/GA4/Bing/log exports, AI observation JSONL, original input retention,
unchanged numeric counts and GA4 large integer strings. A test expectation of two
AI observations was corrected after inspecting the supplied fixture: it contains
one observation with two claims. This was a test error, not a production fix.
Full suite: 60 files / 431 tests. Root lint, format, typecheck, build and diff pass.

Run `python3 docs/research/content-search-audit-trials/redacted-measurements-0120/verify.py`.
The runner verifies/extracts the archive and installs fresh Codex, Claude Code and
combined projects. Each installed CLI executes both report-redaction commands
with all five measurement families. Document hashes, unchanged input/options,
wrapper types and redacted domains are checked. The author harness imports
repository fixtures through tsx; the installed helper requires no such dependency.
[Receipt](receipt.json) retains actual outputs and runner hash. These are synthetic
fixtures, not live measurement or native model semantic evaluation.

Component: f6cd1971cd1b690de31b9a28630451c52f763b46dfb4060842876c545e29d8fa

Release: 16328bbc8d892cac835d3d9d11ad04a4fb09bfa393bec3164bc4fbb4716ec767

Archive: a099037f4552e5e61a307890fc7b6b8d8f6de923494f9329d06077f648597e89

The explicit-literal sharing workflow now includes standalone, campaign and
measurement derivatives. It cannot certify arbitrary private-data absence. Native
report fidelity, extraction evidence gaps and independent acceptance remain open.
