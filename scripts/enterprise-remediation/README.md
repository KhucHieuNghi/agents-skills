# Enterprise remediation development tools

These tools are outside the released skill package. Only the private change-plan dossier CLI below is exposed here; it performs no website changes, deployment, publication or grant ingestion. Keep the original customer report with this attachment: findings are referenced by ID and report digest, not rewritten.

## Create and verify a private dossier

Run from the repository root:

```sh
node scripts/enterprise-remediation/cli.mjs --help
node scripts/enterprise-remediation/cli.mjs render --input proposal.json --host-context operator-bindings.json --out private-dossier
node scripts/enterprise-remediation/cli.mjs verify --input proposal.json --host-context operator-bindings.json --out private-dossier
```

The proposal JSON has exactly five fields:

- `planId`: opaque plan identifier.
- `assessmentAt`: the explicit planning timestamp; rendering never substitutes the current clock.
- `report`: the complete validated enterprise report object, not a path.
- `sourceRun`: the complete matching source-run object, not a path.
- `proposals`: change entries accepted by `planChanges`: changeId, findingId, bindingRef, ownerRole, artifactDigest, preconditionDigest, rollbackDigest, dependencies, and optional acceptancePolicyRef. Missing mapping/artifact/policy fields may be null where the planner permits it; they become explicit requests rather than execution permission.

The separate operator file has exactly `trustedAssetBindings` and `trustedAcceptancePolicies`, both arrays. The operator must confirm these records independently of imported reports. Naming a file “trusted” or supplying a hash does not authenticate it. The file is not an authorization grant and cannot approve execution. For a draft with mapping and acceptance policy still unknown, use:

```json
{
  "trustedAssetBindings": [],
  "trustedAcceptancePolicies": []
}
```

An asset binding has bindingRef, customerId, entityId, entityDigest, assetId and environment, bound to the full original entity. Acceptance policies require the reviewed exact check/context/asset and observation window contract in [the plan](../../docs/plans/website-audit-enterprise-remediation.md). Never invent either to remove a planning gap.

## Output and verification

The output directory must not exist. The tool creates it with private permissions and writes `plan.json`, `plan.md`, `plan.html`, then `manifest.json`. Files use exclusive creation and private permissions; an existing dossier is never overwritten. The output parent must be trusted and exclusively controlled by the operator. This Node path-based output is not a security boundary against concurrent privileged or same-user filesystem mutation.

JSON is authoritative. Markdown and HTML are deterministic views; the manifest binds their exact bytes. Verification requires the original proposal plus the independently supplied host bindings again, replays the planner and renderer, and compares the complete four-file dossier. It does not accept self-rehashed modified output, extra files or missing files. No timestamp or “verified” marker is written into the dossier during verification.

Keep this directory private; there is no public edition or permission to publish. Planning gaps include the responsible role, requested artifact, accepted formats and fallback. Zero gaps still does not authorize execution or establish successful retest/rollback.

On failure, exit status is 1, with a processing stage and general repair guidance; raw input content and exception paths are not echoed. Partial output is retained and is unverified. Inspect it before choosing a new output path. The CLI is not a durable execution ledger, crash-recovery system or transactional publication mechanism.

## Runtime limits and checks

Input and output files are bounded to 8 MiB each. Before planner/render allocation, proposal count multiplied by the combined proposal and host-file byte count must not exceed 2 MiB. This conservative development preflight bounds repeated-source amplification; whitespace counts too. If it fails, split changes into smaller plans while retaining the complete report/source inputs. The final per-file limit still applies, and this is not a hard process-memory limit. JSON rejects duplicate keys, nesting beyond 32 levels and more than 10,000 parsed nodes. UTF-8 must round-trip without replacement. Inputs must be regular files with no-follow/nonblocking open support; symlink leaves and nonregular files are rejected. This development CLI currently requires those POSIX-like runtime capabilities; unsupported platforms must not be advertised as validated.

Focused tests:

```sh
npm test -- tests/content-audit-change-plan-cli.test.ts tests/content-audit-change-plan-view.test.ts
node --import tsx tests/browser/remediation-plan-view.mjs
```

The browser check uses existing repository/site test dependencies and saves a separate ignored build dossier per run. None of these checks substitutes for native Codex/Claude behavioral evaluation or commercial release acceptance.

## Optional sandbox execution journal

The development sandbox worker requires attempt metadata and retains immutable intent/result records in its private root before/after the fixed fixture replacement. Pending or malformed records prevent further execution; completed plan/change pairs cannot replay across worker restarts. Node returns an attempt ID and journal key for correlation, including unknown outcomes. Those identifiers do not prove intent admission or authorize recovery.

No recovery inspector or existing-root adoption interface is shipped yet. The journal is trusted only within the exclusive host-owned filesystem boundary and is not a signed or automatically accepted retest receipt. Explicit whole-sandbox disposal deletes the retained journal; do not dispose an unknown outcome before the owner has inspected and retained the needed evidence. See the detailed remediation plan for persistence ordering, resource budgets and crash-test scope.

Read-only inspection is available as `inspectSandboxTarget({target, timeoutMs?})` from `sandbox-executor.mjs`, using the original registered capability. It reports historical journal states separately from current byte hashes, preserves caller uncertainty and never unquarantines, replays, repairs or issues a receipt. An absent/busy lock or malformed journal returns unknown without creating an inspection lock. Results are private point-in-time observations; retain the root and evidence for an owner-directed recovery decision. Imported paths/serialized target objects cannot be adopted through this API.

## Rollback preparation

`prepareRollback` in `prepare-rollback.mjs` prepares an inert descriptor for the sandbox full-text adapter. It requires the original plan/source, an exact host-verified applied receipt, a host-attested execution adapter, a separate current rollback-specific approval and an active apply-patch grant. The rollback bytes must be the exact prior image; the declared current hash must equal the applied after image. An apply approval or read-only inspection does not authorize rollback.

Preparation is not dispatch: physical target/bytes, cross-plan dependency inventory, replay prevention and restored-state verification remain executor requirements. The function always returns executionAllowed false and does not reset quarantine or resolve findings. A late original apply is diagnostic, while fresh rollback authority is checked independently. This development helper is not exposed as a production rollback command.

## Sandbox restoration API

`executeSandboxRollback({target, restoreText, preparation, refreshHostContext, timeoutMs?})` uses the original registered capability and the separately authorized rollback preparation. The host must supply one canonical current dependency inventory and maintain the exclusive coordination it attests. The inventory digest is part of the fresh rollback approval; imported data does not create either authority.

The native journal verifies original apply ancestry on that physical root and ordering across applied operations. New v2 sequences coexist with retained v1 history; ambiguous legacy ordering is rejected. Successful restoration consumes the original across new rollback IDs, while uncertain outcomes remain quarantined. The returned rollback receipt has status `restored`, not `applied`, and does not resolve findings or authorize retest promotion. This API remains private sandbox functionality, not production website mutation or deployment.
