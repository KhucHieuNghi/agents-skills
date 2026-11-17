# Explicit evidence redaction — 0.1.17

Adds `redact-evidence SOURCE_RUN POLICY.json NEW_DIRECTORY`: validated source
evidence becomes separately hashed UTF-8 text derivatives, with raw snapshot
hash and hashed source evidence ID linkage. No raw snapshot, config, policy or
report is copied to the output. Original run files are unchanged. Exact literal
matching does not identify arbitrary PII or encoded variants. This is not a
complete sanitized-report export and must not be represented as one.

The initial test failed at import because the module did not exist; it was not
a failing behavior assertion. The implemented integration test covers content
replacement, derivative hashes, source preservation, metadata non-disclosure,
existing-output refusal, content-root refusal and invalid empty policy.
Full suite: 60 files / 428 tests passed. Lint, format, typecheck and build passed.
An initial lint error for missing URL import was fixed. Archive 0.1.16 had already
been built before that error was addressed; it is preserved and superseded, not
rewritten or promoted. Current candidate is 0.1.17.

Run `python3 docs/research/content-search-audit-trials/redaction-0117/verify.py`.
It verifies and extracts the frozen archive, installs into fresh Codex, Claude
Code and combined projects, runs installed CLI start/validate and redaction,
checks every derivative hash, and compares every original run file hash before
and after export. The [receipt](receipt.json) records actual results and runner
hash. This is a synthetic offline trial, not native model or live privacy review.

Component: 417042618d45e8e93f02b29aa38f158e5c60a7f98501217d0907554d5fb0f7cc

Release: 1c53c67cf3a6076d698fe2c017a03eb8d9a62106b43a83f4b816d93a5661f1b0

Archive: 51a257cf485382ee6d486e223c1f53abc75507246efa9d5103308afe0829add0

Remaining: integrate a shareable report/evidence mapping without exposing original
locators or presenting transformed evidence as unchanged quotations; resolve
native semantic report failures and extraction/acceptance gaps.
