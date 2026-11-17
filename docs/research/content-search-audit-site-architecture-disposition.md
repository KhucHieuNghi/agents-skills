# Corey site-architecture: local body review and audit disposition

Pin: `1f837447b20bb6f0e72d87b80ece1c221c362c7d`. Read the complete entrypoint,
four local references and eight eval scenarios. All six file hashes match the
existing source inventory; checkout revision, clean state and root MIT bytes were
reverified. [Receipt](content-search-audit-site-architecture-review.json) records
scope. No upstream eval, vendor integration or diagram renderer was executed.

## Decision

Keep **reference-only**. Inventory before redesign, explicit audience/task context,
page relationships, URL maps and separate navigation zones are useful comparisons.
Our single audit skill already represents inventory, source memberships, link evidence
and portfolio tasks. It proposes actions; it does not acquire authority to redesign,
redirect, publish, choose a CMS or invoke sibling skills from this comparison.

Do not copy its numerical layout/link heuristics or automatically treat every template
page as required. A proposed information hierarchy, an observed hyperlink graph,
a URL pathname and a search engine's selected canonical are different objects.
The report must label which is supported by supplied evidence.

## Reference findings and decisions

| Local source               | Useful material                                                                                         | Excluded or conditional material                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SKILL.md                   | Start from inventory, audience and current constraints; map navigation separately from contextual links | Three-click threshold, fixed header/column counts, internal-link density and every-page breadcrumb requirements do not establish defects by themselves.                                                       |
| navigation-patterns.md     | Explicit labels, current-location cues, context-specific sidebar/header/footer examples                 | No universal header-versus-footer ranking weights; breadcrumb/URL mismatch is not automatically wrong; inspect actual rendered links before rejecting JavaScript navigation.                                  |
| site-type-templates.md     | Six starting families distinguish documentation, commerce, marketing and local tasks                    | Template nodes, CTA placement and page priorities are examples, not evidence a customer lacks required pages or has the same business priorities.                                                             |
| mermaid-templates.md       | Diagrams can distinguish hierarchy, navigation zones and proposed changes                               | Drawn edges are not crawl evidence. Color semantics cannot authorize deletion. The hub example draws outbound hub links but does not by itself prove reciprocal links. No rendering compatibility was tested. |
| platforms-and-migration.md | Capture existing routes/metadata, verify migration mapping, preserve rollback-relevant observations     | No CMS recommendation, partner dependency, universal traffic-loss diagnosis, guaranteed migration outcome or automatic redirect of every retired URL. Vendor limits and integration claims remain unverified. |

The upstream advises checking current vendor plans and disclosing its partner
relationship. This review does not independently validate those plans or recommend
a purchase. The reference-only decision avoids bringing that operational dependency
into the customer's audit.

## Primary-source reconciliation

**Breadcrumbs.** Google recommends breadcrumb trails based on typical user paths,
which need not mirror URL structure. The upstream's repeated URL-matching rule is
therefore unsuitable as an unconditional audit failure. A page can have a useful
category trail despite a different route taxonomy. [Google breadcrumb guidance](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).

**Links.** Google describes crawlable anchors with href and explicitly includes
anchors dynamically inserted by JavaScript. It also states that there is no ideal
universal link count. Inspect the available markup, rendered capture and intended
reader journey; neither a script reference nor a low links-per-word ratio proves
a broken link graph. [Google link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

**URLs.** Readability is a useful preference, but query parameters have supported
syntax and can identify different content. Google treats path case as significant;
normalizing case is conditional on the server treating the variants equivalently.
Our inventory must preserve meaningful case and parameters rather than silently
collapse them to satisfy an aesthetic URL rule. [Google URL guidance](https://developers.google.com/search/docs/crawling-indexing/url-structure).

**Migrations.** Relevant replacement mapping differs from intentionally removed
content. Google's guidance covers 404/410 for content not carried forward and
permits multiple relevant old pages to map to genuinely consolidated content. It
warns against irrelevant mass redirects. A universal one-to-one redirect rule
cannot replace intent and destination verification. [Google migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

These checks reconcile specific claims; they do not certify every diagram, vendor
statement, accessibility pattern or ranking assertion in the upstream package.

## Evidence controls for the custom audit

These are original reasoning controls, not executed native fixtures:

- A page absent from a partial crawl's inbound-link list may have an incoming link
  on an uncaptured page. State the observed graph boundary before calling it orphaned.
- `/docs/api/client/retry` can be linked directly from the homepage. Four pathname
  segments do not imply four user clicks. Conversely, a short URL can be deeply
  buried in navigation.
- `/manual?version=1` and `/manual?version=2` may describe different supported versions.
  Removing the parameter can merge conflicting but valid content into a false defect.
- A category breadcrumb for `/shop/widget-pro` need not repeat the literal `shop`
  route segment. Verify audience meaning, destinations and markup independently.
- A retired page without a relevant replacement does not warrant a homepage
  redirect just to remove a recorded 404. Preserve owner intent and actual response.

Existing portfolio and technical methods already require scoped graph evidence and
separate proposed consolidation from observed problems. No new package wording is
added without an observed missing capability; these controls guide later evaluation.

## Eight upstream evals: scope of comparison

| Case                    | Audit interpretation                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1: new SaaS hierarchy   | Page families and deliverables are useful design examples; fixed click/nav counts are not proof of audit quality.               |
| 2: reorganize 50+ pages | Inventory-first is relevant; reorganization and redirects require separate implementation authority.                            |
| 3: URL structure debate | Compare audience/maintenance tradeoffs without declaring all longer or parameterized routes defective.                          |
| 4: 250 scaled pages     | Hub/task organization can help. The count alone does not establish crawl-budget pressure or value of creating those pages.      |
| 5: visual sitemap       | A diagram communicates a declared/proposed structure, not verified live discovery completeness.                                 |
| 6: XML sitemap problem  | Preserve technical evidence within our single entrypoint; do not route the customer to another skill.                           |
| 7: platform choice      | Outside default audit output. Vendor features, pricing, partner disclosures and migration costs need separate current research. |
| 8: migration            | Review mapping and captures as supplied; no promise of unchanged traffic or execution of launch steps.                          |

All eight were read, none run. They are not added to behavioral accuracy metrics.
The source inventory and selection table now distinguish this complete local review
from the earlier inventory-only entry. Five inherited sources and frozen candidate
0.1.29 remain unchanged. External dependencies and other research scopes remain open.
