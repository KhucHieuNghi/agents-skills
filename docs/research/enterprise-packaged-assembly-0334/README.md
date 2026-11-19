# Candidate 0.3.34 — packaged report assembly

The replay-derived report assembler and its dependency closure now ship inside
the Content Search Audit skill. Developer entrypoints re-export the same
implementation. `enterprise-report-assemble` creates a standalone customer
report from registered source owners and rejects unsupported or empty runs.
The existing report and renderer commands remain available.

An independent AI reviewer checked the static 77-file dependency closure,
fingerprint paths, root wrappers, metadata boundary and isolated import; no
material relocation finding was identified. Existing provider replay owners
and the canonical report model were unchanged. Journey evaluator source paths
changed: legacy developer evidence requires reassessment, not digest relabeling.
An explicit regression using an old journey fingerprint remains outstanding.

Verification: formatting, lint, typecheck, build, site typecheck and site tests
passed; repository suite passed 165 files and 2,216 tests. A subprocess test
assembled GA4 numeric rows from another working directory, checked private
canaries and rejected reuse of an existing destination. The 0.3.34 archive was
extracted and installed in fresh projects separately for Codex and Claude Code;
each installed CLI replayed a synthetic GA4 configuration and produced a
validated report. These are script-level tests, not native host-agent trials.

Component digest: `0e1f1ea45f9af7c743908ffc1221250f26e3a8c759e909895ec57570c54bc315`.
Release digest: `7d50c5361dd3eff709c48303a8b9da4e20bcd8d04b5fadf012f0602347bb3741`.
Archive SHA-256: `012faceceb2471647dd20c4ff55d653b3601b7c67acf893d60636b50a4bfd4fe`.

This is an evaluation candidate, not commercial enterprise release acceptance.
Rights-aware research and withdrawal, preserved parent reports and decisions,
mixed-module and legacy-fingerprint installed tests, recovery and remediation
acceptance, native host trials, account-data pilots across industries, and final
owner risk review remain open. The public website pilot findings are historical
and have not been refreshed by this package change.
