# Audit artifact validation

`validateAudit(runDirectory)` loads the package's trusted core registry and the
run's run.json, inventory.jsonl, evidence.jsonl, checks.jsonl and findings.json.
It returns valid, completionAllowed, recomputed coverage and errors. The optional
programmatic registry override is for trusted author tests; never populate it from
untrusted run data. Reduced rule plans fail against the actual registry.

`loadAuditData` reads stable local run directories only. It rejects symlink roots
and artifact components, escaping paths, nonregular files and malformed UTF-8.
Limits are 64 MiB per manifest, 16 MiB per referenced evidence artifact and 128 MiB
across one load. Larger audits need a future streaming validator or a reported
validation limitation; never drop records to pass the limit. Concurrent attacker
replacement of ancestor directories is outside this stable-directory contract.

## Persisted evidence

Every evidence record includes kind, value, artifact, encoding, snapshotHash,
sourceEvidenceIds and the evidence contract's identity/method/time/locator fields.
An artifact is a relative file beneath the run directory. Encoding utf8 means its
exact text equals value; encoding json means its parsed JSON equals value. The
SHA-256 always covers the artifact's exact UTF-8 bytes. Preserve BOM and newlines.

Derived evidence cites its sourceEvidenceIds. The validator rejects dangling
sources and cycles. Every check's dependencies must include all source item IDs
reachable through its evidence. This validates linkage, not whether a derivation
is semantically correct or the snapshot remains current on the live website.

## Checks and findings

Every in-scope item must plan every rule in the supplied trusted registry. Missing
check results remain a coverage gap. Pass/fail semantic reviews require reviewer,
reviewedAt, reason and the declared evidence kinds. Deterministic conclusions are
recomputed. Explained non-applicability requires evidence and review attribution.

Findings require findingId, title, affectedItemIds, ruleIds, dimensions, evidenceIds,
classification (observed/inferred), severity, confidence, remediation, verification,
ownerRole and effort. Each affected item must be supported by evidence lineage.
Every failed item/rule check must have a corresponding finding. These fields add
rule traceability to the design's minimum finding contract.

## Completion

A structurally valid partial report can have completionAllowed false. Claiming
complete while coverage is unresolved makes the run invalid. A valid completed
run still needs report-generation checks and human/host semantic review; this
validator cannot prove captured provider identity, substantive correctness or
exhaustive discovery beyond the declared scope. No rating or uplift is inferred.

The artifact ceiling permits base64/JSON storage of a bounded 10 MiB HTTP body.
The transport and decoded content ceilings remain separate; raising an artifact
ceiling does not authorize larger network transfers.

See the [persisted record schemas](../schemas/README.md) for offline structural interchange contracts. Schema acceptance does not replace this validator or establish semantic correctness.
