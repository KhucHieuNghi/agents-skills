# Enterprise report history implementation plan

> **For agentic workers:** Use superpowers:executing-plans for task-by-task implementation and independent source review. The user has authorized autonomous implementation and independent AI review.

**Goal:** Preserve report findings, actions and review provenance through reassessment while preventing stale acceptance and unauthorized redisclosure.

**Architecture:** First compute a private deterministic transition inventory from two validated reports. Then introduce a separately versioned canonical history contract and parent-aware assembler; preserve existing V1 artifact bytes. Research disclosure remains governed by the current private control store, not by a historical report digest.

**Tech Stack:** Existing Node ESM, canonical JSON/Markdown/HTML, Vitest and offline Playwright.

**Spec:** [Enterprise spec](../specs/website-audit-enterprise.md), [assembly plan](website-audit-enterprise-assembly.md), [research disclosure contract](website-audit-enterprise-research-disclosure.md).

## Global constraints

- Codex and Claude Code are the only supported hosts.
- JSON remains canonical; Markdown and HTML must represent the same supported semantics.
- A current finding requires a current failed check. Disappearance is not proof of remediation.
- Review acceptance binds exact content, dependencies and evidence; matching identifiers are insufficient.
- Research text, private linkage and hash commitments are not automatically authorized for immutable retention.
- Existing downloaded artifacts cannot be claimed recalled by generating a revised report.

## Verified gap

At commit 9198ce4, a same-run parent with one finding, action, narrative and independent review decision can produce a valid child with all four collections empty. Check and observation history contracts do not prevent this editorial loss. See the [reproduction](../research/enterprise-report-history-gap/reproduction.json). The development assembler currently accepts no parent and resets actions/decisions to empty.

## Review focus

1. Failed to pass/unknown or removed scope: archive prior finding, never imply remediation merely from absence.
2. Unchanged identifiers with changed evidence: action/review validity must follow transitive context digests.
3. Review time before new assessment or reviewer equal to new author: old acceptance cannot remain current.
4. Withdrawal after prior disclosure: no parent text, derived action, review reason or link may bypass current rights.
5. V1 historical reports and newer presentation manifests: retain exact original validation behavior.

## Task 1 — private transition inventory

**Files:** Create `scripts/enterprise-report-lineage.mjs`, `tests/content-audit-enterprise-lineage.test.ts`.

**Interface:** `inspectReportTransition(parent, next)` validates both canonical reports, exact parent digest, customer/run lineage, unchanged same-run source, increasing generation time and different revision identity. Returns a private in-memory inventory; it performs no persistence, rendering, recovery or release approval.

- [x] Add tests for silent removal of findings/actions/narrative/decisions, changed content with reused ID, unchanged versus historical observations, transitive review invalidation, assessment-time and author changes, and invalid parent binding.
- [x] Implement per-collection retained/changed/removed records using exact canonical content digests. Report additions separately. Never copy old prose into the inventory. Returned opaque IDs and digests are private metadata, not approved public tombstones.
- [x] For each old decision recompute the next target digest, enforce reviewer/time conditions, and distinguish carried, missing-valid, replaced and stale. Report stale reason codes without original reviewer reasons. Do not apply decisions automatically.
- [x] Run focused tests, independent review and repository checks. This deliverable detects loss; it does not satisfy history preservation by itself.

## Task 2 — versioned history contract

**Files:** `skills/content-search-audit/scripts/lib/enterprise-report-model.mjs`, report schema and version-dispatched views, new history module, compatibility tests.

- [ ] Introduce explicit canonical history version dispatch while retaining exact V1 validation/rendering. Do not mutate old artifacts or relabel their schema/tool identity.
- [ ] Define current versus historical editorial collections with source report binding, exact original target context and disposition. Historical findings do not count as current failures; historical actions do not count as executed work; stale reviews never count toward current acceptance.
- [ ] Require every prior editorial item/decision to have a verified continuation or explicit historical disposition. Preserve the complete chain rather than only the immediately previous revision.
- [ ] Implement withdrawal-safe disposition through the research controller. No universal append-only text or hash exemption. Customer history uses only owner-policy-permitted non-sensitive status; private dependencies stay in governed storage. Legacy report content without disclosure provenance must not be blindly copied.
- [ ] Test resolved/unknown/removed checks, conflicting IDs, action DAG invalidation, dependency changes, stale review times, multi-hop history, and denied/expired/withdrawn research across every text-bearing collection.

## Task 3 — parent-aware assembly and delivery boundary

**Files:** `scripts/enterprise-report-assembly.mjs`, `scripts/enterprise-journeys/research-stored-report.mjs`, canonical workflow tests and browser harness.

- [ ] Add a parent-aware entrypoint with explicit expected manifest/report digest and current disclosure context. Load and validate all parent artifacts before content reuse. Re-read source and control-store revisions before save; describe optimistic consistency, not a delivery lock.
- [ ] Regenerate current module claims from originals; reconcile curated prior findings/actions with transitive check contexts and policy. Do not accept caller-selected cached projections or clear prior editorial collections to make assembly pass.
- [ ] Retain exact observations or authorized historical demotions, with explicit withdrawal disposition where permitted by the new contract. Historical narrative is not current evidence.
- [ ] Exercise customer/public desktop/mobile reports with actual pilot volume, multi-module reassessment and withdrawn private canaries. Verify all three canonical projections and immutable parents.

## Task 4 — package and commercial continuation

- [ ] Validate/rebuild the versioned package and install extracted archives in fresh projects for both hosts; exercise parent-to-child workflows and negative bindings.
- [ ] Complete remaining full assembly and P3–P7 acceptance from the parent plan. This subplan does not reduce native trials, baselines, holdouts, account data, remediation/recovery or owner final risk review.

## Independent architecture review

Reviewer `enterprise_contract_review` traced the model, target digest and assembler without edits. It confirmed missing editorial retention, current-finding/action constraints, transitive review bindings, new-assessment review-time requirements and research withdrawal conflicts. The plan separates loss detection from preservation and prohibits using an immutable historical report as disclosure authority.
