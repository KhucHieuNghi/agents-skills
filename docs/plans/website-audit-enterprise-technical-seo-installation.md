# Technical SEO installed workflow

Status: implementation in progress; enterprise candidate remains 0.3.18. This
work does not close P3–P7 or establish commercial acceptance.

## Independent readiness review

Reviewer `measurement_workflow_review` inspected the development workflow and
collector before packaging. Five blocking requirements remain:

1. Preserve supplied-data request progress on reassessment. The reviewer
   reproduced a valid `provided` response becoming `requested` at the same
   timestamp. Retain compatible bindings/states through reconciliation and
   generate check-specific formats, owners and export instructions.
2. Connect denied, failed and unsupported collection to explicit unknown
   obligations and actionable requests. The collector legitimately returns no
   capture; do not invent one to satisfy the workflow's one-source contract.
   Preserve host-bound authorization and continuous revocation checks.
3. Package the real import closure and data attribution. Relocate repository-only
   shared imports and fingerprint paths. The six existing workflow kinds do not
   use the separate JSON-LD expansion worker; that worker requires `jsonld@9.0.0`
   and its dependency/license closure before installed use can be claimed.
4. Reject unsupported evaluator fingerprints or provide explicit reviewed
   migration. Current replay accepts a syntactically valid historical fingerprint
   while executing current code; this cannot establish historical reproducibility.
5. Expose the installed CLI with an actionable JSON → assessment → report recipe,
   parent-report reassessment and fresh extracted installs on both supported hosts.
   Document all six kinds and distinguish supplied captures from live acquisition,
   offline graph expansion, rich-result eligibility and complete schema semantics.

## Provenance prerequisite

`src/composition.ts` now supports schema-v2 `kind: data` records with a publication
URL, version and original-snapshot digest. Standard v1 Git skill records remain
supported. Mixed lineage and unknown kinds are rejected. The source digest is a
reviewed declaration; package validation does not fetch or authenticate the remote
snapshot. See the [publisher contract](../guides/composition-provenance.md).

This change does not yet package the Schema.org or IANA extracts. That step still
requires reviewed source records, retained original snapshot bytes, applicable
license/attribution files, adapted file mappings, updated package/component hashes,
and a versioned CLI with v2 support. Existing five skill upstream pins remain
unchanged. Source data must not be counted as an additional reused skill.

Independent review found no material blocker in the validator prerequisite and
passed 25 focused tests. The requested explicit Git-kind and mixed Git-field
regressions were added, bringing composition coverage to 29 tests. Final full
verification passed 128 files / 1,545 tests in 82.74 seconds, plus lint, typecheck,
build, format, site typecheck and 19 site tests. Initial fixture-only lint and
public-boundary failures were corrected before that clean rerun. Local logs are
retained at `build/composition-data-provenance/verification/`. This is source work,
not a new release or deployment; candidate package/component pins are unchanged.

## Request integration implementation constraints

The follow-up independent review identified a reusable pattern in measurement
workflow state preservation. Compare complete request descriptors after normalizing
only `status`, `reason`, `evidenceIds`, and `evidenceDigests`; retain those four
fields only when descriptors match. Read old requests from the forked run, where
request IDs and expiry have already been reconciled. Keep final check reconciliation.
Automatic evidence matching is a separate operation and must not be introduced as
a side effect of preserving state.

Add explicit evaluator rule-ID bindings before deriving targeted requests. Index
controls and structured data already emit requests per unknown check; canonical
and URL Inspection can have several dependent checks per request. Target controls
need the exact target-specific rule ID, not just a target reference. Hreflang graph
requests need bindings to the aggregate root/return-link/language checks they
affect. The synthetic provider-index-state row requires its own provider request.
Do not infer these relationships from prose reasons or array position.

Derive immutable descriptors in the workflow projection and replay-validate them;
ownership-only validation is insufficient. Group only matching artifact, scope,
window, owner and format requirements. Every unknown row needs a targeted request.
Regression coverage must include provided/expired/invalid/declined state, descriptor
changes, similarly worded requests from separate evaluations, target-specific
separation, and provider-export versus owner-policy formats.
