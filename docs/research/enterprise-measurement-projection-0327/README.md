# Candidate 0.3.27 — measurement ownership and report projection

The packaged measurement inspector now returns a verified current/historical base inventory after replaying all original inputs and generated rows. It rejects unowned measurement artifacts, a current base listed as its own history, and historical evaluations later than the current evaluation. The writer retains every prior base, including reassessments with unchanged check identities. The existing 100-history limit remains enforced.

## Review finding and correction

Independent review identified that the previous inspector validated indexed evaluations but did not reject extra base/row artifacts. A projector iterating all base-looking evidence would have exposed unverified history. The new projector consumes only the verified inventory. Adding the strict inventory check first exposed 11 existing reassessment failures: old writer logic retained history only when check identities disappeared. Updating writer ownership, rather than bypassing the check, restored those workflows.

Old evaluator fingerprints or incomplete ownership records are not silently upgraded; use a separate assessment or reviewed migration. All sources, checks, requests and past unknown obligations remain retained. A history entry does not itself resolve a superseded obligation.

## Development report assembly

The general assembler now supports measurement evaluation artifacts. It gates current conclusions on exact final assessment time and selects findings only from inspected active check IDs whose actual current status remains fail. Conservative unknown states never become findings. Fixed descriptions match the existing workflow finding contract; raw configuration, contract values and mapping bodies remain private.

One observation counts one evaluation object, not all supporting artifacts or independent samples. Historical records remain explicit. Configuration assessments do not prove runtime delivery, accepted business outcomes, provider/owner authenticity or commercial impact. The report projector remains development-only, outside the packaged candidate.

Disposition/revocation artifacts still trigger explicit unsupported-evidence rejection in general assembly. Their proof ownership and customer projection require separate integration. Measurement numeric reports, remaining module projectors, report-parent actions/decisions and research disclosure are also open.

## Verification

Seven new regression cases cover canonical assembly of all three evaluation kinds, final-clock rejection, source mutation, conservative unknown suppression, orphan base/row rejection and missing history. The history test initially expected only the changed configuration to acquire a historical object; all three evaluations are re-attributed to the new run, so it now expects all three retained objects.

Independent reviewer enterprise_contract_review found no remaining material issue in this scoped change and ran 48 tests across report projection, workflow and assessment. This is independent AI source review, not customer approval.

Full checks passed: 160 files / 2,055 tests; format, lint, typecheck, build, site typecheck and site tests all exited zero. Four offline browser cases passed for customer/public editions at 390/1440 pixels, preserving canonical narrative and checking overflow, skip navigation, script/network absence. These do not establish accessibility conformance or universal usability.

The versioned archive was built, extracted and installed into fresh Codex and Claude Code projects. Both installed workflows replayed three current plus three historical bases, rejected orphan/missing history, validated canonical JSON/Markdown/HTML, withheld a private payload canary, and preserved the earlier run digest. Installer/build checks validate package locks, notices and digests. See the adjacent receipts. Installed-script checks are not native agent behavioral trials.

No push, production deployment or commercial acceptance was performed. P3–P7 and the complete enterprise acceptance requirements remain open.
