# Capability-freshness regression — candidate 0.1.9

This repeats the mixed-locale-018 prompts byte for byte on fresh frozen 0.1.9
installations. Targets and withheld gold are unchanged. The package change adds
an explicit capability-freshness step to final report review, a short entrypoint
reminder, and a dated technical-SEO boundary around the retired Search Console
International Targeting report. No helper runtime or upstream pin changed.

The [official Google notice](https://support.google.com/webmasters/answer/12474899?hl=en)
was successfully opened during this change on 2026-11-16; the earlier full-page
timeout remains accurately recorded in the previous trial. Direct comparison of
both revised language annotations is a different check from observing indexing.

## Observed outcomes

| Check                                                          | Codex                                                | Claude Code                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| Both material gold issues found                                | Yes                                                  | Yes                                                                   |
| Regional-policy and historical-version clean controls retained | Yes                                                  | Yes                                                                   |
| Five identities / twelve source rows / missing analytics queue | Correct                                              | Correct in inventory accounting                                       |
| Same exact prompt as 0.1.8                                     | Verified                                             | Verified                                                              |
| Source and installed package unchanged                         | Hash verified                                        | Hash verified                                                         |
| Exact discovery receipt matches independent computation        | Yes                                                  | Yes                                                                   |
| Retired tool recommended again                                 | No                                                   | No                                                                    |
| Proposed annotation verification                               | Direct inspection of both heads                      | Direct inspection; optional diagnostics explicitly unverified offline |
| Other report fidelity                                          | No material error identified in this bounded reading | Two residual inconsistencies recorded below                           |

Both hosts avoided the targeted stale-tool recommendation in this repeat. One
repeat per host does not establish a causal improvement or prove that no other
stale capability can be suggested. The hosts were not forced to emit a canned
answer and received no gold findings or added prompt hints about the known error.

## Remaining report errors

Claude's report says the sitemap, CMS and repository map “agree on the five URLs”.
The CMS snapshot contains only two current-plan records; the inventory table itself
correctly shows no CMS membership for the other three. The broader statement
exceeds the supplied source coverage.

Claude also summarizes AEO as “Direct short answers present; no defect established
(see uncertain)”, while its own F1 explicitly attributes the wrong seat answer to
AEO. This is an internal summary inconsistency, even though the finding itself is
correct. Exact substrings and source references are retained in the validation
receipt. The report was not edited to remove either error.

These are separate from the targeted capability issue, and keep general report
fidelity/semantic acceptance open. No general precision/recall or independent human
acceptance is claimed. Raw event streams remain in the temporary trial root; this
record does not claim a comprehensive tool-trace audit.

## Artifacts

- Exact prompts, final responses and terminal execution records.
- Pre-session input hashes and independent validation with report/response hashes.
- `artifacts.tgz`: exact reports, discovery receipts and targets for both hosts.
- `archive-validation.json`: all 18 extracted files verified byte for byte.
- [Fresh installation receipt](../../content-search-audit-capability-installation-snapshot.json).
- [Upgrade and isolated restoration receipt](../../content-search-audit-019-upgrade-snapshot.json).

Current root verification: 58 test files / 416 tests, format, lint, typecheck, build
and diff checks pass. Frozen 0.1.8 and earlier archives remain unchanged. No
commercial publication or deployment follows from these bounded results.

## Complete-report adjudication checkpoint

The author evaluator now binds each entire saved report, extracted without byte
changes as `codex.report.txt` and `claude-code.report.txt`. It does not score only
the shorter final chat response. Both reports were read in full against the original
targets, known gold units, exact discovery receipts and clean controls. All predicted
material issues were inventoried: two supported findings each, zero additional
unsupported material findings. The seven required cases cover both current locales,
both regional refund controls, history, source union and missing analytics.

| Local adjudication result                | Codex        | Claude Code |
| ---------------------------------------- | ------------ | ----------- |
| Supported / adjudicated predicted issues | 2 / 2        | 2 / 2       |
| Matched / declared gold issues           | 2 / 2        | 2 / 2       |
| Recorded reporting errors                | 0 identified | 2           |
| Case accounting                          | 7 / 7        | 7 / 7       |
| Evaluator thresholdsMet                  | true         | false       |
| Evaluator releaseAccepted                | false        | false       |

Precision and recall are both 1.0 **only for these two issue units and the supplied
retrospective adjudication**. This tiny, primary-agent-authored set does not estimate
production accuracy, independent agreement or the entire specification's fixture
coverage. Codex's passing local gates must not be described as product acceptance.
Claude fails the reporting gate; correct material findings do not erase report errors.

`*.report-adjudication.json` contains exact hash-bound report quotes and source
references. `*.report-evaluation.json` is generated by the existing author CLI,
including its adjudication input hash. No package bytes or evaluator code changed.

A separate recorded-action review now accounts for all 11 Codex command invocations
and all 8 Claude Read/Bash/Write invocations, each with a terminal tool result. The
retained `*.tool-calls.json` records inputs stripped of unrelated session metadata;
`tool-review-receipt.json` binds those files and the raw local event streams. The
report-write payloads match the archived reports after decoding Codex's shell
argument. Reads and the installed discovery helper are local; writes target only
the report/receipt locations. No network, credential access, source edits or external
installer action appears in these recorded calls. Prior source/package hashes also
match. This completes recorded-action review for this bounded session, not a syscall
or network attestation. Earlier descriptions of trace review as incomplete describe
the earlier checkpoint; raw streams remain outside the repository.
