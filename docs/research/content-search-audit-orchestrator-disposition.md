# AgriciDaniel and Zubair: orchestration disposition

Reviewed 2026-11-16 against the immutable revisions below. Both remain
**reference-only** for this customer bundle. Do not copy their orchestrators,
weighted scores, default scope limits or dependency installers into the custom
skill. The useful architecture patterns are comparison material; the existing
five selected source packages remain the inherited-method set.

## AgriciDaniel claude-seo

Pin: `468ed5b0d9e3249394783710e54abb02837e326b`.
Read the full [SEO audit entrypoint](https://github.com/AgriciDaniel/claude-seo/blob/468ed5b0d9e3249394783710e54abb02837e326b/skills/seo-audit/SKILL.md)
and shell launcher. Reinspected selected GEO and Python-runtime sections. This
is not complete review of the many agents, renderers, connectors, reports or
Shopify extension; none was installed or executed.

Useful distinctions in this snapshot include raw versus rendered capture,
field versus lab performance data, partial findings when a worker stops,
conditional API adapters and the explicit caution that a Google-update date
overlap does not establish causality. The GEO guidance explicitly labels its
weights heuristic and gives llms.txt no citation-ranking weight. Do not conflate
these qualifications with the substantially stronger Zubair claims below.

The general crawl limit is 500 pages. It explicitly has an exception for signed
Shopify storefronts using a separate uncapped sitemap workflow. Report that
exception accurately; do not characterize the whole product as invariably capped
at 500. Neither the general limit nor the exception proves complete inventory
coverage for our arbitrary repository/export/website inputs. Our own inventory,
queue, unsupported-item and resume contracts remain necessary.

The audit orchestrator emits a weighted SEO Health Score across seven categories.
That summary and its ranking-impact severity language are not our evidence model.
The customer needs attributable findings and an explicit completion denominator,
not a cross-dimension number that can hide unknowns. Category findings and action
plans can be compared without importing those score semantics.

The launcher selects a supported Python version and calls a separate runtime.
The inspected setup path creates a venv, installs requirements and can install
Chromium; the inspected run path uses that environment. These are material
installation dependencies, not code contained in one copied SKILL.md. This is a
reason to retain a separate adapter-evaluation boundary, not evidence of unsafe
behavior. Credentials, API integrations and browser sandbox behavior were not
verified in this pass.

The GEO entrypoint also contains many dated product/vendor assertions, some
explicitly unverified. For example, it describes a Search Console control named
Search generative AI and cites Google's AI-features page. The version of that
[official page opened in this review](https://developers.google.com/search/docs/appearance/ai-features)
does not document that control; it describes Googlebot and preview/index controls.
Therefore do not prescribe the named control from this upstream alone. This is
an unverified feature claim, not proof of absence from every account or rollout.

## Zubair geo-seo-claude

Pin: `989cae01e8ebbc42a9ec798eb9e7cb423f5ec89c`.
Read the full [GEO audit entrypoint](https://github.com/zubair-trabzada/geo-seo-claude/blob/989cae01e8ebbc42a9ec798eb9e7cb423f5ec89c/skills/geo-audit/SKILL.md)
and inspect relevant fetch/sitemap paths. The five delegated agent implementations were subsequently read completely in
[the specialist follow-up](content-search-audit-zubair-agent-disposition.md). Their
nested skill dependencies and the full runtime remain excluded and not cleared
for reuse.

Business-type intake and readable category reports are useful comparison ideas.
However, this workflow explicitly limits the audit to 50 pages, samples recent
blog posts, uses two-level link discovery when no sitemap is found, and skips
non-HTML content. Those choices can define a bounded sample audit; they cannot
satisfy our full declared inventory contract. PDFs, media and inaccessible items
must remain accounted for rather than disappear from the denominator.

The weighted GEO score is described as indicating citation likelihood, and the
entrypoint links optimization to numerical visibility uplift. No calibration for
that score or our customer population is established by this review. Exclude the
score-to-outcome interpretation and vendor/research percentages as forecasts.
A benchmark result is not a validation of an independently assembled checklist.

Its severity rules make absent structured data critical, missing llms.txt high,
and blocked training crawlers high. These do not supply sufficient evidence of
an AI-search defect. Google's official AI-feature guidance requires ordinary
Search eligibility, not special AI markup or files; OpenAI's documented search
and training preferences are separate. Keep feature-specific eligibility and
business crawler policy distinct. [Google AI requirements](https://developers.google.com/search/docs/appearance/ai-features),
[OpenAI crawler roles](https://developers.openai.com/api/docs/bots).

Static inspection of fetch_page shows an initial HTTP(S) scheme check followed
by automatic redirects and response.text parsing. The selected sitemap path
fetches child locations from XML and returns a capped URL list. The inspected
paths do not implement our resolved-address allowlist, bounded-body and pending
queue contract. This is a compatibility gap for direct import, not a demonstrated
exploit. No remote/private endpoint was probed and no dependencies were installed.

## Scope evidence and final selection effect

[Source receipt](content-search-audit-orchestrator-source-review.json) records
hashes, complete versus selected-file review scope, exact HEAD and clean checkouts.
Existing license records are retained in the earlier comparison snapshot; this
pass does not authorize code redistribution beyond the existing selected set.

For both families, keep the useful separation of collection, specialist assessment
and reporting as architectural comparison. Implement capabilities through our
own bounded collectors, immutable evidence, rule registry and explicit adapters.
Do not ask customers to invoke these upstream skills or silently install them.

This closes current-bundle selection decisions for the six comparison families,
not a full review of every repository or linked source. See the consolidated
[source selection ledger](content-search-audit-source-decisions.json). Selected
inherited packages still require their existing provenance/closure checks;
independent semantic acceptance and remaining implementation gates are unchanged.
