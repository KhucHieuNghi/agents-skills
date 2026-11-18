# Enterprise website audit — nguồn và quyết định thiết kế

Ngày nghiên cứu: 2026-11-18. Phạm vi: mở rộng đa ngành, chưa triển khai. [Thiết kế](../specs/website-audit-enterprise.md) và [lộ trình](../plans/website-audit-enterprise.md) là đề xuất; không thay hồ sơ capability 0.2.0.

## Kết luận từ codebase

Có nền tảng để mở rộng một skill thay vì bắt đầu lại: `skills/content-search-audit/scripts/audit.mjs` điều phối; `scripts/lib/` có state/resume, evidence, coverage, review, report revisions và measurement importers. `schemas/check.schema.json` đã phân biệt unknown/N/A. `scripts/lib/report.mjs` có model dùng chung để render nhiều định dạng, nhưng chưa có enterprise report JSON và entity-aware module contract theo đề xuất mới.

[Scope reconciliation](../customer/website-audit-scope-reconciliation.md) dẫn tới source/tests tương ứng. GA4/GSC/Bing hiện chủ yếu là supplied-data import; đọc được export không chứng minh có quyền truy cập account, cấu hình đúng hoặc event chạy đúng. [Analytics disposition](content-search-audit-analytics-reference-disposition.md) ghi rõ upstream tracking mới ở reference-only.

## Nguồn chính thống → quyết định

| Nguồn                                                                                                                          | Điều dùng trong thiết kế                                | Hệ quả cho sản phẩm/test                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [GA4 Data API basics](https://developers.google.com/analytics/devguides/reporting/data/v1/basics)                              | Report có property, dimensions, metrics và window       | Lưu query/provenance/pagination; không coi report API là instrumentation audit              |
| [GTM API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)                                                    | Cấu hình container/workspace/version có API riêng       | Adapter config đọc tách khỏi publish; fixture version drift và quyền thiếu                  |
| [GA4 SPA](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)                           | Navigation ảo cần measurement phù hợp                   | Test history change, pageview thiếu/trùng, route và referrer                                |
| [Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events) | Có validation cho payload                               | Payload hợp lệ không chứng minh business action, delivery và ingestion cùng đúng            |
| [Consent setup](https://developers.google.com/tag-platform/security/guides/consent)                                            | Default/update và basic/advanced mode ảnh hưởng hành vi | Scenario tests theo policy; không đánh đồng request khi denied với lỗi                      |
| [Consent debugging](https://developers.google.com/tag-platform/security/guides/consent-debugging)                              | Debug timing/state/tag behavior                         | Thu evidence trước/sau tương tác; kiểm tra bốn consent types khi áp dụng                    |
| [GSC query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)                                            | API không bảo đảm toàn bộ rows                          | Top-row coverage phải có giới hạn; missing khác zero                                        |
| [GSC limits](https://developers.google.com/webmaster-tools/limits)                                                             | Có quotas cho endpoints                                 | Budget/rate-limit/retry/checkpoint; không false pass khi quota hết                          |
| [Bing Webmaster API](https://learn.microsoft.com/en-us/bingwebmaster/)                                                         | Provider có API/tài liệu riêng                          | Không suy tính năng dashboard nào cũng có endpoint; feature-detect và export fallback       |
| [Google AI features](https://developers.google.com/search/docs/appearance/ai-features)                                         | SEO nền tảng vẫn liên quan AI Search                    | Không hứa schema đặc biệt bảo đảm citation; observation tách readiness                      |
| [Web Vitals](https://web.dev/articles/vitals)                                                                                  | LCP, INP, CLS và phân vị field                          | Giữ metric/device/window; test URL vs origin, lab vs field, no-data                         |
| [PSI getting started](https://developers.google.com/speed/docs/insights/v5/get-started)                                        | Lighthouse/lab và hướng dẫn nguồn field                 | Không hard-code field chỉ từ PSI; adapter CrUX/RUM độc lập                                  |
| [W3C evaluation](https://www.w3.org/WAI/test-evaluate/)                                                                        | Tool đơn lẻ không xác định accessibility conformance    | Manual evidence/pending bắt buộc trong phạm vi conformance; không marketing bằng scan score |
| [Agent evaluation](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)                                        | Tách task/trial/outcome, dùng rubric phù hợp            | Holdout, repeat trials, ghi correction/review cost và giới hạn                              |

Các URL là nguồn phương pháp, không phải dependency runtime. Khi triển khai từng adapter phải xác minh lại endpoint/schema/scope/version trong tài liệu chính thống, lưu ngày kiểm tra và fixture; không đóng băng API assumptions chỉ dựa trên nghiên cứu hôm nay.

## Reuse, adaptation và phần tự xây

- **Reuse code NKSkills:** collectors và network guards, immutable evidence/run revisions, import GA4/GSC/Bing/logs, review, rendering, package/install. Cần regression trước khi mở rộng.
- **Giữ adaptation hiện có:** Corey SEO audit/content strategy và ba Profound skill trong provenance lock. Đây không phải bằng chứng năm nguồn đã bao phủ enterprise website audit.
- **Reference candidates:** analytics, schema, site architecture, CRO/performance/a11y methods cần review license/attribution/current guidance theo từng source trước khi copy. Không tự nâng mọi skill từng đọc thành bundled component.
- **Tự xây:** profile/module registry, typed entities, data-request/resume protocol, account capability adapters, tracking chain, consent scenarios, runtime modules, canonical report model, authorized remediation/retest và multi-industry evaluation suite.

Không dùng số lượng stars hay số skill làm bằng chứng chất lượng thương mại. Bằng chứng phải gắn với outcome, input class, phiên bản, host và denominator. Một upstream tốt có thể chỉ dùng làm reference; một module nội bộ chỉ được quảng bá khi có tests/trials của chính nó.

## Điểm cần xác nhận bằng pilot, không thể kết luận từ tài liệu

Khả năng truy cập account của từng khách; độ đầy đủ exports; khả năng trace hành trình trong browser host; thời gian chờ provider ingestion; chi phí token/runtime/review; độ chính xác trên ngôn ngữ/ngành ngoài gold fixtures; tỷ lệ khách thực sự cung cấp đủ dữ liệu; chất lượng hướng dẫn export; tác động kinh doanh sau remediation. Lộ trình phải đo các điểm này trước khi đưa SLA hoặc claim tự động hóa vào commercial landing.
