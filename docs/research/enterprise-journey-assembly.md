# Stored journey report assembly

`buildStoredJourneyReport(sourceDirectory, metadata, outputDirectory)` in `scripts/enterprise-journeys/report.mjs` reconstructs funnel, task and experiment projections from an immutable saved run. Metadata has exactly sourceRunDigest, revisionId, authorId, generatedAt and brand. Callers cannot supply observations, narrative, findings, actions or decisions to this entrypoint.

Each workflow exposes its own stored projection function. These invoke the existing original-byte replay and ownership validation, verify active evidence was evaluated at the final run assessment time, and reconstruct historical/current classification from the active index. Every active check must have its scoped request. The assembler reads all three namespaces, even when an index is absent, so removing an index cannot silently omit retained evidence. Stale evaluations require an explicit workflow revision before assembly; the report does not advance the assessment clock or create evidence.

The assembly accepts only the three supported evidence artifact types and at least one evidence item. It rejects other module evidence explicitly. This is the journey integration path, not a complete automatic enterprise audit report. Analytics, tracking, accessibility, technical SEO, performance and qualitative research projection adapters still need integration. Existing checks, scope, requests and evidence metadata are retained through the canonical report model. No UX-quality pass, causal conclusion or automatic remediation is inferred.

Original artifacts remain private. Only each workflow's bounded customer projection enters narrative/observations. Source digest is checked at load and again immediately before saving; this is optimistic consistency, not locking, authenticated storage or delivery authorization. Output uses the canonical fresh-directory writer and JSON/Markdown/HTML validator. Existing reports cannot be overwritten. Report-parent revisions and public edition selection are not exposed by this initial assembly API.

## Verification

The composition test first failed because the new assembly entrypoint did not exist. After implementation, 32 cases across the three workflow suites and composition suite passed. The two composition scenarios compare automatically assembled reports against independently built expected canonical reports. They cover provided-to-expired and persistent declined states, historical interpretation, exact task/funnel ownership and null-valued expired funnel observations.

Additional assertions reject caller-provided projections, stale source digests, active evaluations from an earlier assessment clock, removal of each namespace index and removal of each namespace's requests. Rejected missing-request outputs do not exist. Existing output is refused and reloads unchanged; the source run digest remains unchanged. These are synthetic development checks, not native host trials or production experiment acceptance.

Adding projection exports changes the workflow source fingerprints. Previously saved development evaluations with old fingerprints are deliberately rejected. They require regeneration from their original source inputs under the new evaluator; no old evidence digest is rewritten or silently migrated. No packaged skill or customer deployment changes here.

Independent source review found no material defect in this scoped assembler and independently ran all 32 workflow/composition cases successfully. Full repository verification passed format, lint, typecheck, build, root tests, site typecheck and site tests; logs are retained in `build/enterprise-journey-assembly-verification/`. The source reviewer did not run the full suite.
