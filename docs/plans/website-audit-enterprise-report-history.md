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

## Required provenance boundary before Task 2

Independent source review found that candidate registrations bind research content, review and access generations, but do not bind a report edition/item or derived action/review reason. Existing storage authority covers control metadata only. Neither an artifact type nor a caller-supplied `research: false`/permission flag establishes ordinary provenance.

The owning assembler must construct a private record from verified inputs, never accept it as a caller declaration:

```text
PrivateReportProvenance:
  reportDigest, manifestDigest, editionId, scope
  items[]:
    collection, itemId, itemDigest
    origin:
      generated: module, compilerDigest, sourceBindings
      governed: controllerRef, registrationRef, candidateDigest
    dependencyRefs[], textArtifactRef
```

- Generated items require exact replay from original sources, including historical check context. Current arbitrary actions and curated prose have no such proof and cannot automatically enter retained ordinary history.
- Governed items require current controller resolution of the entire dependency closure before reading text. Expiry, retirement, missing registrations or changed support withhold the entire prior item; do not reuse its wording as an unbound hypothesis.
- Review reasons are separately governed prose; a target digest proves binding, not permission to retain or disclose the reason.
- Read private provenance metadata before loading a monolithic parent containing governed text. Retention policy must cover private IDs, dependency hashes, staging, caches, backups and old exports; there is no general immutable-hash exemption.
- Generate only approved generic non-sensitive statuses when content is withheld. Do not expose contributor counts, identifiers or sensitive commitment hashes in customer history. Distribution revocation/deletion requires separate operational evidence.

A prerequisite `acquireStoredResearchDraft(options, expectedRevision, metadata, loaders)` now performs current stored preflight before host content callbacks, rechecks revisions between reads and at completion, and uses existing original-byte/review validators. It writes no customer artifact and grants no acquisition/storage/delivery permission. This closes orchestration ordering only; it does not implement PrivateReportProvenance or governed history storage.

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

Generated-origin checkpoint: [replay provenance inspector](../research/enterprise-generated-provenance/README.md) shares the authoritative assembler registry, requires exact complete report replay and records private per-item owners/source/context bindings. It handles standalone generated reports only, snapshots inputs before awaits and rejects curated actions/reviews. Reproducibility does not prove research-free content or authorize retention/disclosure; the private governed registry and canonical history tasks remain open.

Stored binding checkpoint: [artifact-bound generated provenance](../research/enterprise-stored-provenance/README.md) verifies expected run/report/manifest identities and all three report formats, replays owners, then rechecks both bundles. Returned metadata distinguishes canonical object and JSON-byte digests. This externally authorized local path does not perform governed-content preflight or grant retention/disclosure authority; private storage and versioned history remain open.

Generated metadata registry checkpoint: [encrypted provenance registry](../research/enterprise-provenance-registry/README.md) persists inspector-produced metadata under external operation/location/retention authority, fixed cross-layer namespace, immutable registration identity and CAS. Per-record expiry, logical cleanup and uncertain-outcome reconciliation are implemented. It does not store report prose, enforce permanent revocation, erase backups or complete container/retention operations; governed origin registration and canonical history remain open.

Ordered metadata comparison checkpoint: [registered comparison](../research/enterprise-registered-comparison/README.md) introduces private provenance schema v2 with replay-derived assessment/parent metadata while preserving v1 reads. A consistent selected snapshot rejects missing/expired/legacy entries and invalid identities, chronology or run ancestry; comparisons keep content and complete review-target digests distinct. Standalone comparisons explicitly do not prove a parent revision chain or complete historical coverage. Canonical history, governed text and parent-aware assembly remain open.

Generated revision checkpoint: [exact generated parent chains](../research/enterprise-generated-revisions/README.md) replays every ancestor from its own source and binds fresh generated revisions to their exact immediate parent. Complete root-first chains, bounded artifact preflight, input snapshots and optimistic rechecks are implemented. This development path excludes curated actions/reviews and governed text; canonical editorial retention, changed-finding reassessment acceptance and delivery remain open.
