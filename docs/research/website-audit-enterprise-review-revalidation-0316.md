# Enterprise review-request revalidation — candidate 0.3.16

Date: 2026-11-19. Development candidate only; not commercial acceptance or production deployment.

## Behavior and scope

Context-bound review requests opt into `revalidateOnCheckInvalidation`. Invalidated contexts reopen provided review requests, with expiry taking precedence. Declined requests stay declined. Scoped prior receipt content hashes remain denied regardless of incoming request status, preventing receipt-ID renaming from restoring stale approval. Ordinary requests preserve existing behavior.

Run revisions and parent-bound reports preserve the review obligation's exact target set, scope, flag and denied hash history. Direct child-report construction checks observable target/context changes and requires invalidating prior scoped receipt content. This is attributed review-state integrity, not reviewer identity authentication. The general measurement disposition proposal/review/apply workflow is still unimplemented.

## Independent review

Separate agent `measurement_workflow_review` independently reproduced three bypasses: target reassignment, pre-invalidating request status to evade denied-hash recording, and direct child-report construction restoring old receipts. Each was fixed and covered by regression tests. The reviewer independently ran 20 focused tests and returned no remaining blocker in this bounded slice. This verdict does not cover commercial acceptance, all enterprise modules or native host behavior.

## Verification

- Full repository: 128 test files, 1,521 tests passed; 72.54 seconds.
- Site: 5 test files, 19 tests passed.
- Lint, typecheck, build, format check and site typecheck passed.
- Initial full run exposed an AJV strictRequired schema compilation error. Fixed the conditional property declaration and added valid/invalid request-policy schema cases; the subsequent complete run above passed.
- Final archive extracted and installed into fresh Codex and Claude Code projects. Node 22.23.4 verified installed locks and component hashes, review revalidation, renamed stale-receipt rejection, durable obligations, three measurement evaluators, report file hashes and cross-installation replay.
- Installed example remains synthetic: 21 checks, 7 pass, 3 fail, 11 unknown. These are fixture outcomes, not customer website improvements or measured precision.

## Final local artifacts

`build/enterprise-review-0316-final/` contains the archive, extracted package, both fresh projects, installed-verification.json, verification script, report proofs and copied full-verification logs. The earlier `build/enterprise-review-0316/` is an unpublished pre-schema-fix draft; it is not the final artifact.

- Component SHA-256: `44f93fdc25d030e58f913a8a9a438002995d6ddd4002b57e8ff093baf1c5aba1`
- Release digest: `1863eebe6b35ef845c20801a6a5aa4f4cb528506a85980c20d03a80e46ec1cb0`
- Archive SHA-256: `350c22a8dddcf12951412c1c0414d2ec3922ef11c4c5b4879a131a2bff916275`

The versioned manifest selects this candidate. Existing official releases and upstream pins are unchanged. Remaining work includes integrating this infrastructure into general disposition, live acquisition and complete module coverage, authorized remediation/retest, and commercial multi-industry evaluation.
