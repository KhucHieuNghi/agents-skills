# Rule, source and fixture traceability — 0.1.12

Current follow-up: [0.1.22 source reconciliation](content-search-audit-source-reconciliation-0122.md). The chronology and earlier fixture-gap labels below are retained as historical evidence.

All 26 current rules are mapped below. All five selected upstream commits and full directory digests were rechecked against the lock; named headings exist in those pinned entrypoints. This records method influence, not verbatim derivation of each original rule. In particular, explicit contradiction handling and nonempty extraction are our diagnostics, not upstream or official search scoring rules.

This is local reconciliation of reviewed snapshots, not a new internet freshness review. MIT permission and artifact hashes do not prove method efficacy. Existing related cases do not establish a complete per-rule benchmark; every semanticAccepted flag remains false pending full acceptance. Source sections are selected anchors, not a claim that they alone establish the entire procedure.

[Machine-readable map and file hashes](content-search-audit-rule-traceability.json); [primary-source interpretation](content-search-audit-rule-source-review.md); [completion gates](content-search-audit-completion-audit.md).

## Immutable source anchors

- `corey-seo-audit`: commit `1f837447b20bb6f0e72d87b80ece1c221c362c7d`, selected tree `db64541f1cd5cd5d5b4ef10748887495f50669df548252d630f4ce3ea7bffd7a`, MIT; `skills/seo-audit/SKILL.md`.
- `corey-content-strategy`: commit `1f837447b20bb6f0e72d87b80ece1c221c362c7d`, selected tree `12ea84d3484d7ea8aa8d2ef34a7272e4df4358113e9502db58d5342019d99a44`, MIT; `skills/content-strategy/SKILL.md`.
- `profound-answer-accuracy`: commit `80293f156c27d3f90aedebfb3c27309769b2eec6`, selected tree `78f284f9452bdcee6b4a20bf47c1f1cee81742b5eb4a7832a220672ba7914b7b`, MIT; `profound/ai-answer-accuracy-auditor/SKILL.md`.
- `profound-prompt-portfolio`: commit `80293f156c27d3f90aedebfb3c27309769b2eec6`, selected tree `8edc768916733350ae2969513d825a392fafffb6d5f27d4e633457098f032446`, MIT; `profound/ai-prompt-portfolio-builder/SKILL.md`.
- `profound-aeo-operator`: commit `80293f156c27d3f90aedebfb3c27309769b2eec6`, selected tree `e5b4cb7f588757cc4716ac7e1b775fed3ed789efbeb0d446a253df5f892370eb`, MIT; `profound/aeo-operator-2026/SKILL.md`.

## quality-task-fit

**Internal method:** [references/methods/content-quality.md](../../skills/content-search-audit/references/methods/content-quality.md) — Procedure. Compare the content with the evidenced audience task; identify missing information needed to complete it.

**Upstream anchor:** [corey-seo-audit — Content Depth](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Bounded interpretation:** audit method with general primary-source context; local judgment criteria are not official scoring rules or proof of ranking effect. Unknown audience context prevents a confident fit judgment.

**Existing evidence:** [tests/content-audit-rules.test.ts](../../tests/content-audit-rules.test.ts).

**Expected fixture / gap:** MISSING dedicated audience task: concise sufficient answer versus missing prerequisite, same length; do not infer persona.

## quality-claims

**Internal method:** [references/methods/content-quality.md](../../skills/content-search-audit/references/methods/content-quality.md) — Procedure. Identify and verify material factual claims against dated authoritative sources, preserving unverifiable claims.

**Upstream anchor:** [profound-answer-accuracy — Workflow](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/ai-answer-accuracy-auditor/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Bounded interpretation:** audit method with general primary-source context; local judgment criteria are not official scoring rules or proof of ranking effect. No external corroboration is not proof of falsehood.

**Existing evidence:** [tests/fixtures/content-audit/semantic/targets/source-support.md](../../tests/fixtures/content-audit/semantic/targets/source-support.md).

**Expected fixture / gap:** EXISTING related case: contradicted price and market overreach; broader claim adjudication remains open.

## quality-freshness

**Internal method:** [references/methods/content-quality.md](../../skills/content-search-audit/references/methods/content-quality.md) — Procedure. Check version, market and date applicability of changing facts.

**Upstream anchor:** [profound-answer-accuracy — Workflow](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/ai-answer-accuracy-auditor/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Bounded interpretation:** audit method with general primary-source context; local judgment criteria are not official scoring rules or proof of ranking effect. Publication dates alone do not establish factual freshness.

**Existing evidence:** [tests/fixtures/content-audit/semantic/targets/data-age.md](../../tests/fixtures/content-audit/semantic/targets/data-age.md).

**Expected fixture / gap:** EXISTING related case: collection versus publication date; add current/historical compatible clean pair to complete benchmark.

## quality-accessible-media

**Internal method:** [references/methods/content-quality.md](../../skills/content-search-audit/references/methods/content-quality.md) — Procedure. Check useful text alternatives and supplied transcripts for informative media.

**Upstream anchor:** [corey-seo-audit — Image Optimization](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://www.w3.org/WAI/tutorials/images/decision-tree/); [Reference 2](https://www.w3.org/WAI/media/av/transcripts/).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. Decorative imagery may have empty alt; missing extraction remains unknown.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/09-media.md](../../tests/fixtures/content-audit/semantic-expanded/targets/09-media.md).

**Expected fixture / gap:** MISSING substantive media equivalence: informative, functional, decorative images and transcript missing visual information; existing unavailable-media case is not sufficient.

## quality-readable-text

**Internal method:** [references/methods/content-quality.md](../../skills/content-search-audit/references/methods/content-quality.md) — Procedure. Check whether the authorized extraction contains non-whitespace text.

**Upstream anchor:** Original collection diagnostic; no upstream derivation claimed.

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Bounded interpretation:** original collection diagnostic; linked guidance is context, not a quality threshold or ranking factor. A nonempty extraction does not establish quality or completeness.

**Existing evidence:** [tests/content-audit-rules.test.ts](../../tests/content-audit-rules.test.ts).

**Expected fixture / gap:** EXISTING deterministic cases: whitespace/nonempty and missing/conflicting evidence; nonempty does not prove quality.

## seo-response

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Check whether the captured final HTTP response is successful for a page intended to be publicly served.

**Upstream anchor:** [corey-seo-audit — Crawlability](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. This checks transport only, not index status, robots policy or rendered completeness.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/02-route.md](../../tests/fixtures/content-audit/semantic-expanded/targets/02-route.md).

**Expected fixture / gap:** EXISTING related redirect-loop case plus deterministic status tests; no invented final status or indexation.

## seo-index-controls

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Compare index and snippet directives with publisher intent and current engine guidance.

**Upstream anchor:** [corey-seo-audit — Indexation](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/crawling-indexing/block-indexing); [Reference 2](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. Raw source may not show rendered directives; access and indexing are separate.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/01-visibility.md](../../tests/fixtures/content-audit/semantic-expanded/targets/01-visibility.md).

**Expected fixture / gap:** EXISTING related case: noindex header conflicts with public intent despite index meta; do not claim observed deindexing.

## seo-canonical

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Compare canonical declarations, intended variants and observed targets; identify conflicts.

**Upstream anchor:** [corey-seo-audit — Canonicalization for Multilingual Sites](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. A declared canonical does not establish engine-selected canonical. Non-HTML resources can declare canonicals through HTTP Link headers; media type alone does not justify not-applicable.

**Existing evidence:** [docs/research/content-search-audit-trials/source-boundaries-016/dossier.txt](../../docs/research/content-search-audit-trials/source-boundaries-016/dossier.txt).

**Expected fixture / gap:** EXISTING bounded native dossier: correct text/plain Link, conflicting PDF Link, unknown missing headers/intent.

## seo-metadata

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Review titles, descriptions and headings for accurate task representation and misleading duplication.

**Upstream anchor:** [corey-seo-audit — Title Tags](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/appearance/title-link); [Reference 2](https://developers.google.com/search/docs/appearance/snippet).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. No fixed character count, keyword position or H1 count is a universal failure.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/06-render.md](../../tests/fixtures/content-audit/semantic-expanded/targets/06-render.md).

**Expected fixture / gap:** MISSING dedicated misleading-title case and valid long-title control; raw-render uncertainty control is related only.

## seo-internal-links

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Inspect internal discovery and verified broken targets in the declared graph.

**Upstream anchor:** [corey-seo-audit — Internal Linking](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. Incomplete discovery cannot prove a page is orphaned.

**Existing evidence:** [tests/content-audit-link-discovery.test.ts](../../tests/content-audit-link-discovery.test.ts).

**Expected fixture / gap:** MISSING semantic complete/partial graph orphan pair, misleading anchor and verified broken target; discovery tests alone do not prove judgment.

## seo-structured-data

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Compare extracted structured data with visible claims and current feature requirements.

**Upstream anchor:** [corey-seo-audit — Schema Markup Detection Limitation](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. Raw absence does not establish rendered absence; valid syntax is not guaranteed eligibility.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/03-offer.md](../../tests/fixtures/content-audit/semantic-expanded/targets/03-offer.md).

**Expected fixture / gap:** EXISTING visible-price/valid-JSON-LD contradiction; additional feature-specific schema boundaries still required.

## seo-locales

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Review actual locale variants, reciprocal relationships and content/canonical conflicts.

**Upstream anchor:** [corey-seo-audit — Hreflang](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/specialty/international/localized-versions).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. A faulty relationship must not be generalized to every locale.

**Existing evidence:** [tests/fixtures/content-audit/mixed-locale/gold/annotations.json](../../tests/fixtures/content-audit/mixed-locale/gold/annotations.json).

**Expected fixture / gap:** EXISTING labeled reciprocal-pair defect and regional/history controls; native report-fidelity errors remain.

## seo-rendering

**Internal method:** [references/methods/technical-seo.md](../../skills/content-search-audit/references/methods/technical-seo.md) — Procedure. Compare important source content with rendered output when scripts affect content.

**Upstream anchor:** [corey-seo-audit — Schema Markup Detection Limitation](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. An unavailable renderer produces unknown, not absent content.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/06-render.md](../../tests/fixtures/content-audit/semantic-expanded/targets/06-render.md).

**Expected fixture / gap:** MISSING complete supplied raw/rendered mismatch pair; existing raw shell must remain unknown without renderer.

## aio-crawler-policy

**Internal method:** [references/methods/ai-search-readiness.md](../../skills/content-search-audit/references/methods/ai-search-readiness.md) — Procedure. Evaluate the intended search/retrieval surface against current crawler controls.

**Upstream anchor:** [profound-aeo-operator — 1. Access and eligibility](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/aeo-operator-2026/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.openai.com/api/docs/bots); [Reference 2](https://developers.google.com/search/docs/appearance/ai-features).

**Bounded interpretation:** primary documentation for the named platform or accessibility topic; audit verdict and applicability require customer evidence. Training, search discovery and user-triggered retrieval are different purposes.

**Existing evidence:** [docs/research/content-search-audit-trials/source-boundaries-016/dossier.txt](../../docs/research/content-search-audit-trials/source-boundaries-016/dossier.txt).

**Expected fixture / gap:** EXISTING bounded search-allowed/training-blocked case; provider-policy breadth open; no inferred citation.

## aio-entity-consistency

**Internal method:** [references/methods/ai-search-readiness.md](../../skills/content-search-audit/references/methods/ai-search-readiness.md) — Procedure. Compare names, products, prices, versions and limitations across authoritative entity records.

**Upstream anchor:** [profound-aeo-operator — 4. Brand visibility and narrative](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/aeo-operator-2026/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/retieedra-profound/skills-marketing-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/aeo-operator-2026).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. Ambiguous entity identity is not proof of actual model confusion. Crawler documentation supports access policy, not entity consistency or a citation benefit.

**Existing evidence:** [tests/fixtures/content-audit/mixed-locale/gold/annotations.json](../../tests/fixtures/content-audit/mixed-locale/gold/annotations.json).

**Expected fixture / gap:** EXISTING same-market seat contradiction and legitimate regional/history variants.

## aio-retrievable-facts

**Internal method:** [references/methods/ai-search-readiness.md](../../skills/content-search-audit/references/methods/ai-search-readiness.md) — Procedure. Locate needed concrete facts and their context in readable captured content.

**Upstream anchor:** [profound-aeo-operator — 2. Retrieval fit](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/aeo-operator-2026/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/appearance/ai-features).

**Bounded interpretation:** audit method with general primary-source context; local judgment criteria are not official scoring rules or proof of ranking effect. Readable facts do not prove retrieval or citation by an engine.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/06-render.md](../../tests/fixtures/content-audit/semantic-expanded/targets/06-render.md).

**Expected fixture / gap:** MISSING dedicated task-required fact present/absent/unavailable trio; no claimed engine retrieval benefit.

## aeo-question-coverage

**Internal method:** [references/methods/answer-quality.md](../../skills/content-search-audit/references/methods/answer-quality.md) — Procedure. Map real questions to supported answers and identify missing conditions or tasks.

**Upstream anchor:** [profound-aeo-operator — 2. Retrieval fit](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/aeo-operator-2026/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Bounded interpretation:** audit method with general primary-source context; local judgment criteria are not official scoring rules or proof of ranking effect. Hypothetical questions must remain labeled as hypotheses.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/05-huong-dan.md](../../tests/fixtures/content-audit/semantic-expanded/targets/05-huong-dan.md).

**Expected fixture / gap:** MISSING explicit question-to-page matrix with unanswered and irrelevant-question controls; policy case alone is insufficient.

## aeo-answer-context

**Internal method:** [references/methods/answer-quality.md](../../skills/content-search-audit/references/methods/answer-quality.md) — Procedure. Check whether extracted answers retain definitions, prerequisites and limitations.

**Upstream anchor:** [profound-aeo-operator — 3. Citation readiness](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/aeo-operator-2026/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Bounded interpretation:** audit method with general primary-source context; local judgment criteria are not official scoring rules or proof of ranking effect. No universal answer word count is enforced.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/05-huong-dan.md](../../tests/fixtures/content-audit/semantic-expanded/targets/05-huong-dan.md).

**Expected fixture / gap:** EXISTING omitted membership and notice conditions; add concise complete clean control without word-count threshold.

## aeo-answer-evidence

**Internal method:** [references/methods/answer-quality.md](../../skills/content-search-audit/references/methods/answer-quality.md) — Procedure. Inspect source support and current applicability of material answer claims.

**Upstream anchor:** [profound-answer-accuracy — Workflow](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/ai-answer-accuracy-auditor/SKILL.md).

**Primary or attributed context:** [Reference 1](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Bounded interpretation:** audit method with general primary-source context; local judgment criteria are not official scoring rules or proof of ranking effect. Clear formatting does not establish factual accuracy.

**Existing evidence:** [tests/fixtures/content-audit/semantic/targets/source-support.md](../../tests/fixtures/content-audit/semantic/targets/source-support.md).

**Expected fixture / gap:** EXISTING wrong price and unsupported market; separate source support from attractive formatting.

## geo-observed-presence

**Internal method:** [references/methods/generative-visibility.md](../../skills/content-search-audit/references/methods/generative-visibility.md) — Measurement design and Analysis. Review captured response-level mentions and citations with explicit segment denominators.

**Upstream anchor:** [profound-aeo-operator — 4. Brand visibility and narrative](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/aeo-operator-2026/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/retieedra-profound/skills-marketing-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. Missing observations remain unknown; readiness cannot substitute for measurement.

**Existing evidence:** [tests/content-audit-measurement.test.ts](../../tests/content-audit-measurement.test.ts).

**Expected fixture / gap:** EXISTING response-level denominators and missing annotation cases; supplied-data results are not live visibility.

## geo-answer-accuracy

**Internal method:** [references/methods/generative-visibility.md](../../skills/content-search-audit/references/methods/generative-visibility.md) — Measurement design and Analysis. Adjudicate material AI response claims against dated evidence and disclose unknown verdicts.

**Upstream anchor:** [profound-answer-accuracy — Workflow](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/ai-answer-accuracy-auditor/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/retieedra-profound/skills-marketing-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. A negative but accurate statement is not an error.

**Existing evidence:** [tests/content-audit-answer-accuracy.test.ts](../../tests/content-audit-answer-accuracy.test.ts).

**Expected fixture / gap:** EXISTING correct/incorrect/unknown and incomplete inventory computation; independent annotation truth remains open.

## geo-cohort-validity

**Internal method:** [references/methods/generative-visibility.md](../../skills/content-search-audit/references/methods/generative-visibility.md) — Measurement design and Analysis. Check cohort version, prompt provenance, surface segmentation, repetitions and missing captures.

**Upstream anchor:** [profound-prompt-portfolio — Portfolio design](https://github.com/retieedra-profound/skills-marketing-library/blob/80293f156c27d3f90aedebfb3c27309769b2eec6/profound/ai-prompt-portfolio-builder/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/retieedra-profound/skills-marketing-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. One response does not establish a persistent visibility trend.

**Existing evidence:** [tests/fixtures/content-audit/semantic/targets/causal-drop.md](../../tests/fixtures/content-audit/semantic/targets/causal-drop.md).

**Expected fixture / gap:** EXISTING causal-overclaim case and segmentation tests; complete compatible/incompatible period benchmark missing.

## portfolio-task-gaps

**Internal method:** [references/methods/content-portfolio.md](../../skills/content-search-audit/references/methods/content-portfolio.md) — Procedure. Map audience tasks to the full declared inventory and distinguish evidenced gaps from speculative opportunities.

**Upstream anchor:** [corey-content-strategy — 2. Customer Research](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. Competitor coverage alone does not establish customer demand.

**Existing evidence:** [tests/content-audit-campaign-review.test.ts](../../tests/content-audit-campaign-review.test.ts).

**Expected fixture / gap:** MISSING labeled full-inventory task gap versus merely missing competitor topic; global receipt tests establish structure only.

## portfolio-duplication

**Internal method:** [references/methods/content-portfolio.md](../../skills/content-search-audit/references/methods/content-portfolio.md) — Procedure. Compare overlapping task coverage and preserve legitimate locale, audience and version variants.

**Upstream anchor:** [corey-content-strategy — Content Pillars and Topic Clusters](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. Keyword overlap alone is not cannibalization; consolidation is a proposal.

**Existing evidence:** [tests/fixtures/content-audit/mixed-locale/gold/annotations.json](../../tests/fixtures/content-audit/mixed-locale/gold/annotations.json).

**Expected fixture / gap:** MISSING positive redundant same-task case with preservation requirements; variant clean controls already exist.

## portfolio-contradictions

**Internal method:** [references/methods/content-portfolio.md](../../skills/content-search-audit/references/methods/content-portfolio.md) — Procedure. Identify conflicting material claims across content and resolve against authoritative records.

**Upstream anchor:** [corey-content-strategy — 3. Current State](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. Preserve date and market differences before calling claims contradictory.

**Existing evidence:** [tests/fixtures/content-audit/semantic-expanded/targets/04-policy.md](../../tests/fixtures/content-audit/semantic-expanded/targets/04-policy.md).

**Expected fixture / gap:** EXISTING conflicting current plan quantities without authority to choose truth; explicit contradiction procedure is our addition within adapted portfolio method.

## portfolio-journey-links

**Internal method:** [references/methods/content-portfolio.md](../../skills/content-search-audit/references/methods/content-portfolio.md) — Procedure. Check navigation between related tasks and the user next step.

**Upstream anchor:** [corey-content-strategy — Keyword Research by Buyer Stage](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Primary or attributed context:** [Reference 1](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content-strategy/SKILL.md).

**Bounded interpretation:** attributed audit method; upstream method is not an engine requirement or proof of ranking, retrieval or citation effect. Navigation preferences do not establish search ranking impact.

**Existing evidence:** [tests/content-audit-link-discovery.test.ts](../../tests/content-audit-link-discovery.test.ts).

**Expected fixture / gap:** MISSING labeled missing next-step link versus intentional standalone reference; graph structure does not prove journey quality.

## Implications for the plan

The requested source → rule → fixture mapping now exists for the complete current registry. It exposes missing dedicated semantic cases for task fit, media equivalence, metadata, graph/orphan judgment, supplied rendered comparison, task facts, question coverage, portfolio gaps, positive duplication and journey links. Common-cohort comparison and schema-feature breadth also remain open. Build labeled holdouts and keep their gold data separate from model-visible targets; do not substitute receipt validation for semantic evaluation.

This mapping does not close all alternative-candidate research, primary-source freshness at release, independent human review or commercial acceptance. No package bytes, source pins or frozen releases changed.
