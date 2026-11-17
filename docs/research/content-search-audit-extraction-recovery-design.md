# Attributed extraction recovery — implementation contract

Status: implemented in candidate 0.1.23; [installed helper acceptance passed](content-search-audit-trials/extraction-recovery-0123/README.md). Native host extraction and independent semantic acceptance remain open. The
[actual extraction trial](content-search-audit-trials/extraction-0122/README.md)
proves that optional host tools can supply real DOM/PDF evidence, but a formerly
unsupported PDF cannot re-enter the audit lifecycle through the current review
command. Keep one customer skill entrypoint; do not require a second skill call.

## Intended flow

1. The skill inventories the original PDF and records the ordinary collector's
   unsupported outcome. It never replaces that inventory item with an unrelated
   text file or silently removes image-only pages.
2. If an authorized extraction capability already exists, the host captures it
   with explicit source identity, tool/version, capture time, page coverage,
   extraction limitations and source/derived hashes. Otherwise retain unsupported
   and give a precise recovery path. No implicit tool installation or OCR claim.
3. The host submits original-item evidence and an attributed recovery request to
   a new immutable revision. A source-content hash check and authorization check
   must precede the state transition. Review artifacts alone are not proof of the
   external source's identity or extraction completeness.
4. A successful recovery moves only the collection state to pending. Semantic
   checks and missing evidence still determine audit completion. Recovering text
   must not turn every applicable check into pass or not-applicable.

## Required request and validation

The review bundle field is `collectionRecoveries`; see the [customer contract](../../skills/content-search-audit/references/extraction-recovery.md). Each request needs itemId,
reviewer, reviewedAt, reason, source hash, extraction evidence IDs and an explicit
coverage statement with limitations. Preserve the accepted receipt, prior state
and evidence lineage in the new run; reject duplicate requests.

For the first local-PDF implementation, require an original local path already in
the declared inventory and authorized roots. Re-read the bounded stable source
without following an out-of-root resolution; compare its actual bytes with the
claimed source hash. Do not accept an arbitrary replacement path from a bundle.
Keep source-size and run-storage budgets effective. Resolve concurrent changes
as retryable failure. Do not pretend a manifest hash verifies a binary file.

Require same-item artifact-backed content and nonempty extracted text, an
extractor manifest, and page-accounting evidence. Explicit partial extraction
keeps collection incomplete. An image-only page or password/OCR limitation cannot
be hidden by concatenating only readable pages. Structural validation cannot
prove text fidelity, page completeness or extractor identity; retain attributed
review and capability limits.

Only an unsupported extraction outcome may use this operation initially. It must
not clear blocked authorization/network policy, failed HTTP capture, excluded
scope, discovery queues or unrelated item failures. Browser DOM evidence for an
already collected HTML item can use existing review evidence attachment; a local
DOM snapshot is not an engine-render/index observation.

## Snapshot and campaign requirements

- Preserve source run and input files; produce a new run ID and receipt.
- Bind recovery to the source and derived snapshots. Reconcile resume invalidation
  so changed PDF bytes, extraction output or page coverage cannot reuse old checks.
- Recompute affected deterministic checks; preserve unrelated judgments and require
  fresh semantic review where their evidence dependency changed.
- Validate partition ownership before allowing campaign recovery; propagate new
  coverage and context hashes through the normal campaign review contract.
- Keep source and extraction links usable in HTML/Markdown and redacted derivatives.

## Regression and installed acceptance

Start with the retained 0.1.22 failure: readable text passes while state remains
unsupported. Verify recovery to pending, not audited, for the real two-page
fixture. Assert refusal for wrong source hash, changed source, path/root escape,
empty/partial extraction, unknown or cross-item evidence, duplicate requests,
future or missing reviewer/time, and blocked/excluded states. Assert immutable
source artifacts, retained rule plan, correct image-only unknown and no false
full-coverage result. Cover campaign ownership and resume snapshot changes.

After implementation, rebuild a new versioned archive, install it fresh for both
hosts, rerun the actual extraction/import trial, and run host-driven reports on
readable and unreadable media controls. Existing helper success alone does not
establish semantic acceptance or general PDF/OCR support.

## Conservative resume behavior

Resume invalidates recovered extraction even for unchanged PDF bytes because the
ordinary collector does not reproduce the extractor snapshot. Fresh extraction
and recovery are required. Blank pages also remain unsupported in this version.
