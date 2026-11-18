# Enterprise report — interim independent review

Date: 2026-11-18. P2 is in development, not release acceptance.

Independent read-only reviewer verdict: **changes requested**. Review covered the report model, renderer, immutable snapshot I/O and focused tests. This is not a whole-product signoff.

| Finding                                                                                       | Current disposition                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configured secret in bundle revision identifier bypassed redaction                            | Reproduced in failing test; fail-closed structural scan added. Reviewer confirmed rejection on subsequent snapshot.                                 |
| Unexpected tool metadata leaked into public JSON                                              | Strict tool validation and public projection validation added. Reviewer confirmed rejection on subsequent snapshot.                                 |
| Public summary accepted contradictory coverage/review claims                                  | Reproduced in failing test; arithmetic, status and review-bound checks added. Focused tests pass; final fix has not been independently re-reviewed. |
| Historical verdict and response history omitted from report projection                        | Open. Add sanitized history and matching Markdown/HTML section.                                                                                     |
| Parent hash is accepted without verified revision lineage or retained historical measurements | Open. Complete parent-bound revision API/CLI and rejection tests.                                                                                   |

Other fixes in this slice: contiguous Markdown table rows, opaque public revision identifier, rejection of unexpected aggregate fields. Ten focused report tests pass. This count is not a precision/recall or commercial quality measurement.

P2 still requires report schema, installed CLI workflow, complete/partial examples, mobile/keyboard verification, complete repository checks, refreshed package provenance, versioned archive and fresh installation on both supported hosts. The current uncommitted source is not a distributable release. P3–P7 remain open in the implementation plan.

## Follow-up implementation and verification

The next implementation slice adds sanitized historical verdict and request-response projections to JSON/Markdown/HTML. Historical statuses do not contribute to current counts. Added a report schema and CLI create/validate/revise workflow. The revision command verifies all parent artifacts, requires the unchanged source digest for a same-run revision, and requires declared lineage for a new run. Prior scope, histories and invalidated verdicts must remain represented. Retained observations bind the same projected evidence descriptor, including digest, ownership, source and time metadata.

Independent re-review found same-run verdict replacement, changed evidence behind unchanged observation IDs, and private values in allowed public metadata fields. Regression coverage and fixes were added; the re-review verdict remains changes requested until independently checked again. Standalone public metadata validation still needs exhaustive adversarial review; final UI and semantic acceptance remain open.

Verification after these changes: **76 files / 579 tests passed** with `npm test -- --maxWorkers=2`; typecheck, lint, format check and build passed. The first full-suite run found stale composition/component locks and a documentation timeout; locks were refreshed and the whole suite rerun with bounded workers, without removing tests or increasing timeout.

Candidate version **0.3.1** is unpublished evaluation. Built its archive, extracted it, installed into separate fresh Codex and Claude Code projects, then ran intake → customer report → validate → bound revision → validate, and public report → validate. Both retain zero assessment coverage for unknown-only intake; no semantic acceptance is claimed. [Installation receipts](website-audit-enterprise-report-installations.json) preserve component/release/archive bindings.

P2 is still open: complete/partial durable examples, browser/mobile/keyboard checks, exhaustive public metadata/privacy checks, fresh review of final fixes and additional report-history edge cases. The archive smoke test is packaging evidence, not authorization to deploy or evidence that P3–P7 are complete.

## Latest independent scoped recheck

Reviewer confirmed the same-run rewrite and retained-observation evidence replacement reproductions are now blocked; all 17 focused report tests passed in their check. Verdict remains **changes requested** with two residual Important findings:

1. A new source run can retain an unchanged nonunknown check while replacing its evidence descriptor under the same ID, if no retained observation references that ID. Compare the check dependency descriptors as well as the check object; changed evidence requires invalidation/reassessment history rather than inherited status.
2. Standalone public input still permits arbitrary strings in generatedAt/disclosure/module keys, and contradictory per-module status (assessed with unknown checks). Tighten temporal, fixed-disclosure, allowed-module and module-status validation on all public entrypoints.

These findings remain open in this snapshot. The 0.3.1 archive and its installation receipts describe this evaluation snapshot, not a corrected later build or a customer-ready release. Preserve these receipts and use a new candidate snapshot/version after fixes.
