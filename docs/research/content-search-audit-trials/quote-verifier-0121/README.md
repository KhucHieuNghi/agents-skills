# Quote verifier implementation — 0.1.21

Adds verify-quotes with source/report byte hashes, one-based source line ranges,
explicit locator co-occurrence in a bounded report block, exact or explicitly
whitespace-normalized matching, scoped bounded UTF-8 reads and symlink/traversal
rejection. The receipt applies only to submitted quotes; it cannot prove ledger
completeness or semantic support. Source/report roots must be stable and trusted.

The first test run failed on a missing module, not a behavior assertion. The
implemented regressions reject source-range errors, report-locator disagreement,
shortened quotations, changed hashes, duplicate identities, unsafe paths and
symlinks. The full suite passes 61 files / 433 tests plus root lint/format/typecheck/
build/diff checks.

[Historical regression receipt](regressions.json) replays errors from control
runs 1, 2 and 5. Original locators fail. Updating ledger ranges alone still fails
because the final report citation disagrees. Correcting copies of the reports and
rebinding their hashes passes. Historical originals are untouched. The archive
contains original/corrected report copies, source files and each bundle. To replay,
restore the appropriate report copy as report.md, update only bundle.root for the
extraction directory, and run the candidate CLI. The metadata-only bundle uses
the original report; the corrected bundle uses corrected-report.md.

Component: b433d4b8dd787bbe8b3b996a1677e690a54b5056fdd2ba926f0a7e97c43d0df9

Release: 9fa8e92f4e441b99610e7fa4e1cbcdc61a7640291791a934a7393c7286cba1ae

Archive: 161e375cfab6692755d6e9aae3b142750e5aaf3633f653467a7a70f659dc9885

Guidance now requires final local quote-ledger verification and distinguishes
observed cohort difference, generalization/repeatability and causality. Native
five-repetition candidate evaluation is running separately; no behavioral fix or
release acceptance is claimed from these helper results alone.

Native candidate trials are now complete; see [five-run results](../fidelity-candidate-0121/README.md). All submitted receipts replay, but semantic errors persist.
