# Candidate 0.3.33 — SEO acquisition history and report integration

This development candidate adds explicit historical acquisition projection inventory and an original-source replay adapter to the general report assembler. It does not complete enterprise release acceptance or refresh the public website pilots.

## Reproduced defects and correction

Two regression tests accepted corrupted runs before the fix: deletion of a retained historical projection after removal of its check-history reference, and reassignment of a source to a later import revision with the same timestamp. Both now reject before output. Each target retains up to 100 historical projection IDs, separately from the active ID; inspection requires every artifact, exact ownership, append-only source populations and full projection replay. Source import origins must precede or equal the projection revision in lineage, and observation timestamps must not exceed its assessment time. The existing rollback test swaps active/history IDs consistently to preserve its supersession assertion.

Independent review identified another lifecycle inconsistency: an available capture could overwrite an invalid request despite the report claiming otherwise. The writer now preserves both declined and invalid states. Captures alone do not authorize recovery from an owner invalidation. Installed checks include reassessment with no new attempt after invalidation.

## Report contract

The public inspector returns verified acquisition ownership and safe projection descriptors. The development assembler registers exact inspected evidence IDs; it does not allow arbitrary evidence based on a namespace prefix. Current acquisition assessments must match the final run clock. Projections emit attempt-record counts and fixed limitations, never semantic SEO findings or authenticated collector claims. Historical projections may share records and must not be summed as independent collections. Original bodies, capture URLs, free-text gaps and source identifiers remain outside projected prose.

Availability selection chooses a usable capture by time, never the most favorable SEO verdict. An availability pass is separate from semantic canonical, hreflang, indexing or structured-data assessment. Unsupported evaluator fingerprints and legacy indexes reject explicitly; automatic migration is not implemented.

## Verification

Independent reviewer `enterprise_contract_review` reviewed the inventory, chronology, inspector, adapter, exact assembly registration and lifecycle correction without editing files. Its final focused run passed 17 workflow tests and reported no remaining material finding within this scope. The two initial regressions failed against the original code before implementation. An intermediate report test caught an invalid observation classification/period shape; the projection now conforms to the canonical report model.

The extracted versioned archive was installed into fresh Codex and Claude Code projects. Both installed-script checks passed replay, historical deletion rejection, same-clock origin inversion rejection and invalid-state retention. These are installed-script checks, not native agent trials. See [package receipts](package-receipts.json) and [installed workflow](installed-workflow.json).

Four offline browser cases cover customer/public editions at 390px and 1440px, canonical narrative parity, skip navigation, no horizontal overflow, no scripts and no external requests. These are bounded mechanical checks, not usability or WCAG acceptance.

## Remaining enterprise scope

Full mixed-module accounting, numerical provider semantics, measurement disposition integration, research withdrawal/rights-aware assembly, preserved parent findings/actions/reviews and packaged general assembly remain open. Acquisition/runtime recovery, remediation acceptance, native matched-baseline/holdout trials, multi-industry account-data pilots and owner final risk review are still required. No deployment or commercial release is claimed.

Repository verification passed: format, lint, typecheck, build, root tests, site typecheck and site tests. See [verification receipt](verification.json) and [browser checks](browser-checks.json).
