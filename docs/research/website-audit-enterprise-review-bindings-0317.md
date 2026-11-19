# Enterprise replacement-check bindings — candidate 0.3.17

Date: 2026-11-19. Evaluation candidate only. No production deployment or customer website mutation.

## Packaged behavior

Generic N/A reviews may bind non-reviewed replacement checks through checkBindings and validUntil. The canonical context digest includes the complete raw check, entity, profiles, policies, freshness policy and dependency evidence. Context hashes cross the report redaction boundary without publishing raw evidence. Direct source validation derives hashes; report validation consumes recorded projected context hashes.

Replacement/context changes, forced invalidation of already-unknown replacements, and expired reviews demote dependent N/A to unknown and invalidate durable review requests. Explicit review expiry is enforced even without bindings; legacy reviews with neither field remain supported. Self-reference and references to reviewed/N/A checks are rejected. This contract deliberately does not support nested review chains.

The replay-validated measurement inspector is packaged. Proposal, attributed-review validation and host-receipt preparation remain development APIs in scripts/enterprise-measurement/disposition.mjs; they return applied=false. General applied-run disposition/index integration, revocation, grouped-request reslicing and a customer-facing CLI are still unfinished.

## Independent review

Separate reviewer measurement_workflow_review identified incomplete semantic check binding and standalone expiry handling. Both were corrected with regressions. Its final prerequisite run passed 23/23 revalidation tests, with no blocker in the bounded slice. This does not authenticate reviewer identity or establish commercial acceptance.

Full verification initially found 92 remediation test failures from a duplicated old context-digest formula. The change planner now imports the shared canonical helper; it retains source-run digest/customer validation, failed-check requirements and projected identity checks. Reviewer independently inspected this compatibility fix and found no weakened boundary. Older context hashes are not silently accepted.

## Verification and artifacts

The final full-verification logs and exit statuses are retained at build/enterprise-review-0317/full-verification. Root lint, typecheck, build and format passed; 128 repository test files / 1,525 tests passed in 69.55 seconds, with site typecheck and 19 site tests passing. Installed proofs on Node22.23.4 cover fresh Codex and Claude Code projects, component/project locks, replacement invalidation, review expiry, bound report save/load integrity, stale receipt rejection, all three measurement evaluators and cross-installation replay. These are synthetic development checks, not native-host behavioral evaluations.

One proof-script assertion initially compared JavaScript object prototypes across JSON serialization; it was corrected to canonical content-digest equality. No package code changed for this harness correction. The initial synthetic report is retained; successful evidence uses the bound-report-verified directories.

Actual prior 0.3.16 measurement evidence was rejected by the new evaluator fingerprint. Its source stayed unchanged and no output was created; migration-rejection.json records this. Automatic evaluator migration remains unimplemented.

- Component digest: 1583877bbeaf2f9ca9a7988da87a434df30bddf6b4576b15ba90ec175dd328ba
- Release digest: 7e5bd8ace6f799acb75e24024c32e71598eabaccda6c2a8c85ac551d1092d4da
- Archive digest: dacf63b490619511a8d365874af70ebd73b01870daec62fe13b5916f62121bbb
- Local archive, extracted package, fresh projects, proof script and receipts: build/enterprise-review-0317/

Existing official release and upstream pins are unchanged. Complete enterprise module coverage, provider acquisition, authorized production remediation and commercial multi-industry trials remain open.
