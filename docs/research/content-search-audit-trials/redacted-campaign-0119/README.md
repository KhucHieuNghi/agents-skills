# Redacted campaign presentation — 0.1.19

Added `campaign-redact-report SOURCE REVIEW_DIRECTORY POLICY.json NEW_DIRECTORY`.
The source campaign and bound global receipt are evaluated before presentation.
Displayed text is masked before escaping, while original numerical coverage and
completion judgments remain. Local evidence links point to text derivatives in
the export. Global context receipt JSON is parsed and its string values masked.
Original partition reports are withheld to avoid their external source links; the
unified report retains local/global findings and coverage. Measurement exports
are explicitly omitted. Hash columns identify original evidence; the manifest
records both source and derivative hashes. No new audit or privacy certification
is claimed.

The integration test failed before the new function existed, then passed with
two partitions, local derivative links, original coverage and receipt preservation.
Full suite: 60 files / 430 tests. Root lint, format, typecheck, build and diff passed.

Run `python3 docs/research/content-search-audit-trials/redacted-campaign-0119/verify.py`.
The retained runner checks the archive hash, extracts it and installs into fresh
Codex, Claude Code and combined projects. Each installed CLI creates a campaign,
index and explicitly unknown global review, then exports a redacted campaign.
Report/derivative hashes and every original campaign/receipt file are checked.
[Receipt](receipt.json) retains results and runner hash. This installed fixture
has one partition; the source integration regression has two. Neither is a new
native model semantic trial or live privacy test.

Component: a5770f5ceab0aff5933324d30bb156e303442bad1bf4b9bbcb7ca2df6f0c78cc

Release: 9ed06ac4a136683cf6200f09b8edc7ffed6b849c4061b3626f5e0a346f44190e

Archive: 41c8ef4ce1bc0101c5a5d8a1391343443bca4b826ca7e763fff3d8fc1824ab00

Remaining: optional measurement sharing, undeclared/encoded private data review,
semantic reporting errors, extraction evidence gaps and independent acceptance.
