# Run configuration contract — 0.1.15

The new run format 0.2.0 records explicit scope, source permissions and effective
collection budgets. These projections are checked against hash-bound config.json
on load/validation and against the supplied configuration before writing revisions.
Resume derives them from the refreshed configuration. Legacy artifacts remain
readable without claiming the new contract. Hashes establish consistency, not
authorship, authorization provenance or resistance to rewriting the whole set.

The first new integration test failed because contractVersion was absent. After
implementation, offline tampering and explicit public budget/resume cases pass.
Full suite: 59 files / 427 tests. Lint, typecheck, build, format and diff checks pass.
An initial strict AJV schema error and lint globals error were fixed before the
passing full-suite result and release build.

Run `python3 docs/research/content-search-audit-trials/run-contract-0115/verify.py`
from the repository. The runner verifies the archive hash, extracts it, installs
into fresh Codex, Claude Code and combined projects, then uses each installed CLI
to start, validate, reject an altered budget and validate the restored run.
[Receipt](receipt.json) includes actual run records and runner hash. This is an
offline fixture, not a new native host semantic trial.

Component: aec7a8549780a2ede49add401e093c528f296ad80717342b58ac04dddcae0295

Release: ea45ca04aebabbcb47abaa2bcd39928659a261640e0be9c93e60669648cbe160

Archive: efe25161862131bee2c264b0f4885174da0ba3371fa9c15a9d1eec31d4362034

Redacted evidence derivatives, optional extraction gaps, native report fidelity
and independent semantic acceptance remain open. No commercial release is claimed.
