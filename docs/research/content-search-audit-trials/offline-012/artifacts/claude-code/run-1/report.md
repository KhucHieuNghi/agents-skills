# Example — Content Search Audit

## Audit status

Partial\. Run 59eb6934\-2e69\-40a1\-8018\-602ac5e5de28\. 0 findings\. Coverage is separate from whether content checks pass\. Structural validation does not establish semantic truth or search performance\.

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
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | pending | Collected; semantic review and applicable evidence remain pending | 26 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | pending | Collected; semantic review and applicable evidence remain pending | 26 |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | unsupported | Content requires an explicitly supplied extraction adapter or text transcript | 26 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | pending | Collected; semantic review and applicable evidence remain pending | 26 |

## Checks appendix

| Item | Rule | Dimension | Status | Reason | Evidence |
| --- | --- | --- | --- | --- | --- |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | quality\-task\-fit | quality | unknown | Missing required evidence: audience\-context | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | quality\-claims | quality | unknown | Missing required evidence: claim\-sources | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | quality\-freshness | quality | unknown | Missing required evidence: claim\-sources | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | quality\-accessible\-media | quality | unknown | Missing required evidence: media\-inventory | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-metadata | seo | unknown | Missing required evidence: audience\-context | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-internal\-links | seo | unknown | Missing required evidence: link\-graph | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-locales | seo | unknown | Missing required evidence: locale\-map | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | seo\-rendering | seo | unknown | Missing required evidence: rendered\-dom | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | aio\-entity\-consistency | aio | unknown | Missing required evidence: entity\-record | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | aio\-retrievable\-facts | aio | unknown | Missing required evidence: audience\-context | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: claim\-sources | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | portfolio\-duplication | portfolio | unknown | Missing required evidence: inventory\-map | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | portfolio\-contradictions | portfolio | unknown | Missing required evidence: entity\-record, inventory\-map | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: link\-graph, audience\-context | 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | quality\-task\-fit | quality | unknown | Missing required evidence: audience\-context | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | quality\-claims | quality | unknown | Missing required evidence: claim\-sources | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | quality\-freshness | quality | unknown | Missing required evidence: claim\-sources | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | quality\-accessible\-media | quality | unknown | Missing required evidence: media\-inventory | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-metadata | seo | unknown | Missing required evidence: audience\-context | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-internal\-links | seo | unknown | Missing required evidence: link\-graph | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-locales | seo | unknown | Missing required evidence: locale\-map | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | seo\-rendering | seo | unknown | Missing required evidence: rendered\-dom | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | aio\-entity\-consistency | aio | unknown | Missing required evidence: entity\-record | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | aio\-retrievable\-facts | aio | unknown | Missing required evidence: audience\-context | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: claim\-sources | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | portfolio\-duplication | portfolio | unknown | Missing required evidence: inventory\-map | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | portfolio\-contradictions | portfolio | unknown | Missing required evidence: entity\-record, inventory\-map | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: link\-graph, audience\-context | a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | quality\-task\-fit | quality | unknown | Missing required evidence: content, audience\-context |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | quality\-claims | quality | unknown | Missing required evidence: content, claim\-sources |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | quality\-freshness | quality | unknown | Missing required evidence: content, claim\-sources |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | quality\-accessible\-media | quality | unknown | Missing required evidence: content, media\-inventory |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-index\-controls | seo | unknown | Missing required evidence: content, http\-response, publisher\-intent |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-canonical | seo | unknown | Missing required evidence: content, canonical\-targets |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-metadata | seo | unknown | Missing required evidence: content, audience\-context |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-internal\-links | seo | unknown | Missing required evidence: content, link\-graph |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-structured\-data | seo | unknown | Missing required evidence: content, schema\-extraction |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-locales | seo | unknown | Missing required evidence: content, locale\-map |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | seo\-rendering | seo | unknown | Missing required evidence: content, rendered\-dom |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | aio\-entity\-consistency | aio | unknown | Missing required evidence: content, entity\-record |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | aio\-retrievable\-facts | aio | unknown | Missing required evidence: content, audience\-context |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | aeo\-question\-coverage | aeo | unknown | Missing required evidence: content, question\-set |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | aeo\-answer\-context | aeo | unknown | Missing required evidence: content, question\-set |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: content, claim\-sources |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: content, inventory\-map, question\-set |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | portfolio\-duplication | portfolio | unknown | Missing required evidence: content, inventory\-map |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | portfolio\-contradictions | portfolio | unknown | Missing required evidence: content, entity\-record, inventory\-map |  |
| c42d8611a57dd6e883233be52a842fcac4cafb24067912261042c10cffd8ca6c | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: content, link\-graph, audience\-context |  |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | quality\-task\-fit | quality | unknown | Missing required evidence: audience\-context | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | quality\-claims | quality | unknown | Missing required evidence: claim\-sources | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | quality\-freshness | quality | unknown | Missing required evidence: claim\-sources | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | quality\-accessible\-media | quality | unknown | Missing required evidence: media\-inventory | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | quality\-readable\-text | quality | unknown | Missing required evidence: extracted\-text |  |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-response | seo | unknown | Missing required evidence: http\-response |  |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-index\-controls | seo | unknown | Missing required evidence: http\-response, publisher\-intent | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-canonical | seo | unknown | Missing required evidence: canonical\-targets | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-metadata | seo | unknown | Missing required evidence: audience\-context | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-internal\-links | seo | unknown | Missing required evidence: link\-graph | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-structured\-data | seo | unknown | Missing required evidence: schema\-extraction | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-locales | seo | unknown | Missing required evidence: locale\-map | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | seo\-rendering | seo | unknown | Missing required evidence: rendered\-dom | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | aio\-crawler\-policy | aio | unknown | Missing required evidence: crawler\-policy, publisher\-intent |  |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | aio\-entity\-consistency | aio | unknown | Missing required evidence: entity\-record | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | aio\-retrievable\-facts | aio | unknown | Missing required evidence: audience\-context | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | aeo\-question\-coverage | aeo | unknown | Missing required evidence: question\-set | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | aeo\-answer\-context | aeo | unknown | Missing required evidence: question\-set | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | aeo\-answer\-evidence | aeo | unknown | Missing required evidence: claim\-sources | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | geo\-observed\-presence | geo | unknown | Missing required evidence: ai\-observations |  |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | geo\-answer\-accuracy | geo | unknown | Missing required evidence: ai\-observations, claim\-sources |  |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | geo\-cohort\-validity | geo | unknown | Missing required evidence: ai\-observations, question\-set |  |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | portfolio\-task\-gaps | portfolio | unknown | Missing required evidence: inventory\-map, question\-set | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | portfolio\-duplication | portfolio | unknown | Missing required evidence: inventory\-map | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | portfolio\-contradictions | portfolio | unknown | Missing required evidence: entity\-record, inventory\-map | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |
| fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | portfolio\-journey\-links | portfolio | unknown | Missing required evidence: link\-graph, audience\-context | f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 |

## Missing checks

No records.

## Evidence appendix

| Evidence | Item | Method | Collected | Artifact | Hash | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| 82bf38ac2056ebccaa3844856dea8478e94a40932e4a79af63aba738b483b2b4 | 0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18 | local\-file | 2026\-11\-15T22:13:45\.884Z | [evidence/0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18\.txt](evidence/0de0df62cf4824b4449c870b390a3b0ee08ce295808fada1a643ddc9bfdcbb18.txt) | fc306a134843bd485c586d3eff790508ba92a6f79ad3d732def06defb08e6064 | Local export does not establish public reachability, index status or freshness of the live site; HTML is source text, not rendered DOM; target scripts were not executed |
| a49537723e5aa84fa41e97ac94aa64c310e0c8634d5a31cb4e974c6a67d4ac15 | 1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f | local\-file | 2026\-11\-15T22:13:45\.885Z | [evidence/1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f\.txt](evidence/1a9d1aaaab64bedd62671e40082d9c1778f58dc9d733348bb139de8f10efd02f.txt) | 87b31cebc13630ab95dd6bd378465ca78d3f5933628c2cad1d388c9707d837eb | Local export does not establish public reachability, index status or freshness of the live site; HTML is source text, not rendered DOM; target scripts were not executed |
| f825b6aecf6c1e1a5ad403df6e1969fce4ece5c1db39709a9bf4529c65b899e9 | fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5 | local\-file | 2026\-11\-15T22:13:45\.886Z | [evidence/fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5\.txt](evidence/fcd271afce4ab3416c75d0162bcbb5e520f2cee01ea73d6f215860aa4eb58ed5.txt) | 2f710ca1124341446ad167dc5a345a47bd6f665c8f274fb06a242f304856f115 | Local export does not establish public reachability, index status or freshness of the live site; HTML is source text, not rendered DOM; target scripts were not executed |

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
