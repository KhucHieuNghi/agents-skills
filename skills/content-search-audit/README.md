# Content Search Audit — implementation candidate

The intended product is one skill for Codex and Claude Code. It combines content
quality, SEO, AIO, AEO/GEO and cross-content review. No additional upstream skill
invocations are part of the customer workflow.

This worktree is not yet a released Solution Skill. Do not distribute it as a
validated commercial package. The entrypoint and baseline contracts exist; automatic
discovery, global campaign review and host evaluation are still under development. Five selected upstream methods now have packaged
licenses and a file-level provenance lock; this is not a complete release gate.

## Available helpers

Node.js 22 or newer is required. The internal dispatcher now supports
start, resume, review, campaign, campaign-resume, campaign-validate, inventory, validate, coverage and render; see [helper commands](references/helper-commands.md).
Its dependency-free ESM library modules are:

- `scripts/lib/campaign.mjs`: partition large declared collections and aggregate
  unique-item coverage; see [campaign contract](references/campaigns.md).
- `scripts/lib/inventory.mjs`: normalize explicit sources without sampling.
- `scripts/lib/report.mjs`: render validated offline HTML, Markdown, CSV and
  coverage JSON; see [report contract](references/report-contract.md).
- `scripts/lib/validate.mjs`: validate persisted evidence, rule plans, checks and
  findings; see [artifact contract](references/artifact-validation.md).
- `scripts/lib/checks.mjs`: plan the 26 candidate rules, evaluate two deterministic
  checks and validate supplied semantic reviews; see [rule contract](rules/README.md).
- `scripts/lib/state.mjs`: single-writer checkpoint and snapshot invalidation.
- `scripts/lib/coverage.mjs`: compute coverage of a declared rule plan.
- `scripts/lib/collect.mjs`: collect authorized local HTML/Markdown/text exports.
- `scripts/lib/public-collect.mjs`: collect allowlisted public URLs with robots,
  scheduling and evidence; see [public collector](references/public-collector.md).
- `scripts/lib/search-console.mjs` and `analytics.mjs`: validate supplied Search Console
  and GA4 exports; `bing.mjs` validates Bing traffic and attributed AI dashboard mappings. Both report renderers can attach original exports and recomputed
  receipts through `searchConsoleExports`, `analyticsExports` and `bingExports` options.
- `scripts/lib/discovery-resume.mjs`: validate bound discovery captures and continue
  stopped sitemap/link traversal in a new directory with restored cooldowns; see
  [discovery recovery](references/discovery.md#resume-stopped-link-or-sitemap-discovery).
- `scripts/lib/server-logs.mjs`: import reviewed normalized JSONL requests, preserve
  row errors and unverified crawler identity, and attach evidence through
  `serverLogExports`; see [log contract](references/server-logs.md).
- `scripts/lib/measurements.mjs`: validate supplied AI observations and aggregate
  response-level mention/citation rates and explicitly adjudicated claim/answer accuracy; see [measurement contract](references/measurement.md).

The modules are library exports; scripts/audit.mjs is their command dispatcher.
No script claims to run
semantic analysis, prove the supplied rule plan is exhaustive or validate live
search performance. Public reads require explicit network.allowedOrigins; the default remains offline.
Declared URLs are collected without automatic discovery.

Reports belong in the customer's selected output directory, normally
`audits/content-search/<run-id>/`. Preserve the customer's brand and language.
Do not upload private exports or audit evidence to external services implicitly.
