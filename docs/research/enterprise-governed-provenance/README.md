# Owning provenance for research report items

`buildStoredResearchDraft` now constructs private provenance from its own verified projection and the authoritative research-control registrations. It accepts no caller-provided item-origin mapping and creates no additional registry. `acquireStoredResearchDraft` returns this same mapping through the existing metadata-first acquisition path.

The private schema binds the exact customer edition, canonical draft object digest and manifest object digest. Each emitted item binds its reference and canonical content digest to the included candidate digest, full stored registration digest, candidate/receipt artifact hashes and exact support bindings. Controller scope, storage revision, state digest and access generation are captured together with the existing context/policy/descriptor/candidate-set digests. These are private identifiers and hashes, not approved public tombstones or an immutable-retention exemption.

The owning builder constructs the mapping synchronously with projection, then rechecks the stored revision before returning either artifacts or provenance. Authority and metadata are snapshotted before asynchronous reads. Payload text is deliberately not eagerly cloned: stale revision, retirement and eligibility checks must precede text access, including getters. Host content acquisition, authenticated clocks/identities and external authority remain outside this local boundary. Final rechecks are optimistic and do not lock through later use or delivery.

Customer JSON/Markdown/HTML contain no provenance mapping. No source text or review reason is duplicated in the private provenance. Empty or withheld selections yield no item origins. Returned objects have persistenceAuthorized=false and deliveryAuthorized=false. This mapping does not authorize storing historical content, grant continued access, authenticate research semantics, preserve editorial history, or revoke prior exports. A future history owner must re-resolve current controller eligibility and original content; this response is not a reusable authorization token.

Tests cover exact rendered-item/controller/registration bindings, private linkage absent from customer projections, empty selections, withdrawal before loader callbacks, and mutation of caller authority/candidate metadata while controller reads are pending. Existing stale-revision/retired-artifact getter regressions and original receipt mismatch checks remain in the same suite.

No bundled skill, customer renderer schema, release archive or deployment changed. The full content-bearing historical findings/actions/reviews contract and its retention/withdrawal lifecycle remain open.

Independent reviewer enterprise_contract_review found no material mapping defect and independently passed all 19 focused tests. It verified exact item/decision/registration binding, private-only output, controller generation/revision and metadata snapshots that preserve preflight-before-text checks.

Full repository format, lint, typecheck, build, root tests, site typecheck and site tests all passed. See [verification receipt](verification.json).
