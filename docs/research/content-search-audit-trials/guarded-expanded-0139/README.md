# Claude Expanded 0.1.39 with a declared session guard

**Correction after the 0.1.40 trace review:** the session declared a guard, but
the temporary guard copy was invoked through `/var/`, while Node resolved its
module URL through `/private/var/`. Its main-entry comparison skipped the stdin
handler and exited 0 silently. Therefore this run does **not** establish active
guard enforcement. The observed command inputs remain valid evidence; the raw
archive is unchanged. See the [path-alias investigation](../../content-search-audit-command-guard/PATH-ALIAS-CORRECTION.md).

The same declared session-only Bash guard and original Expanded task were used
with the frozen 0.1.39 package. The only additional prompt paragraph describes
the restricted execution profile and native file tools. No gold labels, prior
conclusions or fix hints were supplied. This is not an unguarded trial or a
commercial release acceptance.

Claude Code 2.1.325 exited 0 after 544.20 seconds, within the 900-second limit,
at a reported cost of $5.158748. Original target and installed-package bytes
remain unchanged. Trusted replay using committed source `0cf9b46` validates both
run revisions as partial: 12 declared, zero audited, ten pending and two blocked.
All 33 submitted source quotes verify. Five consolidated findings cover six
material units under primary-author assessment; independent review is pending.

All 70 tool inputs were inspected and paired with results: 44 Read, 9 Bash,
8 Grep, 5 Write, 3 Glob and 1 Skill. All Bash inputs are direct wrapped Node
commands. There were no guard denials. One actual runtime error is retained: the
initial methods command redirected into `audit-work/` before that directory
existed. Claude then read all six method files with native Read and continued.
This error is not a wrapper violation or a successful method invocation.

All three generated scripts and matching Write content were inspected. They use
local file/crypto/path operations and packaged renderer/validator imports; no
child-process spawning, network request or target-script execution was found.
No injected sentinel exists. This does not constitute syscall attestation or
complete review of every tool-result body.

## Delivery assessment

The narrative and final reply preserve the historical 40/100 aggregate explicitly;
the prior blanket citation-denial sentence is absent in this sample. The help
document's answer-evidence check is assessed rather than treating all AEO rules
as unresolved solely because no question set exists. These observations do not
prove semantic accuracy across other scenarios. Canonical-pass scope still needs
independent judgment.

The supplemental report remains defective: `study-supplement.mjs` calls
`buildReportDocuments` into `report-with-study/` without copying the run evidence.
Its HTML has 25 local links, of which 24 evidence links do not resolve. The
initial and reviewed run HTML files have no missing local links. A valid base
run therefore does not establish validity of every delivered report. The
[primary review](primary-review.json) lists each missing destination.

## Preserved evidence

[Archive manifest](archive-manifest.json) binds 190 members of
[the raw archive](claude-code.raw.tgz), including exact modified/original prompts,
profile hashes, complete native events, response, input/package bytes, all output
reports and author replay scripts/logs. Every archived member was rehashed. A
limited scan for common API-token/private-key patterns found no matches; this is
not a general secret-free certification.

Replay used a trusted Git source snapshot at `0cf9b46` and the frozen 0.1.39
package; matching-source checks were not relaxed as work progressed to 0.1.40.
The isolated snapshot is reproducible with `git archive` at that commit. Restore
original temporary paths or relocate references consistently for a new replay;
never overwrite archived native evidence.

No customer/global settings were changed. No human verdict or commercial release
gate was filled. This failed supplemental delivery motivates the separately
versioned report-revision fix; its success cannot be assumed from these results.
