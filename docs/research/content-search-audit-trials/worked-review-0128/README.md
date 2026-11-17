# Worked semantic review — unchanged 0.1.28

The author-side [executable example](../../../../scripts/example-content-audit-review.mjs)
creates a new synthetic refund-policy dossier and demonstrates the complete local
review mechanics against an installed package. It is not another customer skill,
not an automatic semantic auditor, and not part of the frozen candidate package.

```sh
rtk proxy node scripts/example-content-audit-review.mjs \
  /absolute/installed/content-search-audit /absolute/new-example-directory
```

The output directory must not exist. The example writes its own synthetic source;
it does not inspect customer files. Its manually authored finding is intentionally
specific to that fixture. Do not apply the fixed verdict, evidence, severity or
remediation to arbitrary content.

The example connects these operations:

1. Start an inventory-backed run and obtain actual item/evidence IDs.
2. Register attributed owner context with its own artifact hash and source linkage.
3. Submit a semantic failure together with its supported finding and current review time.
4. Retain the original run and create a separate immutable review revision.
5. Validate the revision and keep unassessed rules unknown.
6. Verify final report quotations against exact source lines and final file hashes.

Both extracted host installations passed the example. The assertions verify one
persisted finding, an unrelated canonical check still unknown, structural validity
with completion disallowed, unchanged source and original checks, and rejection of
a failed check submitted without its finding. Two submitted quotations verify.
The archive preserves both complete runs and was compared with original bytes.

This establishes executable mechanics, not host instruction-following. No native
Codex or Claude session was invoked in this experiment. The prior Claude omission
remains unresolved. The next behavioral comparison should expose this bounded
example without exposing the target fixture's gold, and distinguish guided recovery
from an unassisted first invocation. Only evidence of improved behavior warrants
adding a concise example to a newly versioned customer package.
