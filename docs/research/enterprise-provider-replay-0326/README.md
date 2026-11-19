# Provider replay candidate 0.3.26

This unpublished candidate closes the supplied-input retention gap in the provider workflow. It does not authenticate providers, fetch live account data, select a current authoritative snapshot or complete all-module report assembly.

## Retention and replay

Workflow imports retain a private sourceEnvelope version 1 with the exact supplied input object, canonical target, customer/entity/import-run/time ownership and a normalizer source fingerprint. The representation is explicitly supplied-import-object. Original responseText/hash strings remain unchanged when present, but object-only configuration imports are not described as native provider bytes. The lower-level standalone normalizers continue returning normalized results; the workflow owns persistent source retention.

`inspectEnterpriseProviderSnapshots(run)` repeats normalization from the retained input at its original import time and compares the whole evidence record. A pure replay entrypoint shares the existing normalization implementation with the validated-run import wrapper; its attributed owner context grants no acquisition or import authority. The inspector emits only descriptors and a capture-age currentlyFresh flag. That flag does not establish current selection, completeness, semantic correctness or authentic origin.

Every retained target, including a pending target without evidence, must have a unique target/request binding and exactly the derived module/check identity. Orphan provider checks/requests reject. Planning and importing inspect before mutation and before saving. Supplied-object envelopes have a 16 MiB bound and imported runs a 32 MiB readable limit. Existing declined request behavior and invalid-input isolation are retained.

Legacy normalized-only evidence or incompatible normalizer fingerprints rejects explicitly. Reacquisition needs a separate clean assessment; no in-place migration is implemented. Old digests do not recover discarded inputs. Shared evaluator fingerprints also change when dependency source changes; old runtime/development evidence may need explicit reassessment rather than silent reuse.

## Tests and independent review

The new input-retention test failed before implementation. Tests now cover retained GA4 report input, original GSC and business inputs, GA4 configuration/GTM objects, normalization replay, source mutation despite recomputed outer evidence/request hashes, removed targets/requests, stale-clock freshness and private report projection.

Independent review reproduced a P2 ownership gap in the first implementation: an October GA4 request could point to another window's check and still pass replay. A failing regression reproduced this before exact target/check/module validation was added. Both pending and imported requests are covered. The reviewer independently reran 18 provider/config tests and found no remaining material issue in that correction. Two subsequent configuration cases bring the author-run provider/config total to 20; the reviewer did not rerun those additions or the full repository suite.

A privacy assertion initially used the generic text supplied-export, which also occurs legitimately as a check scenario label. It was replaced with a unique private-provider-source-canary in the actual locator. The test now checks absence of that locator, sourceEnvelope and responseText in the canonical customer report, while source retention remains exact in the private run. This was a test sentinel correction, not a production redaction change.

## Package verification

The skill passed validation and the new versioned archive passed component/provenance/release construction checks. The extracted archive was installed into fresh Codex and Claude Code projects. Installed code exercised packaged GA4-config/GTM examples, exact input equality, replay inspection, request rebinding rejection, source immutability and canonical JSON/Markdown/HTML integrity/privacy checks. These are installed-script checks, not native agent behavioral trials.

See [package receipts](package-receipts.json) and [installed receipts](installed-workflow.json). Local source artifacts and the harness remain in `build/enterprise-provider-replay-0326/`. No deployment, publication, provider write or customer-site mutation occurred.

## Remaining scope

Provider projection, snapshot selection/conflicts and current-clock reassessment still need integration with the full assembler. Native GA4/GSC/Bing/GTM acquisition, broader business adapters, legacy migration, research disclosure-aware history, full remediation/recovery and commercial evaluation remain open. This candidate preserves unsupported/unknown scope rather than claiming those capabilities are complete.

Final repository verification passed all seven groups: format, lint, typecheck, build, root tests, site typecheck and site tests. Root suite: 158 files / 2,041 tests passed. Logs are retained in `build/enterprise-provider-replay-0326-verification/`. These checks do not establish native host or commercial acceptance.
