# AI search readiness

Adapted from Profound's aeo-operator-2026 diagnostic separation of access,
retrieval, citations, representation and outcomes. See [NOTICE](../../NOTICE.md).

## Procedure

1. Name the target surface and market: Google AI Overviews, AI Mode, ChatGPT
   Search or another specified product. Preserve surface differences; a general
   model answer and a search-enabled answer are different observations.
2. Inspect access evidence and publisher intent. Classify controls separately:
   search discovery, training crawlers, user-triggered retrieval and snippets.
   Never recommend allowing all bots by default.
3. Map the page's factual entities: product/company identity, supported tasks,
   current facts, limitations and source attribution. Compare related pages for
   factual conflicts and ambiguous version/market applicability.
4. Ask whether a user can retrieve and verify the needed facts from the captured
   text. Treat missing rendered evidence as a collection limitation. A clear
   format supports usability but is not proof of a citation advantage.
5. Check distinct evidence for each stage. Access permission cannot populate a
   retrieval result; a citation cannot populate a brand-mention result; a mention
   cannot populate a conversion result.
6. Route actual response observations through the visibility method. If absent,
   deliver readiness findings and a measurement plan explicitly marked unmeasured.

## Current official baseline

Reviewed 2026-11-16. Google states that its existing SEO practices apply to AI
Overviews and AI Mode; there is no additional special optimization requirement.
Do not prescribe an extra AI-specific file or schema as mandatory for inclusion.
[Google AI features](https://developers.google.com/search/docs/appearance/ai-features).

OpenAI documents separate purposes for OAI-SearchBot, GPTBot and ChatGPT-User.
Check their current behavior and publisher controls rather than treating them as
interchangeable. [OpenAI crawlers](https://developers.openai.com/api/docs/bots).

## Output and limits

A readiness finding names the exact missing/contradictory evidence, affected
surface and verification procedure. Do not forecast citations from readiness.
Recheck official sources when performing an audit because platform behavior can
change after this method's review date.
