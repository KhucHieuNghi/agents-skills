# Enterprise report — evaluation workflow

This is a development candidate. Structural report integrity does not establish audit accuracy, provider authenticity, reviewer independence or commercial acceptance. See the [intake contract](enterprise-intake.md) before reporting an enterprise run.

## Create and validate

```bash
node /absolute/installed-skill/scripts/audit.mjs enterprise-report /absolute/run /absolute/bundle.json /absolute/new-report
node /absolute/installed-skill/scripts/audit.mjs enterprise-report-validate /absolute/new-report
```

The bundle contains `sourceRunDigest` (canonical enterprise run digest), opaque `revisionId` and `authorId`, explicit UTC `generatedAt`, customer `brand` (`name`, hex `accent`), and arrays `findings`, `actions`, `observations`, `narrative`, `decisions`. Optional `sensitiveValues` supplies confidential literals to redact; reject structural identifiers containing these values instead of changing their identity. Never place credentials in report input.

Create the output's parent directory first; the report/run output itself must be
new. When inspecting data requests, the fields are `id`, `suggestedOwnerRole`,
`requestedArtifact`, `status`, `exportInstructions` and `fallback`, not requestId
or ownerRole. For example, inspect `run.dataRequests.map(({id, suggestedOwnerRole,
requestedArtifact, status}) => ({id, suggestedOwnerRole, requestedArtifact, status}))`.
Check each command's result; a later successful shell command does not validate
an earlier failed inspection or report command.

Keep request meaning consistent in narratives and final summaries: GA4 report
pages supply metrics/dimensions and reporting metadata; event/key-event definitions
and stream settings need separately scoped configuration evidence. A GTM container
version is another artifact. Do not imply that one report export supplies all three.

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

## Versioned HTML presentation

New reports use HTML renderer V2: visible full-width narrative, labeled records and keyboard-operable evidence disclosures. JSON remains canonical; Markdown preserves the same complete data. A collapsed evidence list does not hide a conclusion, limitation or unknown status. Open the references to inspect each full evidence identifier and follow its link to the evidence index. Public output continues to withhold customer narrative and detailed identifiers.

To upgrade presentation only, run `node scripts/audit.mjs enterprise-report-render SOURCE_REPORT NEW_DIRECTORY`. The command validates every source artifact first, preserves its edition and exact JSON/Markdown bytes, and writes a fresh directory. It does not reassess evidence, refresh timestamps, approve findings or authorize publication. Existing directories are refused. Source reports and archived releases remain unchanged.

The manifest records the rendering identity independently of canonical report revision: V1 manifests retain their original projection; V2 declares renderer `enterprise-html` version 2. Validation selects the recorded renderer and checks regenerated bytes, including CSP and hashes. Unknown or contradictory renderer metadata is rejected. Never manually edit HTML or its hash to bypass validation. API callers can explicitly request historical rendering with `{rendererVersion: 1}` in the render/save options; the default is 2.

## Replay-derived standalone report

Run `node scripts/audit.mjs enterprise-report-assemble RUN METADATA.json NEW_DIRECTORY` to replay registered supplied-source owners and generate a standalone customer draft. The metadata JSON has exactly `sourceRunDigest`, `revisionId`, `authorId`, `generatedAt` and `brand`; use the digest of the validated source run. The helper rejects unsupported evidence, stale bindings and inconsistent source projections; it never infers provider authentication, review acceptance or permission to publish. It is not a parent-revision workflow and does not retain prior editorial actions/reviews. Research-controlled text and other unsupported evidence require their separate approved workflows; do not omit them to make assembly pass.

The helper supports registered journey, browser, runtime, provider, measurement, performance, accessibility and technical SEO supplied-source projectors. Existing development journey runs from before this packaging migration use earlier evaluator fingerprints and must be reassessed or handled by an explicitly supported legacy evaluator; never relabel cached evidence as current. Missing sources remain requests or unknown; no live account authentication or website change is implied.
