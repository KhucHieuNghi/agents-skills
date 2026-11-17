# Candidate 0.1.2: five repetitions per host

Ten native CLI processes finished successfully against fresh installations of the
same extracted archive. Inputs and prompts are identical to the earlier skill
arms. Only the candidate package changed. See snapshot.json for archive/component
hashes, installation locks, tool calls, usage and output hashes. Raw final responses
are preserved as text, without formatter rewriting. No model was pinned. Host
versions remain Codex 0.166.0 and Claude Code 2.1.325.

These are ten repeated observations of **five known seeds**, not fifty independent
cases. They assess consistency after a targeted instruction change, not general
accuracy, causal uplift or full workflow readiness. The primary coding agent read
every final output and compared it with the target files and annotations; this is
not independent human acceptance review.

## Observations

| Check                                                     | Codex, 5 runs                 | Claude Code, 5 runs                                |
| --------------------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| All five gold material issues identified                  | 5/5 runs                      | 5/5 runs                                           |
| Clean control retained without a material finding         | 5/5                           | 5/5                                                |
| Wrong 21-month estimate repeated                          | 0/5                           | 0/5                                                |
| Other file's detailed study quoted as clean-control study | 0/5                           | 0/5                                                |
| Deterministic arithmetic observed in tool trace           | 4/5                           | 0/5 (calculator/code tools unavailable)            |
| Required contract/method loading complete                 | Observed in all five          | Incomplete in all five                             |
| Skill-tool registration confirmed                         | Not established by this trial | Not established; two explicit Unknown skill errors |

All runs kept live technical/analytics checks unavailable and accounted for the
five targets. No observed tool call wrote targets, read gold or fetched the
network. Codex had shell access in a read-only sandbox; Claude had only
Read/Glob/Grep/Skill. The trials retain the earlier isolation limitations: global
Codex skill discovery is not fully suppressed, and gold exclusion is an observed
read boundary rather than a proved OS sandbox.

## Remaining defects and qualifications

- Claude run 4 calls both "this month" and "currently" unsupported. Publication on
  2026-11-01 is consistent with the trial date 2026-11-16. Only the inference of
  current engine behavior from that publication date is unsupported. Run 3's
  summary also conflates these, although its detailed section correctly separates
  them. A material error in one clause must not turn a supported clause into an error.
- Claude runs 3 and 4 claim their revised paragraph uses or matches the control's
  wording. It is a paraphrase, not identical wording. Run 3 also gives some source
  line ranges that do not encompass the full quoted span. Correct conclusions
  still need exact source locators and accurate descriptions of textual similarity.
- Claude run 5 retains "organic" in its proposed denominator correction, while
  the supplied extract only establishes top-ten results. All Codex outputs identify
  this unsupported qualifier. The correction itself must satisfy the source scope.
- Claude runs 1, 4 and 5 suggest recovering/reconstructing old logs or prompt files
  without consistently separating authentic recovery from invented historical
  data; run 5 later says not to reconstruct missing history, creating conflicting
  advice. New observations cannot certify what happened in a missing old capture.
- Claude runs 1, 4 and 5 connect the two similar synthetic fixtures. Where used,
  cross-file support is now named rather than misquoted locally, but matching
  counts/dates alone do not prove shared study identity or independent corroboration.
- Claude runs 1, 2 and 4 still compute simple ratios without a tool despite the new
  instruction; run 3 omits derived quantities, and run 5 explicitly uses the control's
  stated value. Codex run 2 also produces ratios without a calculation call. No wrong
  arithmetic was identified here, but compliance with the specified process is incomplete.
- Claude descriptions of having re-read sources are not corroborated by additional
  Read calls after the initial source reads. Only runs 3 and 5 load the detailed
  evidence review procedure; none loads all required workflow/rule/scope contracts.
- Claude runs 3 and 4 attempted Skill invocation and received `Unknown skill:
content-search-audit`, then read the installed files. Others directly read the
  files. Restricted CLI configuration may affect discovery; the cause is unverified.
  Do not report this as successful native invocation or infer a broken package
  without testing the normal supported-host setup.

The known date and misquotation regressions did not recur, but acceptance remains
open. No broad precision/recall or zero-fabrication result is asserted. Next work
must resolve host invocation/testing configuration, broaden labeled cases, and
exercise actual artifact-producing workflows rather than indefinitely tuning only
these five editorial seeds.

## Verification and installation

Root lint, typecheck, build and 51 files / 375 tests passed. Formatting initially
reported provenance.lock.json; it was formatted, component digest refreshed, and
format/package checks rerun successfully before building the frozen archive. A
separate combined-host fresh install has one canonical Codex skill and a Claude
symlink to the same bytes. All eleven project installations used the extracted
0.1.2 archive. 0.1.0 remains intact; 0.1.1 remains an upgrade-only fixture.
