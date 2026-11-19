# Encrypted generated-provenance metadata registry

The development registry stores inspector-produced generated-report provenance, not source content or report prose. Registration calls the stored artifact inspector itself and preserves exact manifest, report, source and compiler bindings. Callers cannot submit a provenance object. The registry rechecks the bound report and refuses registration timestamps earlier than report generation.

## Storage contract

- AES-256-GCM encrypts the complete metadata state with a caller-managed 256-bit key. AAD binds the fixed namespace, customer/store/purpose scope and monotonic SQLite revision. The worker scope includes the same namespace identity so another control namespace cannot accidentally replace this database even with the same key/customer.
- The existing isolated Python worker receives ciphertext only. Its 0700/0600 path checks, exclusive initialization, SQLite transaction/CAS, minimal environment, bounded pipe output and uncertain-outcome handling are retained. Shared Node transport was extracted; research control-state schemas and Python worker were not changed.
- Externally trusted authority is checked before inspection or storage transport. It binds scope, target/staging directories, artifact class, exact operation, supplied assessment time, grant freshness and maximum registration retention. Accepting this structure does not authenticate its issuer or provide a trusted live clock.
- Registration identity derives from exact report/artifact bindings. Identical duplicates are no-ops only with unchanged provenance and retention deadline. Rebinding and implicit retention extension reject. No retention-extension API is implemented.
- Reads address one registration, so expired entries do not hide unrelated live entries. At the exact retainUntil boundary, reading that record rejects. A revision-only read supports reconciliation after uncertain commit outcomes without enumerating expired metadata.
- Explicit removal and expired-record purge use a fresh separate operation grant and expected revision. They are logical removal only, not physical erasure, denial of future re-registration, recall of exports or deletion of backups. No permanent hash tombstones are introduced.

## Operational limits

There is no automatic purge scheduler or container/backups deletion workflow. Expired records remain encrypted until an authorized cleanup operation runs. Registry container identity remains until separately authorized filesystem lifecycle handling removes the container. The metadata registry therefore does not establish full retention or legal compliance. Owner operations must cover the container, keys, backups, staging remnants and artifacts outside this registry.

Source/report acquisition remains externally authorized; generated reproducibility does not prove that labels or other inputs are research-free. Registry retention authority covers private provenance metadata only, never historical report prose, research candidates or distribution. A stored compiler digest is historical evidence, not verification against today's compiler. Read results explicitly report currentReplayVerified=false and disclosureAuthorized=false.

Mutation errors can follow a committed operation. No automatic retry occurs; reconcile the current revision and exact registration identity before deciding the next action. CAS controls registry writes, not concurrent edits to source reports or future delivery.

## API

`createGeneratedProvenanceRegistry(options)` initializes an empty namespace. `registerGeneratedProvenance(options, expectedRevision, binding, retainUntil)` inspects existing local artifacts and registers their private metadata. `readGeneratedProvenance(options, registrationId)` reads one unexpired record; omission returns revision only. `removeGeneratedProvenance(options, expectedRevision, registrationId)` removes one record; omission selects expired-record purge under its distinct grant.

Options contain an absolute directory, caller key, context (customerId/storeId/fixed purpose/assessmentAt) and operation-specific authority. Neither keys nor plaintext report/source paths are persisted. Registration record IDs and digests are private retained metadata, not customer-safe tombstones.

## Verification scope

Synthetic tests cover encrypted storage, exact inspector bindings, denied pre-I/O authority, stale and competing revisions, duplicate retention rejection, expiry boundary with mixed live/expired records, cleanup after an old grant expires, explicit re-registration after logical removal, wrong keys/customer/namespace, uncertain post-commit responses without retries, and chronology relative to report generation. Research-store regression tests exercise the extracted transport.

This registry is development-only and not packaged as a commercial release. It does not complete governed research provenance, canonical historical report rendering, parent-aware assembly, remediation/recovery or native/commercial acceptance from the [history plan](../../plans/website-audit-enterprise-report-history.md).

Independent reviewer `enterprise_contract_review` verified namespace isolation, pre-I/O scope/authority, inspector-only registration, generation-time binding, expiry, CAS and transport extraction. It independently passed 52 tests across registry/control-store/stored-report suites with no material finding. Full repository checks passed: format, lint, typecheck, build, root tests, site typecheck and site tests. See [verification receipt](verification.json).
