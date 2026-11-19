# Stored generated-report provenance bindings

`inspectStoredGeneratedReportProvenance` extends the private generated-origin inspector to already-authorized local report/run artifacts. The caller must supply exact source-run, canonical report-object and manifest-byte digests. The function snapshots those options, loads and validates the complete source run and report JSON/Markdown/HTML/manifest, replays the shared module registry, then loads both bundles again before returning private provenance with exact artifact bindings.

The returned `artifactBinding` distinguishes the canonical object digest from the JSON-file byte digest (which includes the canonical trailing newline). It also binds the original manifest and customer edition. Local filesystem paths are not copied into the private record. Both frozen V1 and current V2 report rendering manifests remain supported through the existing version-dispatched loader; no historical bytes or schema are rewritten.

## Consistency and authority

The two loads provide optimistic consistency, not a lock, authenticated execution or a guarantee against a change after the final read. The source run remains bound by its canonical digest; this does not newly require byte-identical run JSON serialization. A digest verifies identity/integrity against the supplied expectation, not the trustworthiness of its issuer.

This entrypoint is for externally authorized local generated artifacts. It reads monolithic report/source content and is **not** the metadata-before-content loader for governed research history. Callers must resolve those rights separately before invoking it. Current generated-only restrictions remain: standalone customer reports, exact full replay, no curated actions/review prose. Generated origin does not establish research-free content. No persistence, disclosure, delivery or history-preservation authority is granted.

## Tests and review

Nine new cases initially failed because the stored API did not exist. Tests now cover positive byte/object/manifest bindings, three stale expected digests, tampering with every report artifact, frozen V1 projection, source/report changes between loads and mutation of caller options. Existing generated-origin tests continue to cover exact module replay, content edits, check/evidence bindings and unsupported review prose.

Independent reviewer `enterprise_contract_review` found no material implementation defect in this scope. It identified a test fixture that wrote unused `run.json` instead of the authoritative `enterprise-run.json`; the filename was corrected rather than weakening the rejection assertion. The report-mutation case already passed. This correction is a test fix, not evidence of a source-loader vulnerability.

Private provenance storage, report-item retention policy, governed dependency resolution, versioned editorial history and parent-aware customer report generation remain open under the [history plan](../../plans/website-audit-enterprise-report-history.md). No bundled skill, release archive, production website or deployment changed.

After correcting the fixture, all 20 focused provenance tests passed. Full repository checks passed: format, lint, typecheck, build, root tests, site typecheck and site tests. See [verification receipt](verification.json). No UI behavior changed; no new browser, installed-package or native-host trial claim is made.
