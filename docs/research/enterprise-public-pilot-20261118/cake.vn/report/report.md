# cake.vn — Public audit pilot

Revision: cake.vn-pilot-r1 · 2026-11-18T15:42:53.159Z · customer

## Scope and decision summary

Report accounting: all declared checks are represented. Assessment coverage: 23.1%.

Site health: failed-checks-observed. Failed checks: 2. Unknown checks: 10. Implementation: proposed.

Independent review: pending (2/18 targets accepted). Review attribution is not proof of reviewer independence.

Measurements attached: 0 historical and 1 current. Historical results do not establish current performance.

## Module coverage

| Module | Declared checks | Pass | Fail | Unknown | N/A | Assessed | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| accessibility | 3 | 0 | 2 | 1 | 0 | 66.7% | partial |
| analytics | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| consent | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| content-search | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| optimization | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| performance | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| search-measurement | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| technical-seo | 2 | 1 | 0 | 1 | 0 | 50.0% | partial |
| tracking | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |
| ux-cro | 1 | 0 | 0 | 1 | 0 | 0.0% | partial |

## Declared scope and methods

Run: cake.vn-public-pilot-20261118. Inventory: sample. Operation: audit. Assessment time: 2026-11-18T15:38:20.607Z.

Planning stage: intake-only. Profiles: lead-generation.

| Entity | Type |
| --- | --- |
| public-site | site |

## Findings and business impact

| ID | Severity / confidence | Finding | Observed detail | Business impact | Recommendation | Verify | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAKE-01 | medium / high | CTA chữ trắng trên nền hồng chưa đủ tương phản | Axe ghi nhận CTA #heroes-37-primary-cta có tỷ lệ 3.30:1, chữ 14px thường, thấp hơn ngưỡng 4.5:1. Cùng mẫu màu xuất hiện trên các trang sản phẩm trong mẫu. Đây là lỗi hiển thị được kiểm tra, không phải bằng chứng mất doanh thu. | CTA chính khó đọc hơn với người có thị lực yếu. | Điều chỉnh màu nền/chữ CTA để đạt ít nhất 4.5:1 ở cỡ chữ hiện tại; áp dụng qua token dùng chung và kiểm tra hover/focus/disabled. | Chạy lại axe và kiểm tra computed color trên trang chủ, tài khoản, tiền gửi ở desktop/mobile; bảo đảm CTA vẫn dễ nhận biết. | cake.vn-public-evidence |
| CAKE-02 | medium / high | Bộ chọn ngôn ngữ thiếu tên truy cập hợp lệ | Desktop trang chủ: button role=combobox trỏ aria-labelledby tới locale-select không tồn tại trong DOM tái kiểm. Axe báo button-name. Có chữ VI trong nút, nhưng tham chiếu tên tác giả bị hỏng; cần xác minh với accessibility tree/screen reader sau sửa. | Người dùng screen reader khó xác định chức năng đổi ngôn ngữ. | Gắn nhãn Ngôn ngữ bằng label tồn tại hoặc aria-label; kiểm tra các nút đóng popup có cùng lỗi tên trong mẫu. | Screen reader đọc được tên và giá trị VI/EN, keyboard mở/chọn/đóng được; axe button-name không còn lỗi tại điều khiển này. | cake.vn-public-evidence |

## Assessment details

| Check | Module / entity | Status | Reason | Evidence |
| --- | --- | --- | --- | --- |
| 7c78efce2569da3b36275692f93fd04711bd9fc4a901ddc287762943d1eae99a | technical-seo / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| facb7f155be0e73ab9873ca90bf26bf642061baaf95282fb4398b39da8b3ffb5 | content-search / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| 028627a680bac78dd6eaf3eb5e79e54d5558be51e9dc1ad3fcf352f9d407ae24 | search-measurement / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| 0554dae831eea7b99139ace113fd3995c98e31fabcd0add5162976079e415543 | analytics / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| 85df08bc5c91331387f22c8f0c80359952b378015a14d7ee69293ce9eb055146 | tracking / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| f75575369a53a12cadbb15657366b81e143eb906788d0ed9d2c9728dd61f1238 | consent / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| 2f74ebe7c05ea9744c55968f8b2970b32eaf11475edd2eae862d316e615a1600 | performance / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| 0a2aa2317be60e2363e97ad7c606c4a03a15022e18086297f03b443044e1b796 | accessibility / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| 4341c80bbdfbc35e2514631599adeb3c62278f5b3670926b4dccea6f1b5659d1 | ux-cro / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| cac8da7985f615e943451f5c6fcb9da5854b62fb9603060ac75ce20621b2691e | optimization / public-site | unknown | Chưa đủ bằng chứng để kết luận toàn module; pilot chỉ bổ sung các check hẹp có tên bên dưới. Xem data requests và giới hạn. |  |
| 7b7c8255c66f82147a44d7cf60f28a33d6aa5d7ac186802404fd1191c1074682 | technical-seo / public-site | pass | Các URL được lấy mẫu trả HTTP 200, có title và meta description trong DOM. Không khẳng định indexability/indexing/ranking toàn website. | cake.vn-public-evidence |
| 5b18951777a537db680bcc16925838296966f4de9e417f71215565e201693929 | accessibility / public-site | fail | Axe ghi nhận CTA #heroes-37-primary-cta có tỷ lệ 3.30:1, chữ 14px thường, thấp hơn ngưỡng 4.5:1. Cùng mẫu màu xuất hiện trên các trang sản phẩm trong mẫu. Đây là lỗi hiển thị được kiểm tra, không phải bằng chứng mất doanh thu. | cake.vn-public-evidence |
| 1bc1309252e858d1f85cb15047a23b45406caff177c3581432cda441648900cc | accessibility / public-site | fail | Desktop trang chủ: button role=combobox trỏ aria-labelledby tới locale-select không tồn tại trong DOM tái kiểm. Axe báo button-name. Có chữ VI trong nút, nhưng tham chiếu tên tác giả bị hỏng; cần xác minh với accessibility tree/screen reader sau sửa. | cake.vn-public-evidence |

## What to provide next

Requests retain declined, invalid and expired states. A provided artifact does not automatically pass an assessment.

| Artifact / scope | Status / priority | Reason | Accepted formats | How to provide | Access | Owner role | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rendered-page / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá technical-seo. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | HTML, browser snapshot | Đã có capture công khai theo mẫu trong evidence.json. Cần phần bổ sung: template chưa lấy mẫu, tương tác và thiết bị thật; với performance cần field data và lab lặp lại độc lập. Provide rendered DOM plus URL, capture time, device and HTTP response; retain extraction failures. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Read-only scoped URL | Website owner | Supply repository templates and mark runtime checks pending. |
| content-sources / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá content-search. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | Markdown, JSON | Supply claims and their authoritative sources, intended audience and review dates. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Read-only approved material | Content owner | Assess only supplied claims; request domain review for unsupported material. |
| business-context / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá analytics, content-search, ux-cro. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, Markdown | Describe business outcomes, target audiences, markets, languages, journey steps and success definitions. For the selected business models, define and provide evidence for these outcomes: form-submit, accepted-lead, qualified-lead. Confirm which outcomes actually apply; profile labels are not business evidence. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | No account credentials | Business owner | Use a scoped interview; keep unconfirmed definitions unknown. |
| search-export / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá search-measurement. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, CSV | Export page/query data with property identity, date range, filters, timezone, pagination and source metadata. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Read-only GSC/Bing export | Search owner | Supply attributed dashboard observations with limitations; public crawling cannot prove index state. |
| ga4-report / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá analytics. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON | Supply GA4 runReport pages with property, query, dates, metric definitions, timezone, currency and pagination. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | GA4 read-only report or export | Analytics owner | Use supplied report export; keep account configuration and instrumentation checks separate. |
| gtm-container / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá tracking. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON | Export the GTM container version being tested; identify environment, tags, triggers, variables and version. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Container export without publish access | Analytics owner | Supply scoped configuration screenshots and browser traces; preserve unobserved dependencies. |
| tracking-trace / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá tracking. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, HAR | Capture action, dataLayer, tag/network observations, event identity and timestamps using approved test identities. Remove secrets/PII. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Scoped test browser session | Implementation owner | Provide a redacted trace export; leave unavailable links in the event chain unknown. |
| business-observations / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá tracking. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, CSV | Supply outcome status taxonomy, pseudonymous correlation keys, event times, window and source; include failures and unmatched records. For the selected business models, define and provide evidence for these outcomes: form-submit, accepted-lead, qualified-lead. Confirm which outcomes actually apply; profile labels are not business evidence. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Pseudonymized CRM/order/booking export | Business systems owner | Provide attributed manual observations; analytics events alone cannot confirm terminal outcomes. |
| consent-policy / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá consent. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, Markdown | Supply intended consent modes, regions, default state, updates/revocation and applicable tag behavior. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Approved policy document | Privacy policy owner | Record technical observations only; do not infer legal compliance. |
| consent-trace / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá consent. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON | Supply before/after traces for defaults, reject, accept, selective choices, revoke and persistence with region and mode. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Authorized browser test | Implementation owner | Provide manual Tag Assistant evidence with timestamps; mark untested scenarios pending. |
| performance-observations / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá performance. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON | Đã có capture công khai theo mẫu trong evidence.json. Cần phần bổ sung: template chưa lấy mẫu, tương tác và thiết bị thật; với performance cần field data và lab lặp lại độc lập. Supply field URL/origin/device/window and lab configuration/repeats separately; preserve no-data results. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Public lab or authorized RUM export | Performance owner | Run allowed lab captures; request RUM and do not substitute lab for field. |
| accessibility-observations / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá accessibility. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, Markdown | Đã có capture công khai theo mẫu trong evidence.json. Cần phần bổ sung: template chưa lấy mẫu, tương tác và thiết bị thật; với performance cần field data và lab lặp lại độc lập. Provide automated findings with tool versions plus manual keyboard/focus/error-recovery evidence and tested criteria. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Read-only inspection or approved test journey | Accessibility reviewer | Supply manual walkthrough evidence; do not infer conformance from an automated score. |
| journey-observations / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá ux-cro. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, Markdown | Đã có capture công khai theo mẫu trong evidence.json. Cần phần bổ sung: template chưa lấy mẫu, tương tác và thiết bị thật; với performance cần field data và lab lặp lại độc lập. Document each journey step, observed friction, device, failures and funnel/research provenance. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Approved test journey or supplied research | Product owner | Provide a recorded walkthrough; label heuristic advice as hypotheses. |
| optimization-scope / public-site | requested / high | Cần bổ sung để hoàn thiện đánh giá optimization. Public pilot không thay thế bằng chứng tài khoản/hành trình đầy đủ. | JSON, Markdown | Identify assets, environment, owners, authorized action classes, acceptance checks and rollback constraints. Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | Explicit change scope, no implicit deployment | Technical owner | Produce a recommendation backlog without applying changes. |

## Prioritized changes and verification

All actions here are proposals. Applying or publishing changes requires separate scoped authorization.

| ID | Findings | Status | Owner | Effort estimate | Change | Acceptance check | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-1 | CAKE-01 | proposed | Frontend / Design | Cần technical owner ước lượng sau khi xem source; chưa cam kết giờ hoặc ROI. | Điều chỉnh màu nền/chữ CTA để đạt ít nhất 4.5:1 ở cỡ chữ hiện tại; áp dụng qua token dùng chung và kiểm tra hover/focus/disabled. | Chạy lại axe và kiểm tra computed color trên trang chủ, tài khoản, tiền gửi ở desktop/mobile; bảo đảm CTA vẫn dễ nhận biết. |  |
| A-2 | CAKE-02 | proposed | Frontend / Design | Cần technical owner ước lượng sau khi xem source; chưa cam kết giờ hoặc ROI. | Gắn nhãn Ngôn ngữ bằng label tồn tại hoặc aria-label; kiểm tra các nút đóng popup có cùng lỗi tên trong mẫu. | Screen reader đọc được tên và giá trị VI/EN, keyboard mở/chọn/đóng được; axe button-name không còn lỗi tại điều khiển này. |  |

## Measurements and historical observations

| ID | Observation | Value | Unit / precision | Classification | Period | Scope | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O-pages | Số URL HTML được lấy mẫu | 4 | unique URLs / exact | current | 2026-11-18 to 2026-11-18 | Đếm URL mẫu đã mở, không phải toàn bộ sitemap hay số trang đã index. | cake.vn-public-evidence |

## Attributed analysis

Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.

| ID | Kind | Analysis | Evidence |
| --- | --- | --- | --- |
| N-1 | interpretation | Suy luận từ website: ngân hàng số, website giới thiệu sản phẩm và chuyển người dùng sang ứng dụng để mở tài khoản/thẻ/gửi tiết kiệm. Chưa xác minh funnel hoặc định nghĩa conversion với chủ sở hữu. | cake.vn-public-evidence |
| N-2 | limitation | Pilot trên mẫu trang công khai; chưa audit toàn bộ URL, tài khoản, thiết bị hay hành trình mua hàng. Không gửi form, đặt chỗ hoặc thanh toán. Mobile là viewport 390px trên desktop Chromium, không phải thiết bị thật. Axe là kiểm tra tự động, không chứng nhận WCAG. Sáu bước Tab chỉ kiểm tra focus ban đầu. Dữ liệu performance là một lần tải không throttle, các site chạy đồng thời; không dùng để chấm điểm hoặc kết luận Core Web Vitals. Không có dữ liệu ranking, indexing, AI citations, conversion hoặc revenue đã xác minh. | cake.vn-public-evidence |
| N-3 | limitation | Coverage trong report là số check của pilot + nhóm intake; không phải tỷ lệ URL đã audit, điểm SEO, WCAG hay điểm chất lượng của sản phẩm. Các profile là suy luận và cần chủ sở hữu xác nhận. | cake.vn-public-evidence |
| N-4 | observation | HTTP và metadata: bốn URL mẫu trả 200, có title và description. Homepage không có rel=canonical trong DOM; các trang con mẫu có. Đây là điểm cần rà canonical policy, chưa chứng minh duplicate indexing hoặc mất ranking. | cake.vn-public-evidence |
| N-5 | observation | Content/AEO/GEO: cần chủ nội dung xác nhận điều kiện, ngày hiệu lực và nguồn cho lãi suất/ưu đãi, giải thưởng, số khách hàng. Chưa kết luận bất kỳ thông tin tài chính nào sai. Không xem llms.txt hay JSON-LD là bằng chứng được AI trích dẫn. | cake.vn-public-evidence |
| N-6 | observation | Tracking: quan sát nhiều yêu cầu tải GTM và hai gtm.js events; chưa có container IDs/version và collector receipt để kết luận bắn trùng conversion. Cần kiểm tra mapping web → app, deep link và outcome mở tài khoản/thẻ. | cake.vn-public-evidence |
| N-7 | observation | Accessibility còn cần review: scrollable-region-focusable ở mobile và nút đóng popup tại trang con. Chưa gộp các cảnh báo chưa tái kiểm này thành finding riêng. | cake.vn-public-evidence |
| N-8 | recommendation | Cần GSC/Bing export theo page/query/device/country, property và bộ lọc, khoảng ngày; GA4 property, timezone/currency, key events và báo cáo theo landing page/source/device; GTM container version và event dictionary; consent policy theo vùng và trace default/reject/accept/selective/revoke; CrUX/RUM field data 28 ngày, hoặc phần field của PSI nếu có; lab của PSI lưu riêng; dữ liệu outcome đã pseudonymize từ hệ thống nghiệp vụ. Không gửi password/token. Mốc gợi ý 2026-10-21 đến 2026-11-17, xác nhận timezone trước khi đối chiếu. | cake.vn-public-evidence |
| N-9 | limitation | Không sửa hoặc deploy website. Actions là backlog đề xuất; còn thiếu scope thay đổi, staging, rollback và quyền của chủ website. Phiên public pilot không nghiệm thu enterprise release. | cake.vn-public-evidence |
| N-10 | observation | Nguồn phương pháp: https://developers.google.com/search/docs/appearance/ai-features ; https://developers.google.com/search/docs/fundamentals/creating-helpful-content ; https://web.dev/articles/vitals ; https://www.w3.org/WAI/test-evaluate/preliminary/ | cake.vn-public-evidence |

## Evidence index

Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.

| Evidence | Source | Observed | Valid until | Digest |
| --- | --- | --- | --- | --- |
| cake.vn-public-evidence | Customer evidence.json: sampled browser and robots/sitemap observations, not account evidence | 2026-11-18T15:38:20.607Z | 2026-11-19T15:38:20.607Z | 1ae7d5d97d4de7a0f46841c35133fcdf68e26fccafe53addf74ffabe441ec61e |

## Review decisions

| Target | Verdict | Reviewer / type | Time | Reason | Target digest |
| --- | --- | --- | --- | --- | --- |
| finding:CAKE-01 | accept | pilot-evidence-review / independent-ai | 2026-11-18T15:42:53.159Z | Axe và computed colors đồng nhất; CTA trong retest nằm ngoài viewport do carousel, không coi screenshot đó là bằng chứng hiển thị CTA. | 633b229be3ca8a79c2b04ef00d1032626ef794b2dff561f959b5de2fb91f706b |
| finding:CAKE-02 | accept | pilot-evidence-review / independent-ai | 2026-11-18T15:42:53.159Z | Thiếu target locale-select và axe xác nhận lỗi tên; VI là giá trị combobox. | ee046576827594423ac89a692bd6e27e584746a20108c956a3b89e41a179dba9 |

## Historical verdicts

Historical verdicts are excluded from current assessment counts.

| Check | Previous status | Previous reason | Invalidated | Reasons | Source run |
| --- | --- | --- | --- | --- | --- |

No entries recorded.

## Request response history

Responses are attributed statements, not proof of provider behavior.

| Request | Outcome | Actor | Time | Statement |
| --- | --- | --- | --- | --- |

No entries recorded.

## Methodology and limitations

Coverage concerns declared checks, not every possible website defect.

Historical measurements are retained separately from current observations.

Structural validation and attributed review do not independently authenticate provider data.

No raw evidence payloads are included; inspect the source run using its recorded digest.

Redaction requires review; pattern matching is not a guarantee that every confidential value was identified.
