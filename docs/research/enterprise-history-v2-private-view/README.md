# Private V2 history presentation prototype

`renderPrivateEnterpriseHistoryV2` renders a structurally validated V2 envelope
to in-memory JSON, Markdown and HTML plus a private checksum manifest. The
current report uses the existing V1 renderer. A separate historical section
shows declared source references, revision/time and coverage, explicitly labels
coverage unverified, and presents every historical item field. Historical
dispositions describe the immediate next revision, not remediation. The JSON
is the canonical input; presentation is deterministic and manifest hashes bind
all three projections.

This is **private prototype output**. It can contain evidence IDs, review
reasons, source metadata and sensitive text. Structural validation and checksum
integrity are not source authentication, a privacy decision, or authority to
retain, publish or deliver; all three authorization flags remain false. The
function does not persist or transmit output and does not create a public
edition. It does not implement disclosure preflight or withdrawal.

Independent review found and retested two defects: bare CR in Markdown could
break list structure, and Markdown/HTML omitted the declared source inventory
and coverage. It also identified a duplicate HTML anchor that collided with
the current report; the anchor is now `editorial-history`. Regression tests
check bare CR/heading line boundaries, unique IDs, source/coverage visibility,
deterministic projection, and manifest digests. An actual CommonMark parser was
not used in this checkpoint.

Independent review reran 17 focused tests after the fixes. Final repository
verification passed format, lint, typecheck, build, site checks and 2,225 tests
across 165 files.

Author-run Chromium checks on 150 synthetic historical entries at 390px and
1440px verified navigation, expansion, unique IDs, no horizontal page overflow,
no scripts and no external requests. The resulting document was approximately
29,897px tall at 390px and 23,156px at 1440px; these mechanical checks are not
a usability or WCAG acceptance. Independent review did not rerun Chromium.

Before customer use, implement current authority checks before content reads,
private provenance and permitted field projection, governed retention and
withdrawal, versioned renderer/manifest dispatch, public exclusion, accessible
usability testing and installed-host acceptance. This checkpoint changes no
bundled skill, released archive or production deployment.
