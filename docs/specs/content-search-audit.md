# Content Search Audit design

Status: official review-required offering from 0.2.0, approved by the owner on 2026-11-18. Research checked 2026-11-16. Scope: one custom customer skill covering content inventory, quality, SEO, AIO, AEO and GEO, inheriting reviewed upstream methods. This document remains the target contract; implementation and acceptance evidence are tracked in [the execution plan](../plans/content-search-audit.md) and [evaluation record](../research/content-search-audit-evaluation.md). Existing helpers and installation tests do not prove every requirement below is complete.

## Product contract

Public name: `content-search-audit`. Codex invokes `$content-search-audit`; Claude Code invokes `/content-search-audit`. These are the customer-facing invocations for the installed candidate; native discovery and end-to-end behavioral acceptance remain subject to host trials. The customer installs one solution and invokes exactly one skill. The orchestrator owns intake, evidence, all audit dimensions, reconciliation and final report. It never asks the customer to invoke an upstream skill. Only Codex and Claude Code are supported; no pinned model.

Audit is read-only for target content. Creating the requested audit artifacts is part of the workflow; changing website content, CMS, crawler policies, deployment or external publication is a separate action. The default output is an actionable audit, not automatically rewritten content.

## Repository evidence and architecture choice

`src/release.ts` copies each manifest component to `skills/<id>` and validates its SKILL.md. `src/solution-install.ts` installs every component and links Claude discovery paths. Merely adding upstream components would expose multiple skills. Choose a single bundled component with internal method references and no nested SKILL.md files. Keep the current release schema and installer; extend validation for this composed package's provenance rather than silently inventing a new component type.

Alternatives: (1) one entrypoint plus many installed upstream skills is simple but violates the strict single-skill surface; (2) one bundled skill with reviewed internal adaptations meets the requirement and uses existing install/upgrade; (3) plugin/subagent composition adds host-specific dependencies and is deferred. Internal work may execute sequentially. Optional agents are an optimization, never a requirement for the customer contract.

## Research and additional candidates

Source URLs below are discovery evidence, not immutable release pins. Before adaptation, resolve canonical repository, full commit, skill path, tree hash, license and dependency closure. Do not replace existing catalog pins.

| Source                                                                     | Proposed inheritance                                                                                                                      | Review decision                                                                                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Corey Marketing Skills](https://github.com/coreyhaines31/marketingskills) | seo-audit, ai-seo, schema, content-strategy, programmatic-seo, analytics; evaluate copywriting and competitor methods for content clarity | Primary candidate family; select only modules needed for audit, inspect actual files and references                                 |
| [Claude SEO](https://github.com/AgriciDaniel/claude-seo)                   | technical, rendered content, locale, content and audit methodology                                                                        | Reference and benchmark; do not bundle whole plugin or assume Codex parity                                                          |
| [RankXAI](https://github.com/rankxai/seo-geo-skills)                       | evidence grading, crawler, Search Console/log workflow                                                                                    | Evaluate collectors and rules; low adoption is not proven quality                                                                   |
| [TheSmokeDev GEO](https://github.com/TheSmokeDev/geo-skills)               | prompt inventory, AI discovery and citation review                                                                                        | Evaluate CLI dependencies and claims independently                                                                                  |
| [Gaguero](https://github.com/gaguero/seo-agent-skills)                     | anti-spam gates and observed/inferred distinction                                                                                         | Method comparison candidate                                                                                                         |
| [Zubair GEO SEO](https://github.com/zubair-trabzada/geo-seo-claude)        | citability, brand authority, platform-specific reporting                                                                                  | Additional candidate; scores require calibration, scripts and host assumptions need review                                          |
| [Aaron SEO GEO](https://github.com/aaron-he-zhu/seo-geo-claude-skills)     | content/research/measurement methods                                                                                                      | Current repository points to aaron-marketing-skills; historical standalone version at v9.9.12. Resolve actual source before pinning |
| [Former Codex SEO URL](https://github.com/AgriciDaniel/codex-seo)          | host comparison only                                                                                                                      | URL currently redirects to chatgpt-seo; cannot use old descriptions as proof of current Codex support                               |

Inheritance means adapted, attributed internal procedures, not concatenated upstream prompts. Record copied text, modified text and independently written procedures distinctly. Upstream installer commands, promotional output, model pins and implicit write permissions must not survive into the customer workflow. Preserve required notices even if promotional workflow text is excluded.

## Meaning of full content coverage

Inventory the union of authorized sitemap URLs, internal crawl URLs, CMS exports, repository content, provided documents and analytics landing URLs. Maintain source membership and discovered aliases. Preserve query parameters that affect content; remove only explicitly classified tracking parameters. Canonicals express a relationship, not permission to discard localized or duplicate pages.

Content includes landing/product/service/category/blog/help/docs pages, navigation, metadata, headings, body, structured data, images/alt/captions, linked PDFs and supplied transcripts. For video/audio without transcript or image-only documents without authorized extraction, record unavailable content and affected checks; never label it audited. Private CMS data is evaluated only from supplied exports or authorized read connectors. External social/reputation content is a separate evidence surface and must not expand into unlimited crawling.

Every discovered in-scope item has a terminal coverage state: audited, failed, blocked, unsupported, excluded-with-reason. Unknown inventory completeness remains explicit. Full audit means every enumerated in-scope item has completed required applicable checks, with unresolved inventory limitations disclosed. Sampling is a named mode, never silently substituted for full coverage. Large inventories checkpoint and resume without dropping pending items.

## Audit dimensions

1. Content quality: audience, intent, factual claims, citations, freshness, original value, duplicate/near-duplicate topics, readability, tone, conversion clarity, accessible text alternatives. Missing evidence about expertise is an uncertainty, not proof of low expertise.
2. SEO: status/redirects, index directives, canonical, sitemap, internal links, metadata, rendering, schema, hreflang, content architecture. Index status is unknown without appropriate index evidence. Cannibalization is a hypothesis unless query/page evidence supports it.
3. AIO: in this product means AI search optimization; Google AI Overviews is separately named. Audit machine-readable factual consistency, entity identity, crawler access and retrieval prerequisites.
4. AEO: answers match actual questions, self-contained definitions, comparisons, procedural clarity and limitations. Do not enforce arbitrary universal word counts or FAQ schema.
5. GEO: discoverability, citation sources, factual brand representation and measured presence where permitted. Readiness checks and observed engine outcomes are distinct.
6. Cross-content: taxonomy, journey gaps, duplicate/conflicting claims, multilingual parity, orphan resources and consolidation opportunities. Never delete or merge content automatically.

Each rule declares ruleId, dimension, applicability, requiredEvidence, authoritativeSources, evidenceTier, lastReviewedAt, procedure and limitations. Prefer official Google/OpenAI/Microsoft guidance over conflicting upstream heuristics. No guaranteed ranking/citation, fabricated volumes, fake reviews, invisible AI instructions or bulk low-value pages.

## Pipeline and recovery

Intake → enumerate → normalize → collect → per-item audit → cross-item analysis → optional measured visibility → reconcile → prioritize → validate → render report.

Run state: planned, collecting, analyzing, validating, complete or partial. Only complete when coverage and artifact gates pass. Keep runId, configuration hash, input hashes, version, timestamps and cursor. Resume reuses matching snapshots; changed inputs invalidate affected checks. A bounded crawl reports its remaining queue. Deterministic scripts collect and validate; model analysis explains semantics without pretending to be a crawler or analytics API.

Baseline works offline on exports or local HTML/Markdown. Public URL collection is allowlisted, rate-limited and bounded. Default proposed collector limits: 2 concurrent requests per host, 1 request/second/host, 20-second timeout, 2 retry attempts with backoff, 10 MiB per response, 500 URLs per collection batch. These limit batches, not promised audit completeness. Continue in further batches or report partial. Resolve and reject private/loopback/link-local destinations and redirects unless explicitly approved as local test fixtures; strip credentials and never forward cookies across origins. Render browsers optionally with isolated sessions. Never execute target scripts as local shell code.

## Output contracts

Run folder: `audits/content-search/<run-id>/` outside installed skill package.

- run.json: scope, versions, source permissions, budgets, lifecycle, remaining work.
- inventory.jsonl: itemId, URI/path, source memberships, locale, type, content hash, aliases and canonical relationship.
- evidence.jsonl: evidenceId, itemId, collection method, time, locator, snapshot hash, redaction and limitations.
- checks.jsonl: itemId, ruleId, pass/fail/unknown/not-applicable, evidenceIds, reason.
- findings.json: findingId, dimensions, affectedItemIds, observed/inferred, severity, confidence, evidenceIds, remediation, verification, ownerRole and effort.
- coverage.json: totals and per-dimension completed/unknown/blocked counts, denominator definition and remaining queue.
- content-actions.csv: keep/update/consolidate/investigate recommendations with evidence and affected items; formula-safe CSV.
- ai-observations.jsonl: optional engine, surface, promptId, locale, time, run, response artifact, citations, mention and accuracy annotations. API observations must not be presented as consumer UI results.
- report.md and report.html: executive narrative, coverage, prioritized backlog, item-level appendix, measurement plan and evidence links. Escape HTML and redact sensitive data. Customer brand, not forced NKSkills visual identity.

No global SEO/GEO score in v1. Present severity, confidence and coverage separately. Missing credentials produces unknowns, not zero scores. Duplicate findings across dimensions become one finding with multiple tags.

## Composition and provenance

One component: skills/content-search-audit. Internal methods in references/methods. A provenance.lock.json maps every adapted file to source repository, full commit, source path, original tree SHA-256, license file/hash, destination SHA-256, adaptation description, reviewedAt and reviewer. Independent files are labeled original. Bundle notices and license texts under the skill. The enclosing bundled-component digest covers these files too; verify mappings and notice completeness before release. This does not replace the solution lock.

Current release root NOTICE only enumerates upstream components. Add a validated pointer for bundled components with internal provenance, preserving existing releases and verification behavior. Do not claim generated root NOTICE already covers adapted sources.

## Evaluation and release gates

Fixtures: static English/Vietnamese site; JS shell; conflicting robots/canonical; redirects and loops; locale aliases; valid/invalid schema; duplicated product/blog claims; stale documents; unavailable PDFs/transcripts; disconnected GSC; rate limits; blocked/private redirects; hostile page instructions; 1,200-item resumable inventory; partial crawl; changed snapshot; CSV/HTML injection; mixed-source duplicates.

Release gates: one discoverable SKILL.md per host, complete internal reference closure, all provenance hashes verified, no external installer/runtime downloads, deterministic critical fixture assertions all pass, evidence references resolve, no false complete status, 100% declared fixture items accounted for, zero fabricated metrics in curated host trials. Two hosts each run identical offline and public-site scenarios plus missing-data and resume scenarios. Independent AI review evaluates semantic precision/recall against a labeled set and records denominators, source evidence and reviewer identity separately from the author. The product owner reviews the consolidated residual-risk dossier before final release; no release based solely on checker success. This review route was explicitly selected by the owner on 2026-11-18; AI verdicts must never be labeled human verdicts. Proposed semantic acceptance: precision >=90%, recall >=80% on labeled material findings, 100% critical fixture findings. Treat thresholds as pilot targets, not claims of achieved accuracy.

Readiness work is not a promise of SEO uplift. Optional longitudinal experiments measure mentions/citations/accuracy separately from traffic and conversions, retaining prompt-set and engine versions. If no measured visibility is available, retain the complete readiness audit with visibility measurement explicitly unavailable.

## Official reference baseline

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.openai.com/api/docs/bots
- https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/

Refresh rule-specific primary guidance during source review. Search snippets and repository stars are discovery signals, not evidence of runtime capability or commercial readiness.

## Owner acceptance of the review-required offering — 2026-11-18

After receiving the final risk dossier, the owner stated “Ok phát hành chính thức”.
This accepts the proposed independently reviewed, assisted audit delivery as the
product scope. Independent review must precede customer reliance on claims, rule
applicability, recommendations, quotations, links and coverage. Keep original
outputs and attributed corrections. The reviewer may be a separate AI reviewer
or qualified person; this is a required delivery responsibility, not an
automatically installed reviewer or guard. Missing review leaves delivery pending.

The failed native reporting and historical declared-guard checks remain failed.
No precision/recall threshold is changed and no autonomous first-pass guarantee
is made. The research guard is not a shipped component. Browser/OCR limitations
remain partial/unsupported, and content changes require separate authorization.
The new release keeps the evaluated component unchanged and receives its own
manifest/version/archive. See [release contract](../releases/content-search-audit-0.2.0.md).
