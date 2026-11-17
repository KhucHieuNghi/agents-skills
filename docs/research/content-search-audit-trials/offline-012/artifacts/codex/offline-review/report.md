# Synthetic content export — Content Search Audit

## Audit status

Partial\. Run 9b303f0e\-e357\-4259\-9751\-c087a95c230f\. 2 findings\. Coverage is separate from whether content checks pass\. Structural validation does not establish semantic truth or search performance\.

## Coverage

| Metric | Count |
| --- | --- |
| Declared items | 4 |
| In scope | 4 |
| Audited | 0 |
| Accounted | 1 |
| Excluded | 0 |
| Blocked | 0 |
| Failed | 0 |
| Unsupported | 1 |
| Pending | 3 |
| Missing checks | 0 |
| Remaining queue | 0 |

## Coverage denominator

All declared inventory items; exclusions remain counted and explained\. Dimension totals count supplied checks, not missing checks\.

## Scope limitations

Required item checks remain unresolved

## Priority backlog

| ID | Finding | Rules | Dimensions | Severity | Confidence | Classification | Items | Action | Verification | Owner | Effort | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F\-01 | pricing\.md lines 6 and 9 conflict on US monthly price and storage | quality\-task\-fit, quality\-claims, aio\-entity\-consistency, aio\-retrievable\-facts, aeo\-answer\-evidence | quality, aio, aeo | high | high | observed | b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | Replace the customer draft with the supplied US monthly terms effective 2026\-10\-01 \($29 before applicable taxes and 100 GB\)\. Leave other markets and annual terms unspecified pending policy evidence\. | Compare the revised draft and any reuse of its claims with the dated policy\. Check price, tax qualifier, billing period, market and storage cap\. | Pricing editor and policy owner | Small after policy confirmation | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-claim\-sources, pricing\.md\-entity\-record |
| F\-02 | app\.html line 1 supplies an empty body mount and references a module outside the export | seo\-rendering, aio\-retrievable\-facts, quality\-readable\-text | seo, aio, quality | medium | high | observed | 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | Obtain an owner\-supplied rendered DOM or route capture and expected page task\. If the route is intended for public discovery and that capture confirms the content gap, expose essential task content in readable initial markup\. | Compare initial and rendered main content, headings and links against the intended route\. The raw file has the title Example app, an empty root div and a module reference to /app\.js\. | Frontend owner | Capture first, implementation depends on results | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |

## Dimension coverage

| Dimension | Supplied checks | Pass/fail assessed | Unknown | Not applicable |
| --- | --- | --- | --- | --- |
| aeo | 12 | 1 | 11 | 0 |
| aio | 12 | 3 | 9 | 0 |
| geo | 12 | 0 | 12 | 0 |
| portfolio | 16 | 0 | 16 | 0 |
| quality | 20 | 3 | 15 | 2 |
| seo | 32 | 1 | 29 | 2 |

## Visibility measurements unavailable

No AI response observations supplied\. Readiness findings are not measured mentions, citations, rankings or business outcomes\. Supply a versioned prompt cohort and dated, surface\-specific responses to establish a baseline\.

## Search Console measurements unavailable

No Search Console export supplied\. Missing measurements are unknown, not zero\. Audit completion does not imply measured search performance\.

## Analytics measurements unavailable

No GA4 export supplied\. Missing analytics is unknown, not zero; content readiness does not establish traffic or revenue\.

## Bing measurements unavailable

No Bing traffic or AI dashboard export supplied\. Missing observations are unknown, not zero\.

## Server-log measurements unavailable

No normalized server\-log export supplied\. Crawl/access observations remain unavailable\.

## Inventory appendix

| Item | State | Reason | Required checks |
| --- | --- | --- | --- |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | pending | Snapshot review incomplete | 26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | pending | Snapshot review incomplete | 26 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | pending | Snapshot review incomplete | 26 |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | unsupported | Content requires an explicitly supplied extraction adapter or text transcript | 26 |

## Checks appendix

| Item | Rule | Dimension | Status | Reason | Evidence |
| --- | --- | --- | --- | --- | --- |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | quality\-task\-fit | quality | unknown | Missing required evidence: audience\-context | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | quality\-claims | quality | unknown | Missing required evidence: claim\-sources | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | quality\-freshness | quality | unknown | Missing required evidence: claim\-sources | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | quality\-accessible\-media | quality | unknown | Missing required evidence: media\-inventory | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-metadata | seo | unknown | Missing required evidence: audience\-context | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-internal\-links | seo | unknown | No navigational edge is visible in the three available raw files\. The /app\.js reference is an asset\. PDF and rendered links are unavailable, so broken links and orphan status are unresolved\. | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db, app\.html\-link\-graph |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-locales | seo | unknown | English and Vietnamese are represented\. No equivalent translation pair or live locale configuration is established\. | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db, app\.html\-inventory\-map |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-rendering | seo | unknown | Only raw line 1 is captured\. Empty root and /app\.js reference are observed\. Rendered DOM and route intent are missing\. | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | aio\-entity\-consistency | aio | unknown | Missing required evidence: entity\-record | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | aio\-retrievable\-facts | aio | unknown | Missing required evidence: audience\-context | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: claim\-sources | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | portfolio\-duplication | portfolio | unknown | Pricing and the Vietnamese CSV guide serve distinct tasks\. Shell and PDF semantics are unavailable, so duplication remains unresolved\. | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db, app\.html\-inventory\-map |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | portfolio\-contradictions | portfolio | unknown | No contradictory statement was found between the readable files\. The confirmed pricing conflict is internal to pricing\.md\. Rendered app and PDF claims are unavailable\. | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db, app\.html\-inventory\-map |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | portfolio\-journey\-links | portfolio | unknown | No cross\-file navigation is visible in readable raw snapshots\. The expected relationships and links in the app and PDF require additional evidence\. | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db, app\.html\-inventory\-map, app\.html\-link\-graph |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-task\-fit | quality | fail | The customer draft gives an incompatible price and allowance for US monthly evaluation\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-audience\-context |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-claims | quality | fail | The US portion of the worldwide $19 claim conflicts with the supplied $29 before\-tax monthly price\. Unlimited conflicts with 100 GB\. Other markets and annual terms are unsupported\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-claim\-sources |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-freshness | quality | unknown | The supplied policy has an effective date of 2026\-10\-01\. The draft is undated and no supersession history was supplied\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-claim\-sources |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-accessible\-media | quality | not\-applicable | The supplied Markdown contains headings and prose only, with no informative media instances\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-metadata | seo | unknown | Missing required evidence: audience\-context | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-internal\-links | seo | unknown | No navigational edge is visible in the three available raw files\. The /app\.js reference is an asset\. PDF and rendered links are unavailable, so broken links and orphan status are unresolved\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-link\-graph |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-locales | seo | unknown | English and Vietnamese are represented\. No equivalent translation pair or live locale configuration is established\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-inventory\-map |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-rendering | seo | not\-applicable | This item is a Markdown source document without script\-dependent content\. Any published template requires separate evidence\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aio\-entity\-consistency | aio | fail | Two passages give incompatible price and allowance facts for the same plan in the US monthly context\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-entity\-record |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aio\-retrievable\-facts | aio | fail | The readable export exposes two incompatible candidate answers to the same plan question\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-audience\-context, pricing\.md\-entity\-record |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aeo\-answer\-evidence | aeo | fail | A direct answer drawn from the customer draft would conflict with the supplied policy on US monthly price and storage\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-claim\-sources |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-duplication | portfolio | unknown | Pricing and the Vietnamese CSV guide serve distinct tasks\. Shell and PDF semantics are unavailable, so duplication remains unresolved\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-inventory\-map |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-contradictions | portfolio | unknown | No contradictory statement was found between the readable files\. The confirmed pricing conflict is internal to pricing\.md\. Rendered app and PDF claims are unavailable\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-inventory\-map |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-journey\-links | portfolio | unknown | No cross\-file navigation is visible in readable raw snapshots\. The expected relationships and links in the app and PDF require additional evidence\. | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26, pricing\.md\-inventory\-map, pricing\.md\-link\-graph |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-task\-fit | quality | pass | The guide gives sign\-in, navigation, export and download steps, limits the export to the current account, and explains the attachment workaround and processing\-time caveat\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-audience\-context |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-claims | quality | unknown | Missing required evidence: claim\-sources | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-freshness | quality | unknown | Missing required evidence: claim\-sources | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-accessible\-media | quality | not\-applicable | The supplied Markdown contains headings and prose only, with no informative media instances\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-metadata | seo | pass | The Markdown title and section headings accurately describe the export task\. Published HTML title and description are outside this local check\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-audience\-context |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-internal\-links | seo | unknown | No navigational edge is visible in the three available raw files\. The /app\.js reference is an asset\. PDF and rendered links are unavailable, so broken links and orphan status are unresolved\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-link\-graph |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-locales | seo | unknown | English and Vietnamese are represented\. No equivalent translation pair or live locale configuration is established\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-inventory\-map |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-rendering | seo | not\-applicable | This item is a Markdown source document without script\-dependent content\. Any published template requires separate evidence\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aio\-entity\-consistency | aio | unknown | Missing required evidence: entity\-record | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aio\-retrievable\-facts | aio | pass | Readable source presents ordered steps, current\-account scope, attachment limitation, manual workaround and no processing\-time guarantee\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-audience\-context |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: claim\-sources | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-duplication | portfolio | unknown | Pricing and the Vietnamese CSV guide serve distinct tasks\. Shell and PDF semantics are unavailable, so duplication remains unresolved\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-inventory\-map |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-contradictions | portfolio | unknown | No contradictory statement was found between the readable files\. The confirmed pricing conflict is internal to pricing\.md\. Rendered app and PDF claims are unavailable\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-inventory\-map |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-journey\-links | portfolio | unknown | No cross\-file navigation is visible in readable raw snapshots\. The expected relationships and links in the app and PDF require additional evidence\. | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374, huong\-dan\.md\-inventory\-map, huong\-dan\.md\-link\-graph |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | quality\-task\-fit | quality | unknown | Missing required evidence: content, audience\-context |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | quality\-claims | quality | unknown | Missing required evidence: content, claim\-sources |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | quality\-freshness | quality | unknown | Missing required evidence: content, claim\-sources |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | quality\-accessible\-media | quality | unknown | Missing required evidence: content, media\-inventory |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-index\-controls | seo | unknown | Missing required evidence: content, http\-response, publisher\-intent |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-canonical | seo | unknown | Missing required evidence: content, canonical\-targets |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-metadata | seo | unknown | Missing required evidence: content, audience\-context |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-internal\-links | seo | unknown | Missing required evidence: content, link\-graph |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-structured\-data | seo | unknown | Missing required evidence: content, schema\-extraction |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-locales | seo | unknown | Missing required evidence: content, locale\-map |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | seo\-rendering | seo | unknown | Missing required evidence: content, rendered\-dom |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | aio\-entity\-consistency | aio | unknown | Missing required evidence: content, entity\-record |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | aio\-retrievable\-facts | aio | unknown | Missing required evidence: content, audience\-context |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | aeo\-question\-coverage | aeo | unknown | Missing required evidence: content, question\-set |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | aeo\-answer\-context | aeo | unknown | Missing required evidence: content, question\-set |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: content, claim\-sources |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: content, inventory\-map, question\-set |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | portfolio\-duplication | portfolio | unknown | Missing required evidence: content, inventory\-map |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | portfolio\-contradictions | portfolio | unknown | Missing required evidence: content, entity\-record, inventory\-map |  |
| dfa8752cf34b1c9fd6cc4e161e48011fb5ac54332b6119441bf3828e81087bfc | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: content, link\-graph, audience\-context |  |

## Missing checks

No records.

## Evidence appendix

| Evidence | Item | Method | Collected | Artifact | Hash | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db | 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | local\-file | 2026\-11\-15T22:11:46\.530Z | [evidence/95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942\.txt](evidence/95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942.txt) | 87b31cebc13630ab95dd6bd378465ca78d3f5933628c2cad1d388c9707d837eb | Local export does not establish public reachability, index status or freshness of the live site; HTML is source text, not rendered DOM; target scripts were not executed |
| 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 | b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | local\-file | 2026\-11\-15T22:11:46\.533Z | [evidence/b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec\.txt](evidence/b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec.txt) | 2f710ca1124341446ad167dc5a345a47bd6f665c8f274fb06a242f304856f115 | Local export does not establish public reachability, index status or freshness of the live site; HTML is source text, not rendered DOM; target scripts were not executed |
| f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 | bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | local\-file | 2026\-11\-15T22:11:46\.533Z | [evidence/bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad\.txt](evidence/bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad.txt) | fc306a134843bd485c586d3eff790508ba92a6f79ad3d732def06defb08e6064 | Local export does not establish public reachability, index status or freshness of the live site; HTML is source text, not rendered DOM; target scripts were not executed |
| pricing\.md\-audience\-context | b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/pricing\.md\-audience\-context\.json](evidence/pricing.md-audience-context.json) | c2458189a968c3a740236f7b9083644fa12fa34c29736d1c72757e7bf05ce2f0 | Synthetic local snapshot scope only |
| pricing\.md\-claim\-sources | b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/pricing\.md\-claim\-sources\.json](evidence/pricing.md-claim-sources.json) | c75381edcfa88f5bd72c782c0a4114b91b433693a146286e665a4f08a570c484 | Synthetic local snapshot scope only |
| pricing\.md\-entity\-record | b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/pricing\.md\-entity\-record\.json](evidence/pricing.md-entity-record.json) | 65481c378058cc72d1700ff92a3dc610d54493fdb7c1c0790ce2ee0619c575af | Synthetic local snapshot scope only |
| huong\-dan\.md\-audience\-context | bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/huong\-dan\.md\-audience\-context\.json](evidence/huong-dan.md-audience-context.json) | ad316f574740d646f0c44a0056c46da3a200134c8c2d054d0a54288827d7021d | Synthetic local snapshot scope only |
| pricing\.md\-inventory\-map | b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/pricing\.md\-inventory\-map\.json](evidence/pricing.md-inventory-map.json) | ff46b154ed8f3f847c41cb14c58c271ceb9a8f104bb259b6c92d51a1f1928acf | Synthetic local snapshot scope only |
| pricing\.md\-link\-graph | b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/pricing\.md\-link\-graph\.json](evidence/pricing.md-link-graph.json) | 6b6feff2332c07848d35f2b90ab3aa7611f325624bbee7d31ae8d90cec4e9600 | Synthetic local snapshot scope only |
| huong\-dan\.md\-inventory\-map | bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/huong\-dan\.md\-inventory\-map\.json](evidence/huong-dan.md-inventory-map.json) | ff46b154ed8f3f847c41cb14c58c271ceb9a8f104bb259b6c92d51a1f1928acf | Synthetic local snapshot scope only |
| huong\-dan\.md\-link\-graph | bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/huong\-dan\.md\-link\-graph\.json](evidence/huong-dan.md-link-graph.json) | 6b6feff2332c07848d35f2b90ab3aa7611f325624bbee7d31ae8d90cec4e9600 | Synthetic local snapshot scope only |
| app\.html\-inventory\-map | 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/app\.html\-inventory\-map\.json](evidence/app.html-inventory-map.json) | ff46b154ed8f3f847c41cb14c58c271ceb9a8f104bb259b6c92d51a1f1928acf | Synthetic local snapshot scope only |
| app\.html\-link\-graph | 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | attributed offline editorial review | 2026\-11\-15T22:12:53\.597Z | [evidence/app\.html\-link\-graph\.json](evidence/app.html-link-graph.json) | 6b6feff2332c07848d35f2b90ab3aa7611f325624bbee7d31ae8d90cec4e9600 | Synthetic local snapshot scope only |

## Rule provenance

| Rule | Reviewed | Sources | Limitations |
| --- | --- | --- | --- |
| quality\-task\-fit | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | Unknown audience context prevents a confident fit judgment\. |
| quality\-claims | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | No external corroboration is not proof of falsehood\. |
| quality\-freshness | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | Publication dates alone do not establish factual freshness\. |
| quality\-accessible\-media | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | Decorative imagery may have empty alt; missing extraction remains unknown\. |
| quality\-readable\-text | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | A nonempty extraction does not establish quality or completeness\. |
| seo\-response | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | This checks transport only, not index status, robots policy or rendered completeness\. |
| seo\-index\-controls | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | Raw source may not show rendered directives; access and indexing are separate\. |
| seo\-canonical | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | A declared canonical does not establish engine\-selected canonical\. |
| seo\-metadata | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | No fixed character count, keyword position or H1 count is a universal failure\. |
| seo\-internal\-links | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | Incomplete discovery cannot prove a page is orphaned\. |
| seo\-structured\-data | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | Raw absence does not establish rendered absence; valid syntax is not guaranteed eligibility\. |
| seo\-locales | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | A faulty relationship must not be generalized to every locale\. |
| seo\-rendering | 2026\-11\-16 | https://developers\.google\.com/search/docs/appearance/ai\-features | An unavailable renderer produces unknown, not absent content\. |
| aio\-crawler\-policy | 2026\-11\-16 | https://developers\.openai\.com/api/docs/bots | Training, search discovery and user\-triggered retrieval are different purposes\. |
| aio\-entity\-consistency | 2026\-11\-16 | https://developers\.openai\.com/api/docs/bots | Ambiguous entity identity is not proof of actual model confusion\. |
| aio\-retrievable\-facts | 2026\-11\-16 | https://developers\.openai\.com/api/docs/bots | Readable facts do not prove retrieval or citation by an engine\. |
| aeo\-question\-coverage | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | Hypothetical questions must remain labeled as hypotheses\. |
| aeo\-answer\-context | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | No universal answer word count is enforced\. |
| aeo\-answer\-evidence | 2026\-11\-16 | https://developers\.google\.com/search/docs/fundamentals/creating\-helpful\-content | Clear formatting does not establish factual accuracy\. |
| geo\-observed\-presence | 2026\-11\-16 | https://github\.com/retieedra\-profound/skills\-marketing\-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6 | Missing observations remain unknown; readiness cannot substitute for measurement\. |
| geo\-answer\-accuracy | 2026\-11\-16 | https://github\.com/retieedra\-profound/skills\-marketing\-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6 | A negative but accurate statement is not an error\. |
| geo\-cohort\-validity | 2026\-11\-16 | https://github\.com/retieedra\-profound/skills\-marketing\-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6 | One response does not establish a persistent visibility trend\. |
| portfolio\-task\-gaps | 2026\-11\-16 | https://github\.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content\-strategy/SKILL\.md | Competitor coverage alone does not establish customer demand\. |
| portfolio\-duplication | 2026\-11\-16 | https://github\.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content\-strategy/SKILL\.md | Keyword overlap alone is not cannibalization; consolidation is a proposal\. |
| portfolio\-contradictions | 2026\-11\-16 | https://github\.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content\-strategy/SKILL\.md | Preserve date and market differences before calling claims contradictory\. |
| portfolio\-journey\-links | 2026\-11\-16 | https://github\.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/content\-strategy/SKILL\.md | Navigation preferences do not establish search ranking impact\. |

## Next steps

Resolve the listed scope, item and check gaps, refresh changed evidence, re\-run validation and regenerate reports\. Do not describe this run as a full audit until the completion gate passes\.
