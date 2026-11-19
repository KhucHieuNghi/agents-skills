# Private report-transition inventory

At commit `9198ce4`, a validated same-run report revision accepted removal of one finding, one proposed action, one narrative and one independent review decision. The [reproduction receipt](reproduction.json) records that result. Existing check/observation continuity did not cover editorial history. This is a report-product defect, not a finding about the four pilot websites.

The development-only `scripts/enterprise-report-lineage.mjs` now compares two validated, exactly parent-bound customer reports. It inventories retained, changed, removed and added editorial items; exact current-to-historical observation demotion is distinct. It compares transitive review-target digests and review eligibility at the next assessment/author, distinguishes missing valid reviews from stale ones and fresh replacements, and accounts for newly added decisions.

Returned content states describe byte-equivalent canonical content only. An unchanged action is not necessarily valid against changed dependencies. The inventory includes private IDs/digests but never copies narrative, finding/action prose or review reasons. It is in-memory only and explicitly does not authorize storage/disclosure, preserve history, recall exports or establish remediation. Hash commitments are not universally exempt from retention/withdrawal policy.

## Independent review

`enterprise_contract_review` first confirmed the source gap and the distinction between current findings and historical editorial records. Implementation review found missing added-decision inventory and a misleading classification where a fresh valid replacement remained labeled only stale. Both were corrected: added decisions have their own inventory; prior eligibility and replacement status are separate. A fixed interpretation statement now clarifies content-only retention.

The reviewer independently reran eight focused tests and reported no remaining material finding within this private interface. Four additional binding cases subsequently brought author-run focused coverage to 12 tests. Coverage includes silent removal, private canaries, carried/omitted reviews, reused IDs with changed findings, transitive action review invalidation, author changes, newer assessment clocks, observation demotion, new reviews and fresh replacements. No independent reviewer identity/authentication claim is inferred from these metadata.

## Remaining implementation

The [history plan](../../plans/website-audit-enterprise-report-history.md) keeps versioned canonical preservation, withdrawal-safe historical disposition, parent-aware assembly and delivery/storage governance open. This inspector detects loss; it is not wired as a substitute for those contracts and cannot fix the old canonical model's permissive revisions by itself. Candidate package remains 0.3.33 because no bundled skill file changed. No archive, deployment or commercial acceptance was produced by this checkpoint.

Repository checks passed: format, lint, typecheck, build, root tests, site typecheck and site tests. [Verification receipt](verification.json). No UI or bundled skill changed, so no new browser or package-install claim is made.
