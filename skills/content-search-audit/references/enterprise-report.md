# Enterprise report — evaluation workflow

This is a development candidate. Structural report integrity does not establish audit accuracy, provider authenticity, reviewer independence or commercial acceptance. See the [intake contract](enterprise-intake.md) before reporting an enterprise run.

## Create and validate

```bash
node /absolute/installed-skill/scripts/audit.mjs enterprise-report /absolute/run /absolute/bundle.json /absolute/new-report
node /absolute/installed-skill/scripts/audit.mjs enterprise-report-validate /absolute/new-report
```

The bundle contains `sourceRunDigest` (canonical enterprise run digest), opaque `revisionId` and `authorId`, explicit UTC `generatedAt`, customer `brand` (`name`, hex `accent`), and arrays `findings`, `actions`, `observations`, `narrative`, `decisions`. Optional `sensitiveValues` supplies confidential literals to redact; reject structural identifiers containing these values instead of changing their identity. Never place credentials in report input.

A finding must reference a failed check and assessed evidence. Actions are proposals only. Observations record scope, period, evidence, precision and historical/current classification. Keep historical results such as 40/100 explicit. Do not infer current performance from historical measurements. Narrative is stored in JSON and requires evidence; rendering cannot determine whether its interpretation is true.

`report.json` is authoritative; `report.md` and `report.html` are deterministic projections of the same revision. The manifest hashes all three. Validate before delivery. Editing Markdown or HTML alone fails validation even if its file hash is rewritten. All four files are private by default; raw evidence payloads stay in the source run. History and customer responses are sanitized, attributed and separate from current counts.

Schema: [enterprise report](../schemas/enterprise-report.schema.json). The schema checks structure; runtime validation additionally checks identities, references, coverage arithmetic, temporal constraints and review bindings.

## Revise without erasing evidence

```bash
node /absolute/installed-skill/scripts/audit.mjs enterprise-report-revise /absolute/parent-report /absolute/run /absolute/new-bundle.json /absolute/new-report
```

Include `parentReportDigest`, calculated with `enterpriseDigest(parentReport)` from the bundled state helper, and a distinct revision ID with a later generation time. This canonical object digest differs from the SHA-256 of the JSON file including its trailing newline.

The command loads and validates all parent artifacts. Narrative-only changes retain the identical source run digest. Reassessment requires a new run with declared lineage, retained scope and bound historical verdicts. Preserve all prior observations; current observations may be reclassified historical, but their values, scope, periods and evidence bindings cannot be silently replaced. Keep original evidence IDs immutable and add new IDs for new observations. A correction requiring withdrawal is not yet supported; do not overwrite an old report to conceal the correction.

Decisions bind the sanitized target plus transitive claim, check-context and evidence dependencies. Obtain the binding with `enterpriseReviewTargetDigest(report, targetType, targetId)` from `scripts/lib/enterprise-report.mjs`; a plain hash of the target object is insufficient. Dependency changes invalidate acceptance. Decisions record reviewer identity, type, time, verdict and reason. An author cannot review their own targets under the same identifier. These assertions are not proof that the reviewer was independent; retain actual review evidence in the delivery dossier.

## Public aggregate edition

Pass `public` as the optional final argument to `enterprise-report`. It produces separate artifacts containing aggregate coverage and counts, a hashed revision alias, fixed public branding and no detailed customer narrative, evidence or request history. This command does not publish anything. Review both customer and public artifacts for disclosure risk before sharing. Literal and pattern redaction cannot guarantee every confidential value was identified.

Checksums detect inconsistent artifacts, not malicious replacement of an entire internally consistent report. The programmatic loader accepts `expectedManifestDigest` from a separately trusted receipt. Retain that receipt outside the report folder when authenticity of the delivered snapshot matters.

## Reading the result

Report accounting, assessment coverage, site health, implementation state and review state are separate. Unknown remains unknown; it is neither pass nor N/A. Complete accounting does not mean the website was fully audited. Current registry rules are intake questions; completing them does not establish complete technical audit coverage. Detailed provider/runtime modules and commercial pilots remain pending.
