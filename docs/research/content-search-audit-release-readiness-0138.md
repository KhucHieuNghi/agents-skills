# Content Search Audit 0.1.38 — release gate audit

Checked 2026-11-18 against PR 3 head
`d7cbbc02e91ce474024f89a8ad1abdc8de2953c6`. This is a readiness assessment,
not release authorization. The objective remains an official release for both
Codex and Claude Code, including publication and verified deployment.

## Evidence and remaining requirements

| Requirement                                           | Current evidence                                                                                                                                                                                                                                                                             | Assessment / next necessary evidence                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen package, provenance and host installation      | 0.1.38 archive and digests in the [candidate record](content-search-audit-trials/release-hardening-0138/README.md); fresh extracted installs on both hosts                                                                                                                                   | Technical checks passed. Preserve these exact bytes; changed bytes require new evaluation.                                                              |
| Root build and regression checks                      | 474 tests in 64 files; format, lint, typecheck, build and diff checks pass                                                                                                                                                                                                                   | Passing implementation checks do not prove every semantic contract.                                                                                     |
| PR CI and website checks                              | [site run](https://github.com/KhucHieuNghi/agents-skills/actions/runs/44248243522), [PR verify](https://github.com/KhucHieuNghi/agents-skills/actions/runs/44248243461), [push verify](https://github.com/KhucHieuNghi/agents-skills/actions/runs/44248233528) passed for the inspected head | Green for this commit; recheck the final release commit after any change.                                                                               |
| Expanded native behavior on both hosts                | Both exit 0; three partial run revisions each; 15 Codex and 31 Claude source quotes verify; original inputs unchanged                                                                                                                                                                        | Artifact validity and bounded material assessment established. Full trace/report adjudication remains incomplete.                                       |
| Material precision, recall and critical gold findings | Primary-author assessment: 6/6 precision and recall per host, all six gold units matched                                                                                                                                                                                                     | Independent acceptance missing. These rates apply only to this small labeled cohort.                                                                    |
| Complete item accounting / honest completion          | Both retain 12 declared, zero audited, ten pending and two blocked items                                                                                                                                                                                                                     | This cohort accounts for the declared scope and reports partial coverage. It does not prove full audits of unavailable resources.                       |
| Embedded-instruction and other critical behavior      | No sentinel observed; bounded command/script review; criticalCheck still unjudged in bound evaluations                                                                                                                                                                                       | Finish scoped evidence review and independent judgment. An absent sentinel alone is insufficient.                                                       |
| Reporting and supplied measurements                   | Historical source attached; complete narratives retained                                                                                                                                                                                                                                     | Claude blanket citation-denial sentence is recorded as a primary reporting error (O-1), awaiting independent judgment.                                  |
| Instruction compliance                                | Exact Claude trace retains unwrapped commands despite the project RTK convention                                                                                                                                                                                                             | Failed in the observed execution. Do not waive it or substitute a guarded trial without declaring a changed execution contract.                         |
| No fabricated metrics                                 | Both distinguish historical aggregates and unknown current observations in substantial report sections                                                                                                                                                                                       | Evaluator gate remains open because full reporting review is incomplete; an empty fabricatedMetrics list is not an accepted zero-error result.          |
| Other required native scenarios on the final package  | Full 0.1.36 matrix is retained; 0.1.38 currently has Expanded only                                                                                                                                                                                                                           | Public, support/missing-data, technical controls, extraction and interrupted recovery are not verified for 0.1.38. Do not transfer old-version success. |
| Independent reviewer                                  | User selected themselves; [42-file review packet](content-search-audit-trials/release-hardening-0138/HUMAN-REVIEW.md) prepared                                                                                                                                                               | All ten case verdicts and acceptance remain null for each host. O-1 question is pending; acknowledgments are not verdicts.                              |
| Commercial promotion and publication                  | Solution manifest still explicitly labels evaluation candidate; PR remains draft/open                                                                                                                                                                                                        | Not performed. Requires complete release evidence and human review.                                                                                     |
| Merge and production deployment                       | Remote main remains `c3f20cc04038d697774209e74acbc16ee8b7e854`; work remains on the release branch                                                                                                                                                                                           | Not performed. Validate publication, install paths and actual deployed version after authorized release.                                                |

The review manifest's 42 hashes were rechecked unchanged. No human fields were
filled by the primary agent. The first local draft of the Claude review form used
short report IDs; an assertion against persisted findings rejected that mismatch.
The committed form uses the exact long IDs and the guide explains the shorthand.
Original reports and findings were not edited.

## Deployment evidence boundary

The workflow `.github/workflows/site-ci.yml` installs dependencies, tests, builds
both site modes and runs browser checks. It contains no deployment step. The
successful main site run 44129901802 therefore proves checks, not a publication.

A fresh read of the public Codex guide through Python urllib returned HTTP 403.
No TLS or access protection was disabled. That read cannot confirm the current
live page version. Prior deployment records identify the earlier candidate; they
must not be presented as a new live verification of this branch.

## Next action boundary

Do not issue another wording-only candidate or repeat the same trial merely to
obtain a passing sample. Complete the pending independent adjudication and use
its source-backed conclusions alongside the retained execution failures to choose
a justified correction. The separate [execution-boundary investigation](content-search-audit-trials/release-hardening-0138/EXECUTION-BOUNDARY.md)
identifies why a command-prefix allowlist alone would not establish enforcement.
No hook, permission change or alternate host mode has been installed or accepted.

Even acceptance of O-1 would not waive command failures, finish other cohorts,
provide all case verdicts or authorize calling the candidate an official release.
The full requirements remain those in the [spec](../specs/content-search-audit.md)
and [execution plan](../plans/content-search-audit-official-release.md).
