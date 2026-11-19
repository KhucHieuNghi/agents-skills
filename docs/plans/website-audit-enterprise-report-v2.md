# Versioned enterprise report presentation

Status: implemented in development candidate 0.3.24 with independent source review and bounded regression/browser/install evidence; commercial enterprise release remains pending. User authorization is the continuing enterprise development goal. This is a P2 real-data usability correction, not a reduction of P3–P7 scope.

## Evidence and compatibility decision

The [public lab pilot](../research/enterprise-performance-public-20261119/README.md) produced a 62,984px report at 390px viewport width. Its narrative section alone is 27,332px because each narrative row repeats 24 long evidence identifiers in a 110px table column. Mechanical overflow and keyboard checks pass; that is insufficient evidence of usability.

Independent source review by `enterprise_contract_review` identified that `loadEnterpriseReport` regenerates all artifacts with the current renderer and compares exact bytes. Editing the existing CSS directly would invalidate historical reports and prevent revision from those parents. Ruling: preserve V1 output exactly and introduce explicit rendering identity in a new manifest version. Cost: maintaining two deterministic HTML projections; benefit: immutable customer dossiers remain verifiable. Canonical JSON and Markdown semantics remain unchanged.

## Owners and interface

- `skills/content-search-audit/scripts/lib/enterprise-report-view.mjs`: current projection, section mapping, CSS/CSP and manifest generation. Preserve V1 bytes in a frozen implementation; share only helpers whose behavior stays byte-compatible.
- `scripts/lib/enterprise-report.mjs` within the skill: save/load/revise. Extend render/save with optional `{rendererVersion: 2}`; dispatch loads from validated manifest, never guessed HTML content.
- `scripts/lib/enterprise-report-model.mjs`: include any new implementation files in producer source-digest inventory. Rendering an existing model preserves its stored producer metadata.
- `schemas/enterprise-report.schema.json`: canonical report schema/tool version remains 1 for a presentation-only change.
- `scripts/check-enterprise-report-browser.mjs` and new focused fixtures: real-data usability checks in addition to existing synthetic mechanical checks.

Manifest V1 remains byte-identical and maps to renderer V1. Manifest V2 declares `schemaVersion: 2` and `renderer: {id: "enterprise-html", version: 2}`. Reject unknown or contradictory metadata. Always regenerate and compare full artifact bytes; recomputed file hashes alone cannot authorize altered HTML. Render upgraded presentation into a new directory; never overwrite an archived report. Canonical revision and presentation version are distinct identities.

## Implementation sequence

1. Freeze representative V1 customer and public outputs, including the actual Quokka, Cake and Infinity pilot reports. Write failing compatibility/dispatch tests before extraction. Extract V1 unchanged and prove all original report folders still load and can serve as revision parents.
2. Add strict manifest dispatch and explicit render/save options. Test unknown versions, malformed envelopes, contradictory renderer identity, HTML modification with recomputed hashes, deterministic output and unchanged JSON/Markdown bytes across renderers for the same model/edition.
3. Implement V2 narrative articles with full-width visible prose. Evidence lists use native details/summary and escaped individual links to stable evidence anchors. Preserve every original reference; do not parse comma-joined display strings. Keep conclusions, limitations and unknown states visible by default.
4. Use readable evidence records with source/time/digest labels. Reuse evidence disclosures in checks, findings and measurements. Use stacked labeled records for prose-heavy requests and measurements on mobile, while preserving comparison tables such as coverage. No runtime script or external resource.
5. Exercise 390px and desktop, enlarged text, native disclosure keyboard behavior, focus/link destinations, public redaction, escaping and offline CSP. Inspect screenshots of narrative, expanded references, destination evidence, measurements and requests.
6. Independent implementation review, fixes, root gates, provenance/component digest/version update, archive extraction and fresh installed workflows for Codex and Claude Code. Keep previous archives and real pilot reports unchanged. Deliver V2 projections beside their V1 parents; do not imply full enterprise acceptance.

## Acceptance criteria

- Existing V1 JSON/MD/HTML/manifests remain byte-identical and validate; immutable parent revision still works.
- V2 JSON and Markdown equal V1 exactly for identical input/edition. All original statuses, measurements, requests, narratives and evidence references remain available.
- On the frozen 390px Quokka input, narrative height decreases at least 75% from 27,332px, without truncating or hiding substantive narrative text. This threshold is a product regression target, not a universal usability standard.
- Narrative prose occupies available content width. Every disclosure count matches its original array; opening exposes all references, each resolving to exactly one corresponding evidence record. No nested horizontal scrolling for prose.
- Keyboard users can open/close references and reach evidence destinations with visible focus. Text enlargement preserves content. Public projection leaks no private identities or references.
- Full-page height and no-overflow checks are supporting measurements only; screenshot and interaction review remain required.

Do not mark this plan complete from source review, passing V1 tests or the earlier public-pilot browser checks. Actual V2 implementation and evidence are still required.

Implementation and verification checkpoint: [candidate 0.3.24 dossier](../research/enterprise-report-v2-0324/README.md). Historical V1 remains immutable. The full report remains lengthy; the verified improvement concerns readable narrative and evidence navigation, not a complete enterprise usability certification.
