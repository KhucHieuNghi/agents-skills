# Synthetic content export — Content Search Audit

## Audit status

Partial\. Run 64bfafcb\-8f1f\-4d2d\-90e7\-02e22c063443\. 0 findings\. Coverage is separate from whether content checks pass\. Structural validation does not establish semantic truth or search performance\.

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

No records.

## Finding interpretation

No findings were recorded\. This does not resolve unknown checks or demonstrate measured search visibility\.

## Dimension coverage

| Dimension | Supplied checks | Pass/fail assessed | Unknown | Not applicable |
| --- | --- | --- | --- | --- |
| aeo | 12 | 0 | 12 | 0 |
| aio | 12 | 0 | 12 | 0 |
| geo | 12 | 0 | 12 | 0 |
| portfolio | 16 | 0 | 16 | 0 |
| quality | 20 | 0 | 20 | 0 |
| seo | 32 | 0 | 32 | 0 |

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
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | pending | Collected; semantic review and applicable evidence remain pending | 26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | pending | Collected; semantic review and applicable evidence remain pending | 26 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | pending | Collected; semantic review and applicable evidence remain pending | 26 |
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
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-internal\-links | seo | unknown | Missing required evidence: link\-graph | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-locales | seo | unknown | Missing required evidence: locale\-map | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | seo\-rendering | seo | unknown | Missing required evidence: rendered\-dom | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
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
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | portfolio\-duplication | portfolio | unknown | Missing required evidence: inventory\-map | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | portfolio\-contradictions | portfolio | unknown | Missing required evidence: entity\-record, inventory\-map | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| 95ccaa6140d75bbe586150f03cf693c665245a28cc04c05e48c48787780ad942 | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: link\-graph, audience\-context | a6f6f761fc9991b9ab9905813d51bbb0565d71760ec4e0018806edec397eb7db |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-task\-fit | quality | unknown | Missing required evidence: audience\-context | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-claims | quality | unknown | Missing required evidence: claim\-sources | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-freshness | quality | unknown | Missing required evidence: claim\-sources | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-accessible\-media | quality | unknown | Missing required evidence: media\-inventory | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-metadata | seo | unknown | Missing required evidence: audience\-context | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-internal\-links | seo | unknown | Missing required evidence: link\-graph | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-locales | seo | unknown | Missing required evidence: locale\-map | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | seo\-rendering | seo | unknown | Missing required evidence: rendered\-dom | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aio\-entity\-consistency | aio | unknown | Missing required evidence: entity\-record | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aio\-retrievable\-facts | aio | unknown | Missing required evidence: audience\-context | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: claim\-sources | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-duplication | portfolio | unknown | Missing required evidence: inventory\-map | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-contradictions | portfolio | unknown | Missing required evidence: entity\-record, inventory\-map | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| b1e8043a3d8b535686e0a75a5bce5f24a1f76c36fa525c6d9422b96b01afd9ec | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: link\-graph, audience\-context | 265c92b3601e72e9a657b8e01c2527a0b06d54ba05873b28a4f77344a7dd7f26 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-task\-fit | quality | unknown | Missing required evidence: audience\-context | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-claims | quality | unknown | Missing required evidence: claim\-sources | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-freshness | quality | unknown | Missing required evidence: claim\-sources | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-accessible\-media | quality | unknown | Missing required evidence: media\-inventory | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-metadata | seo | unknown | Missing required evidence: audience\-context | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-internal\-links | seo | unknown | Missing required evidence: link\-graph | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-locales | seo | unknown | Missing required evidence: locale\-map | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | seo\-rendering | seo | unknown | Missing required evidence: rendered\-dom | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aio\-entity\-consistency | aio | unknown | Missing required evidence: entity\-record | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aio\-retrievable\-facts | aio | unknown | Missing required evidence: audience\-context | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: claim\-sources | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-duplication | portfolio | unknown | Missing required evidence: inventory\-map | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-contradictions | portfolio | unknown | Missing required evidence: entity\-record, inventory\-map | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
| bf9dfc0107110f1931de62704bc98083ad2fc166dcfd400a4df1eaa1ff44c5ad | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: link\-graph, audience\-context | f56a28a8c345580991bbf4e8e63689b0d2b4fbbfdda9ecd3aace2a4f69591374 |
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
