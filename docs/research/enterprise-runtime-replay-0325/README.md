# Runtime replay candidate 0.3.25

This unpublished candidate retains original tracking/consent source envelopes in private runtime evidence and validates stored ownership before replacing evaluations. It does not complete full enterprise assembly, native host behavior, provider acquisition or commercial acceptance.

## Source contract

Private evidence content schema version 2 retains original source envelopes alongside context, contract, evaluation result and evaluator fingerprint. Raw artifactText/hash and supplied locators remain in the private run. Canonical customer JSON/Markdown/HTML withhold these inputs. A run is private storage, not a customer-facing report.

A shared pure compiler drives ingestion and `inspectEnterpriseRuntime(run)`. Inspection repeats tracking/consent evaluation, verifies base and derived evidence, cached index/findings, current check ownership, scoped requests and policies before the workflow uses IDs to replace anything. All runtime parent/derived evidence must belong to a retained evaluation. A removed request now rejects rather than being recreated and potentially losing a refusal. The completed run is inspected again before it can be saved, with a 32 MiB readable-run bound.

Active index revisionRunId is separate from the origin run of content-addressed evidence. This permits A-to-B-to-A same-time revisions while reusing A's unchanged evidence. Current index time/lineage cannot point behind later retained evidence. This validates internal consistency, not cryptographic authentication of a caller or anti-rollback storage.

Unknown checks produced by dependency reconciliation remain conservative. Inspector findings describe evaluation at the original assessment time; they are not automatically current findings after a later module advances the clock. A final-clock runtime projector and complete assembler remain required.

## Compatibility

Legacy runtime evidence without original sources or with unsupported evaluator fingerprints is explicitly rejected. Original envelopes must be reacquired and assessed in a separate clean lineage; supplying them while retaining unsupported legacy evidence does not migrate the run. Old artifacts remain historical. No original bytes are reconstructed from normalized results, and no old digests are rewritten. In-place migration and full upgrade semantics remain open.

## Tests and independent review

The original-source assertion failed before implementation. The deleted-request regression also failed before the new inspector: the old workflow silently recreated the missing request. Added negative cases cover foreign check IDs, removed indices, forged cached findings, altered source bytes with recomputed outer digest, and source-less legacy evidence. Refusal preservation and source privacy have separate checks.

Independent source review reproduced a P2 defect in the first hardening implementation: A-to-B-to-A same-time evaluation saved a run its own inspector rejected. A new regression reproduced that failure; the separate active revision binding and pre-save inspection corrected it. The reviewer independently reran all 17 runtime tests successfully and reported no remaining material issue in that correction. It did not run the full repository suite.

One earlier test asserted private source locators were absent from the private run. It now expects source retention there; existing canonical report checks and installed tests separately verify that locators/artifactText are excluded from customer reports. This is an intentional storage-contract change, not removal of report privacy coverage.

## Package verification

The updated package passed skill validation and release composition/lock verification. The versioned archive was extracted, and fresh Codex and Claude Code projects were installed from the extracted package. Installed code exercised the packaged tracking+consent fixture, original envelope equality, replay inspection, forged-index rejection, immutable source digest and canonical JSON/Markdown/HTML validation with private-input canaries absent. These are installed-script checks, not native agent trials.

The initial installed harness used strict object equality between an in-memory report containing a null-prototype map and parsed JSON. It failed on the prototype difference. The corrected harness compares canonical report digests after the report validator and uses fresh attempt2 output directories; the initial artifacts remain retained. No production code was changed to accommodate that harness correction.

See [package receipts](package-receipts.json) and [installed receipts](installed-workflow.json). Local original artifacts and the harness are retained in `build/enterprise-runtime-replay-0325/`. No website was changed, package published or deployment performed.

The first full repository run passed 2,030 tests and failed two package assertions still pinned to candidate 0.3.24. Those expected-version assertions were updated to the newly built 0.3.25; no runtime condition or release integrity check was relaxed. Original logs remain in `build/enterprise-runtime-replay-0325-verification/`.

Final verification passed all seven groups: format, lint, typecheck, build, root tests, site typecheck and site tests. The root suite passed 157 files / 2,032 tests. Final logs are retained in `build/enterprise-runtime-replay-0325-final-verification/`. This does not close the integration, legacy migration or commercial gates described above.
