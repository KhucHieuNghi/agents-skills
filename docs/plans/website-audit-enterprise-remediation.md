# Enterprise remediation and retest implementation contract

Status: design contract for P6; no remediation capability shipped. This extends [the enterprise roadmap](website-audit-enterprise.md) and [spec](../specs/website-audit-enterprise.md). The authorized public pilots remain read-only. Developing the product does not authorize editing those customer sites.

## Verified integration constraints

- `enterprise-report-model.mjs` validates customer reports and digest-bound independent decisions using `validateEnterpriseReport` and `enterpriseReviewTargetDigest`. A finding must reference a failed check and evidence. Decision acceptance is distinct from authorization to mutate.
- The customer report deliberately reduces entity identity to `entityId/type/customerId/runId`; it cannot establish an asset URL, repository, deployment environment or account. Bind the complete source run by `enterpriseDigest(run) === report.sourceRunDigest`, then require explicit host-confirmed mapping of each entity to an asset/environment. A digest is consistency, not authentication.
- Report v1 actions support `proposed` only. Preserve existing artifacts and schemas; change-plan and execution/retest receipts are separate versioned artifacts. No mutation of a historical finding into a resolved finding.
- `authorizeAction` in the bundled authorization library already binds the full session grant to trusted host authorizations, customer/environment/asset/identity/action, validity and operation mode. Reuse it at execution time; never trust a grant loaded from the plan or imported evidence. Expiry blocks execution but does not erase historical evidence.
- At the design checkpoint no remediation implementation existed. The draft source binder below is now implemented; acceptance policy, execution preparation, sandbox, retest, views/CLI and packaging remain open. P6 is not complete.

## Artifacts and trust boundary

Development starts under `scripts/enterprise-remediation/` with repository tests; packaging into the skill requires an explicit candidate version and fresh Codex/Claude Code archive installs. Do not change a released component digest in place.

A change plan is JSON source of truth with deterministic Markdown/HTML views, using the existing report escaping/brand conventions where compatible. It contains `schemaFamily`, `schemaVersion`, `planId`, `createdAt`, `customerId`, `reportDigest`, `sourceRunDigest`, `entries`, and `limitations`. No clock is consulted during rendering. Every entry has:

- `changeId`, original `findingId/checkId`, finding review target digest, and source evidence IDs/digests;
- `entityId`, explicit `assetId/environment`, binding digest and the trusted mapping's reference (not an imported authorization);
- `ownerRole`, rationale and exact proposed artifact hash, plus precondition artifact/revision digest;
- dependencies by change ID, an allowlisted action class, acceptance checks with rule/version/scenario/window, and rollback artifact/precondition hashes;
- plan-time eligibility/gaps and data requests. Drafts may exist without permission; draft creation has no external effects.

Exact-artifact approval is a host-supplied record, never a Boolean or a record trusted because it appears in an import. Required fields are approval reference, approving actor/session, plan digest, change ID, action class, customer/asset/environment/identity, patch digest, base revision/digest, rollback digest, grant time, expiry or explicit session validity, and revocation state. Its exact contents must match the current trusted host record. A broad action grant and an exact-artifact approval serve separate checks; both must be valid.

The host provides trusted asset bindings and authorization separately at execution. An imported plan cannot name itself trusted. Bind the approval to the exact plan/patch digest: a changed patch, base revision, target environment, or dependency requires revalidation. Do not automatically expire an otherwise valid user grant because the chat changed.

No raw shell, arbitrary endpoint, executable script or instruction from report content is dispatched. Host adapters expose only registered operations. The first sandbox adapter is restricted to explicitly allowlisted inert fixture files under one host-selected root. Reject absolute paths, parent traversal, symlinks at every path segment, out-of-root destinations and executable/configuration hooks. Check the current file digest immediately before an atomic write; do not resolve a trusted path and then reopen an unchecked replacement. Other asset classes require separately reviewed host adapters; the initial sandbox does not claim production execution support. Patch bytes are data for a constrained patch adapter; commands found in page content or recommendations are never executable instructions.

## Interfaces and sequence

1. `planChanges({report, sourceRun, proposals, trustedAssetBindings, assessmentAt})` validates the report and run, resolves each finding/check/evidence and exact review digest, and returns a draft plus gaps. Missing review, mapping, current precondition, rollback or acceptance policy prevents readiness, not report generation. Reject duplicate change IDs, unresolved/cyclic dependencies and cross-customer bindings. A plan cannot be marked ready merely because fields are nonempty.
2. `prepareChange({plan, changeId, hostContext, currentPrecondition, dependencyReceipts, now})` revalidates plan digest, explicit host mapping, accepted finding/check review, exact patch approval, operation mode and `authorizeAction`. Returns an inert allowlisted dispatch descriptor or a denial. It does not itself execute an operation. Read-only audit cannot apply, publish, deploy or transact.
3. A host execution adapter consumes only the prepared descriptor after rechecking relevant preconditions immediately before action. The descriptor is not a bearer authorization: re-run `authorizeAction` and exact-artifact approval binding at the actual action time, including current expiry/revocation/identity/asset/environment and patch/base/rollback digests. A queued descriptor prepared before expiry does not authorize execution afterward. It records attempt/result, plan/change/patch digests, target environment, before/after revision, host identity and timestamps. A receipt is not trusted solely because it hashes itself. Interrupted/partial operations are explicit; retry requires inspection of current state and idempotency semantics, never blind replay.
4. `verifyChanges({plan, executionReceipt, retestEvidence, trustedExecutionReceipts, trustedRetestBindings, assessmentAt})` checks artifact binding, environment, observation time, freshness and the original acceptance predicates. Execution receipts and retest evidence have separate trust bindings. Each trusted retest binding identifies the host-observed source receipt and artifact digest, evaluator/rule version, policy and exact check scope, observation time, and evaluator result digest. Recompute applicable deterministic predicates from source artifacts; never accept a supplied `pass` field as a verified result. Imported observations without host verification remain explicitly supplied/unknown for resolution. Each check returns pass/fail/unknown with evidence. No execution proof or missing retest yields unknown. Test success on staging is a staging result; production remains unresolved. A new report revision may reference this result while retaining original findings/history.
5. Rollback is a separate authorized action with current preconditions, not a fallback shell string. Verify rollback with its own evidence. Failed/unknown rollback never becomes a restored state. Where rollback cannot be automatic, record the operator procedure and keep automatic execution ineligible.

## Retest semantics

Retest identity preserves rule/version/entity/scenario/policy bindings. The plan freezes an explicit baseline-window → retest-window mapping before execution, including timezone, duration, lag/waiting policy, cohort/filter definitions and minimum completeness. Point-in-time technical checks declare point observation semantics; period metrics require a new post-change window. A different or immature window is unknown rather than silently accepted. Rule or policy changes require an explicit reviewed change, not an implicit equivalence. Label such results reassessed under changed criteria; they do not automatically resolve a finding under the original criterion. New evidence must follow the execution being assessed, be fresh at assessment, and match the exact target/environment. Same bytes alone do not prove a new observation. A changed timestamp alone does not authenticate recapture.

For finding resolution require all mandatory acceptance checks to pass, no conflicting check evidence, and independent review where the original release contract requires it. Failure remains open; missing/incomplete/stale/contradictory data remains unknown. Excluded or newly N/A checks need an explicit reviewed applicability decision and must not be counted as passes. No before/after conversion or ranking difference is described as causal uplift without a separate experiment design.

Cross-environment migration is an explicit dependency: a staging retest may permit a separately authorized production deployment; only production evidence can resolve the production finding. A successful tool exit is not proof of deployed bytes, provider ingestion, or business outcome.

## Implementation tasks and proof

| Task | Deliverable                                                                       | Required evidence                                                                                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P6.1 | Strict change-plan schema, source/report/asset binding, dependency graph and gaps | Valid reviewed finding; report/run mismatch; rejected/stale review; missing mapping; cross-tenant asset; duplicate/cyclic dependency; deterministic serialization                                                                  |
| P6.2 | Execution preparation and exact-artifact approval                                 | Audit/plan modes deny mutation; read grant cannot submit; revoked/expired/wrong asset/environment/identity denied; changed patch/base revision denied; dependency failed or unknown denied; trusted grants never read from imports |
| P6.3 | Sandbox-only host adapter and immutable receipts                                  | Authorized bounded patch; stale precondition; interrupted/partial application; duplicate attempt/idempotency; no arbitrary command dispatch; escaped untrusted instructions; dry-run has zero effects                              |
| P6.4 | Retest/rollback evaluator and report revision linkage                             | Unchanged finding not resolved; stale/replayed/foreign receipt; staging vs production; failed and unknown retests; invalid time ordering; rollback failure/unknown; preserved original report bytes                                |
| P6.5 | CLI/skill instructions and deterministic views                                    | Missing-data requests with owner/artifact/fallback; exact JSON/MD/HTML revision and digest; mobile/keyboard/offline rendering; both supported host installations                                                                   |
| P6.6 | Independent evaluation and commercial evidence                                    | Clean/defective/missing/adversarial cases; native host repeats and denominators; authorized real pilot and owner residual-risk decision; do not promote synthetic sandbox success into production acceptance                       |

Mandatory tests include a report containing a malicious recommendation, a forged grant in imported evidence, an approved patch changed after planning, stale repository preconditions, provider outcome delayed after a successful frontend event, and rollback that reports success without restored-state evidence. Denied execution must still allow read-only audit/report continuation.

## Review and completion gate

Independent design review must confirm source/report/asset mapping and lifecycle contracts before implementation. Independent code review must inspect the actual execution boundary and receipt authentication, not only the pure planner. Required repository checks and focused adversarial tests run before packaging; new archives are installed into fresh projects for both supported hosts. No P6 checkbox closes from a schema or unit test alone.

The remaining P3–P5/P7 work stays in scope. This plan does not trade those requirements away or declare the enterprise product complete.

## Independent design review record — 2026-11-19

The independent reviewer traced actual report/authorization code and identified five design gaps before execution code existed: authorization must be checked again at action time; exact-artifact approval needs a concrete trusted record; retest evidence needs its own verified binding; baseline/retest windows need a frozen mapping; and the initial sandbox requires path/root/symlink constraints. The contract above incorporates each requirement. This resolves design omissions only. Implementation, adversarial tests and execution-boundary review remain mandatory and uncompleted.

Repository validation at this design checkpoint: 114 files / 1,308 tests passed, along with formatting, lint, typecheck, build, site typecheck and 19 site tests. These checks protect existing behavior; they are not P6 implementation or runtime acceptance evidence.

## P6.1 draft source binder

`scripts/enterprise-remediation/change-plan.mjs` now creates deterministic, private draft plans from a validated report and its full source run. It checks source digest, exact check structure, recomputed source check-context digest, and evidence binding metadata before carrying review digests forward. Host-confirmed asset mappings bind the full source entity digest and explicit target environment. Missing review/mapping/artifact/rollback or expired source evidence becomes a concrete owner-directed request. Duplicate/unresolved/cyclic dependencies are rejected. No imported grant is read and every entry remains draft with executionAllowed false.

Independent code review reproduced two defects: spreading complete source evidence leaked private content, and a valid report could claim review of evidence different from the source run. Regressions reproduced both and fixes project explicit metadata and compare source/check/context bindings. No raw source label, embedded content or extra payload field is copied. A plan digest provides consistency, not authentication or mutation permission.

This is a source-binding foundation, not completion of P6.1: acceptance policy/window mapping, full versioned artifact schema and import validator, action/patch approval and runtime lifecycle remain unimplemented. The planner deliberately requests acceptance policy instead of inventing predicates from recommendation prose. It does not offer an executable or release-ready plan.

Verification for the draft binder: 11 focused cases and the full 115 files / 1,319 tests passed; lint, typecheck, build, formatting, site typecheck and 19 site tests passed. This does not verify dispatch, production mutation, rollback or retest resolution. No released skill/archive/digest or customer report changed.

## P6.1 acceptance policy binding

The development draft format is now version 2 and can bind an optional host-confirmed acceptance policy by reference. Policy data binds the original check/context digest and the exact asset/environment binding digest. It fixes expected pass and complete evidence, explicit point-observation or baseline-to-new-period mapping, UTC boundaries, timezone, filter digest and ingestion lag. Point checks cannot silently become period checks, and a period policy cannot reuse its baseline window ID. Missing policy remains an actionable gap; all entries still remain drafts with executionAllowed false.

Policy author and reviewer are attributed separately; reviewer type/reason are retained. Review must follow the report snapshot and precede planning. The host supplies this policy registry separately from imported proposals; metadata/digests alone do not authenticate the reviewer or evidence. Runtime must still verify post-execution collection, complete matching filters/cohort, ingestion lag and actual predicate results. A pass field in supplied data is not a retest receipt.

Independent review found a missing lower bound on review time, absent policy-author attribution and an identifier grammar narrower than the existing report contract. A regression reproduced acceptance of a review predating the source snapshot; the binder now uses report generation as its earliest review time. Policy author/reviewer checks and report-compatible opaque IDs have explicit tests. This does not close multi-check acceptance criteria, approval, dispatch, retest, persistence/views, host integration or release packaging.

Validation: 23 focused planner/policy cases and the full 116 files / 1,331 tests passed, with formatting, lint, typecheck, build, site typecheck and 19 site tests. No release archive, component lock, customer report or live website was changed.

## P6.2 inert execution preparation

`prepare-change.mjs` reconstructs a draft from its source inputs using current host-supplied asset mappings and acceptance policies, then compares the complete plan including its digest. The imported input cannot promote its own mapping or policy into host trust. Missing requirements, unresolved dependency receipts, stale source evidence, a changed base digest or a started retest window deny preparation.

For the initial apply-patch operation, both an exact-artifact approval and an action grant must be current. Approval binds plan/change/customer/asset/environment/identity and patch/base/rollback digests, approver, session and validity/revocation. The existing `authorizeAction` evaluator rechecks operation mode and grant at the supplied current time. A read-only grant or audit/plan/verify mode cannot prepare mutation. Duplicate approval or grant references are denied.

A prepared descriptor remains executionAllowed false, requires verification of actual artifact bytes and an execution-time recheck, and contains no shell command or executable payload. This function has no filesystem/network side effects. It does not authenticate artifact bytes, authorize a later queued action, execute a patch, verify dependencies, or produce a retest/rollback result. Those adapters and gates remain open. The initial preparation supports apply-patch only; no publish/deploy/transact dispatch is advertised.

Independent code review found no blocking defect in inert preparation. It independently passed 33 focused tests at its snapshot and additional scope/action/expiry/revocation/frozen-input probes. Final verification after adding retest-window/source-expiry cases passed 117 files / 1,343 tests, lint, typecheck, build, formatting, site typecheck and 19 site tests. Preparation/planner focused suite passed 24 cases. Shared test fixtures were extracted without changing the existing planner assertions. No patch execution, deployment or release package change occurred.

## P6.4 receipt-scoped retest verification

`retest.mjs` reconstructs the plan against host-current mappings/policies and validates an execution receipt separately from a retest evaluator binding. The exact execution receipt must exist in trusted host state; a supplied receipt alone is insufficient. Retest trust binds the entire evidence record and evaluator ID/version, including source digest, scope, check, policy/profile versions and outcome. The host must have verified acquisition and evaluation before registering that binding; this module does not authenticate source systems from JSON or recompute every module predicate.

Verification compares customer/asset/environment, plan/change/patch/base/after-state digests, execution ordering, source freshness at execution, frozen check/policy/profile identity, filters/timezone/completeness and retest window. Point observations must be in their declared interval; period evidence must be captured after the complete period and ingestion lag. Expired/future/early/partial/mismatched evidence is unknown. Failed or rolled-back execution cannot become optimization success. Host verification context must itself match the customer/target; a regression reproduced and closed that missing comparison.

The result is explicitly receipt-scoped: pass means pending-independent-review, fail stays open, unknown remains unverified. It does not mutate historical reports, resolve an entire finding, attest execution authorization or claim business uplift. A late observation cannot turn previously early-collected period evidence into mature evidence.

Independent code review passed 49 focused cases at its snapshot and found no blocking false-pass within this narrow receipt scope. It identified two remaining integration gates: technical SEO scenario IDs include window scope and therefore require explicit reviewed scenario/window mapping for real retests; final resolution must inspect the full relevant evidence set for contradictions rather than one selected receipt. These gates remain open, along with executor, source-evaluator adapters, rollback verification, report revision linkage, views/CLI, packaging and commercial evaluation.

Final verification: 15 retest cases and full 118 files / 1,358 tests passed, with formatting, lint, typecheck, build, site typecheck and 19 site tests. Shared preparation fixture extraction preserved prior tests. No release archive, source website, deployment or customer report was changed.

## Explicit reviewed scenario mapping

Acceptance policies may now include a digest-bound `scenarioMapping` with original scenario, intended retest scenario and review rationale. The binder compares the original identifier with the source check. Without this mapping, retest still requires the original scenario identifier. No implicit rewrite is performed when a new observation window changes a technical adapter's scenario ID.

A mapped identifier only authorizes interpreting the receipt in that declared scope; it does not prove that device, consent, state or other semantics are equivalent. When the scenario identifier changes, the retest output records both IDs, scenarioEquivalence not-verified and findingResolution original-scenario-unverified, even if the receipt's predicate passes. Original-scenario resolution therefore still requires source-adapter equivalence evidence and independent review. Complete contradiction checking remains open.

Independent review passed 52 focused cases at its snapshot and found no unsafe promotion. It identified rejection of existing scenario labels containing spaces/Unicode; a failing regression reproduced this and the binder now reuses the enterprise nonempty-string scenario contract without normalization. Mapped policy fields are optional; older policies without mappings retain their same-scenario behavior.

Final verification for scenario mapping: 118 files / 1,361 tests passed, with formatting, lint, typecheck, build, site typecheck and 19 site tests. No actual website mutation, report rewrite, packaging change or deployment occurred.
