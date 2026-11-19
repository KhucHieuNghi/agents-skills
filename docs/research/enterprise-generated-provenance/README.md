# Replay-derived generated report provenance

The development assembler and provenance inspector now share `compileStoredEnterpriseModules`, a single registry that invokes all supported original-source projectors. The inspector does not accept caller-declared origins or cached selected projections. It rebuilds the complete standalone customer report and requires exact canonical equality, then records the unique module owner, item digest, transitive review-target digest, full source-run digest and evidence bindings for every finding, observation and narrative.

Curated actions, review prose and parent-bound reports are explicitly unsupported by this initial generated-only inspector. A structurally valid report with edited, missing or additional narrative cannot pass by retaining generated IDs. Generated SEO findings bind their actual failed checks and dependent evidence. Inputs are cloned synchronously before validation/await so caller mutations cannot pair old item bindings with an unverified report digest.

## Fingerprint and authority boundaries

The conservative development fingerprint covers all `.mjs`/`.json` files under local scripts, bundled skill scripts and rules, plus the root package lock. Changes require reloading the inspector process and reject during inspection. This can invalidate unrelated development changes intentionally. It is an optimistic source inventory check, not code signing, trusted execution, or authentication of installed dependency bytes.

Generated means reproducible through the owning compiler. Supplied labels, URLs or other presentation data can still contain governed material. Therefore neither a generated origin nor an exact digest proves that content is research-free, safe to publish or authorized for immutable retention. Returned records are private in-memory metadata with persistenceAuthorized, disclosureAuthorized and historyPreserved all false. No customer artifact gains private linkage or source payloads.

This is the generated-origin proof stage of the [history plan](../../plans/website-audit-enterprise-report-history.md). An authoritative private provenance store with manifest/edition bindings, governed text references, current retention/disclosure policy, parent-aware history and withdrawal handling remains unimplemented. The existing candidate stays 0.3.33; no bundled skill or archive changed.

## Verification

Initial new tests failed because the inspector API did not exist. Focused regression exercised the shared registry with browser and SEO acquisition workflows. Additional tests cover generated SEO findings, refusal to label independent review prose as generated, and input mutation during asynchronous fingerprint reads. No raw capture body or private source canary appears in returned metadata.

Independent reviewer `enterprise_contract_review` identified the asynchronous caller-mutation gap; synchronous snapshots and a regression were added. Its review also clarified the limited meaning of generated origin and compiler fingerprints. Full verification receipts are recorded separately. No production website was modified and no deployment or commercial acceptance is claimed.

Final independent review passed all eight provenance tests after the input-snapshot correction, with no remaining material finding within this interface. Full repository run passed 164 files / 2,124 tests plus typecheck, build, format and site checks. Initial lint required an explicit Node URL import; after that correction, lint, format and 42 focused provenance/browser/SEO-acquisition tests passed. [Initial receipt](verification.json) and [correction receipt](correction-verification.json) retain the actual sequence without overwriting the initial lint failure. No report presentation or bundled package behavior changed.
