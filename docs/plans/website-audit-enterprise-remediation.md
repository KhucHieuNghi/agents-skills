# Enterprise remediation and retest implementation contract

Status: design contract for P6; no remediation capability shipped. This extends [the enterprise roadmap](website-audit-enterprise.md) and [spec](../specs/website-audit-enterprise.md). The authorized public pilots remain read-only. Developing the product does not authorize editing those customer sites.

## Verified integration constraints

- `enterprise-report-model.mjs` validates customer reports and digest-bound independent decisions using `validateEnterpriseReport` and `enterpriseReviewTargetDigest`. A finding must reference a failed check and evidence. Decision acceptance is distinct from authorization to mutate.
- The customer report deliberately reduces entity identity to `entityId/type/customerId/runId`; it cannot establish an asset URL, repository, deployment environment or account. Bind the complete source run by `enterpriseDigest(run) === report.sourceRunDigest`, then require explicit host-confirmed mapping of each entity to an asset/environment. A digest is consistency, not authentication.
- Report v1 actions support `proposed` only. Preserve existing artifacts and schemas; change-plan and execution/retest receipts are separate versioned artifacts. No mutation of a historical finding into a resolved finding.
- `authorizeAction` in the bundled authorization library already binds the full session grant to trusted host authorizations, customer/environment/asset/identity/action, validity and operation mode. Reuse it at execution time; never trust a grant loaded from the plan or imported evidence. Expiry blocks execution but does not erase historical evidence.
- No remediation/change-plan/retest implementation or tests were found in the current tree. P6 remains open independently of the technical SEO work.

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
