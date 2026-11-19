# Candidate 0.3.23 — quotation inventory workflow

This development candidate adds explicit accounting for reports with zero substantive source quotations. `record-quote-inventory` records a report-hash-bound, attributed declaration. It does not authenticate the reviewer, prove absence of quotations, verify the complete report, or produce a verification-pass result. The existing `verify-quotes` route still rejects empty ledgers. Uncertain inventories remain pending.

## Focused installed-host evidence

The preregistered [manifest](frozen/manifest.json) defines two exposed cases per host, one repetition each: the unchanged earlier 0.3.22 report without substantive quotations, and a synthetic report with one actual source quotation. These are workflow exercises, not full audits, holdouts or matched baseline trials. No filesystem isolation is claimed.

| Host / case   | Correct applicable route | Unchanged report binding | Artifacts, scope and acquisition criterion | Overall |
| ------------- | ------------------------ | ------------------------ | ------------------------------------------ | ------- |
| Codex zero    | Pass                     | Pass                     | Fail: outside read                         | Fail    |
| Codex quoted  | Pass                     | Pass                     | Fail: outside read                         | Fail    |
| Claude zero   | Pass                     | Pass                     | Fail: outside reads                        | Fail    |
| Claude quoted | Pass                     | Pass                     | Fail: outside read                         | Fail    |

Each case has two passed criteria, one failed criterion and one inapplicable criterion. Both independent reviewers reproduced the installed helper receipts and checked frozen hashes. The parent also replayed all four receipts and compared every installed package file to the extracted archive. See [review verdicts](independent-review.json) and [package receipts](package-receipts.json).

All four processes read host RTK.md outside the prompt's explicit input/installed-skill/output allowlist. This reflects a harness conflict with host instructions requiring that file, not evidence of malicious behavior; it still prevents a clean result under the registered criterion. Claude zero additionally ran parent repository git status, returning unrelated changed paths. Codex cases and Claude zero initially used a shell command without the requested RTK prefix. No observed network acquisition or input modification was reported. Future trials need to preregister required host-instruction reads and enforce a genuinely isolated project; these original failures must remain unchanged.

The zero receipts accurately state that absence and reviewer identity are unverified. The quoted receipts verify one submitted source/report/locator span without claiming source truth or complete report coverage. All four processes exited 0 without timeout; process exit is not evaluation success. Raw transcripts remain in `build/enterprise-quote-inventory-0323/`, with hashes retained in each frozen case. Published inputs, outputs and final responses preserve exact bytes under `frozen/`.

## Verification and remaining scope

Seven new focused tests cover strict inventory fields, valid UTC dates, report hashes, path/symlink confinement, UTF-8 and size limits, misleading zero declarations, and CLI behavior. Together with two legacy quote tests: 9/9 pass. Full root suite: 133 files, 1,615 tests pass. Format, lint, typecheck, build, site typecheck and site tests also pass. All four fresh installations came from the same versioned archive used for the native trials; package digests stayed unchanged afterward.

The earlier 0.3.22 native omission remains preserved. This candidate addresses quotation accounting only. It does not close enterprise P3–P7, prove commercial accuracy, complete provider ingestion or authorize production remediation. The four real website pilots remain separately documented in [the public pilot dossier](../enterprise-public-pilot-20261118/README.md).
