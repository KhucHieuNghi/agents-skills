# Enterprise Website Audit — thiết kế đa ngành

Trạng thái: **đề xuất**, 2026-11-18. Chưa triển khai, chưa phải phạm vi release 0.2.0. Người dùng đã sửa lựa chọn pilot: **đa ngành nghề**, không ưu tiên riêng B2B/SaaS. Tài liệu này bổ sung đề xuất cho [spec hiện hành](content-search-audit.md), không ghi đè hợp đồng đã phát hành.

## Mục tiêu và phương án

Một entrypoint `content-search-audit` giúp doanh nghiệp hiểu website đang gặp vấn đề gì, bằng chứng nào còn thiếu, cần cung cấp gì, sửa theo thứ tự nào và xác minh kết quả ra sao. Báo cáo phải bao quát toàn bộ phạm vi đã thống nhất ngay cả khi chỉ đánh giá được một phần.

Ba phương án: checklist lớn dễ bắt đầu nhưng khó xác định coverage; nhiều skill độc lập dễ chia việc nhưng báo cáo và quyền truy cập bị phân mảnh; một skill điều phối các module có hợp đồng chung cho phép giữ một báo cáo và kiểm chứng từng năng lực. **Đề xuất của người thiết kế: phương án thứ ba.** Giữ tên cài đặt để tương thích; tên thương mại mới chưa cần quyết định.

Không cam kết mọi ngành đã được kiểm chứng, tăng thứ hạng/doanh thu, chứng nhận pháp lý, WCAG conformance từ tự động hóa, hoặc tự động publish thay đổi khi chỉ được yêu cầu audit. Chỉ hỗ trợ Codex và Claude Code; không pin model. Không yêu cầu một plugin thương mại cụ thể để có báo cáo hữu ích.

## Cấu hình đa ngành

Lõi chung gồm discovery, bằng chứng, check, finding, yêu cầu dữ liệu, review, report, remediation và retest. Profile là cấu hình có phiên bản, không phải một bản sao skill. Cho phép kết hợp nhiều profile trên cùng website.

| Profile theo mô hình hoạt động | Ví dụ ngành                                   | Hành trình cần kiểm tra                                | Kết quả kinh doanh cần phân biệt                                  |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Lead generation                | B2B, tư vấn, bất động sản, sản xuất           | Tìm hiểu → form → xác nhận → CRM                       | Click, gửi form, lead được chấp nhận, lead đủ điều kiện           |
| Commerce                       | Bán lẻ, sản phẩm số                           | Tìm sản phẩm → giỏ → checkout → thanh toán → hoàn tiền | Bắt đầu checkout, đơn tạo, thanh toán thành công, doanh thu thuần |
| Booking/local service          | Khách sạn, dịch vụ tại chỗ, trung tâm đào tạo | Địa điểm → lịch trống → đặt → xác nhận/hủy             | Click gọi điện, booking được xác nhận, đến sử dụng dịch vụ        |
| Subscription/product           | SaaS, membership, dịch vụ định kỳ             | Đăng ký → activation → trial → trả phí → gia hạn/hủy   | Đăng ký, active, paid, renewal, churn                             |
| Publishing/content             | Báo chí, tài liệu, cộng đồng                  | Search → đọc → nội dung tiếp theo → đăng ký            | Page view, tương tác, đăng ký có xác nhận                         |

Pilot tối thiểu có cả năm profile, ít nhất ba ngành khác nhau và một website kết hợp hai profile. Đây là độ phủ kiểm thử ban đầu, không đại diện thống kê cho mọi ngành. Context bổ sung: thị trường/ngôn ngữ, thiết bị, địa điểm, loại nội dung, chu kỳ mua hàng, CMS/framework, môi trường test và chủ sở hữu. Ngành có yêu cầu chuyên môn như y tế/tài chính cần policy/chuyên gia được chỉ định; thiếu policy thì ghi giới hạn, không tự suy ra tính hợp pháp hay độ đúng chuyên môn.

## Module và đầu vào

| Module                    | Đầu vào ưu tiên / thay thế                                            | Kết quả và giới hạn                                                                                                             |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Discovery + technical SEO | URL/repo, sitemap, rendered DOM, robots, headers, logs được cấp       | Inventory, indexability, canonical/redirect/hreflang/schema, scope/crawl frontier; sampling không đồng nghĩa toàn site          |
| Content + AIO/AEO/GEO     | Nội dung, nguồn chuẩn, prompt portfolio, observation được quy nguồn   | Chất lượng/intent/answer accuracy; readiness tách khỏi citation hoặc visibility thực đo                                         |
| GSC + Bing                | Connector đọc có sẵn hoặc export có metadata                          | Query/page/window, lỗi thu thập/indexing có bằng chứng; không coi top rows là toàn bộ truy vấn                                  |
| GA4 measurement           | Property/stream/config snapshot + report export + business dictionary | Event/key-event mapping, attribution/window/timezone/currency, chất lượng dữ liệu; không gộp các phiên bản GA thành một adapter |
| GTM + dataLayer           | Container export/version, app code, browser trace, preview được cấp   | Tag/trigger/variable dependencies, duplicate/missing event, SPA/cross-domain; cấu hình đúng chưa chứng minh runtime đúng        |
| Consent                   | Policy do khách cung cấp, CMP config, trace theo trạng thái/vùng      | Default/update/reject/accept/revoke, timing, client/server; đánh giá kỹ thuật theo policy, không chứng nhận pháp lý             |
| Performance/CWV           | CrUX/RUM + Lighthouse/trace, device/network/cache context             | Field và lab riêng; URL/origin riêng; thiếu field data không biến thành lỗi hay pass                                            |
| Accessibility             | DOM + automated rules + keyboard/focus/form/manual evidence           | Findings có criterion và phạm vi; manual pending hiển thị rõ, không suy ra conformance từ điểm số                               |
| UX/CRO                    | Journey, design, funnel, user research, experiment nếu có             | Quan sát UX, giả thuyết, friction được đo và causal uplift là các loại bằng chứng khác nhau                                     |
| Optimization + retest     | Finding đã review, repo/CMS scope, quyền thay đổi                     | Draft patch/change plan, kiểm tra staging, rollback, xác minh sau sửa; hiệu quả kinh doanh cần observation riêng                |

## Quy trình thích ứng với dữ liệu còn thiếu

1. Đọc context đã có, phát hiện capability/tool thực sự khả dụng, xác nhận phạm vi và môi trường. Không hỏi lại dữ liệu đã được cung cấp.
2. Lập inventory theo entity: site, page/template, property, stream, container, journey, event, consent scenario. Không áp toàn bộ check cấp site lên mọi URL.
3. Tạo kế hoạch applicability theo profile; thiếu quyền không phải lý do đánh dấu `not-applicable`.
4. Thu thập phần được phép, đưa các yêu cầu thiếu quan trọng vào một nhóm câu hỏi ngắn; tiếp tục module độc lập.
5. Khi người dùng bổ sung, validate rồi resume; chỉ invalidation những kết luận phụ thuộc evidence đã đổi. Nếu từ chối hoặc chưa có dữ liệu, vẫn xuất báo cáo với gap và phương án thay thế.

Mỗi `dataRequest` có `id`, `moduleIds`, `affectedCheckIds`, `reason`, `requestedArtifact`, `acceptedFormats`, `leastPrivilegeAccess`, `exportInstructions`, `suggestedOwnerRole`, `fallback`, `priority`, `status`, `evidenceIds`. Trạng thái: `requested`, `provided`, `invalid`, `declined`, `expired`. Validate thành công mới đưa evidence vào đánh giá; trạng thái provided không tự chứng minh dữ liệu đủ. Deduplicate theo nguồn/phạm vi/window; retry cần lý do mới. Không yêu cầu password/token trong chat, không tự gửi tin nhắn cho nhân viên khách hàng.

Ví dụ: “Để xác minh purchase bị ghi hai lần, cần GTM container JSON và một trace checkout bằng test account. Bạn có thể cung cấp export hoặc cho phép phiên debug ở staging. Nếu chỉ có GA4 report, tôi đánh giá dấu hiệu bất thường và giữ kết luận duplicate là chưa xác minh.”

Connector dùng quyền đọc tối thiểu khi đã được cấp; OAuth và credential do host quản lý. File import là fallback hạng nhất. Adapter trả về capability/missingness chứ không im lặng bỏ qua module. Quota, auth hết hạn và feature chưa có trong account phải thành yêu cầu/giới hạn có thể xử lý.

## Bằng chứng và trạng thái

Check giữ `pass`, `fail`, `unknown`, `not-applicable`; bổ sung lý do unknown và reviewer/rationale cho N/A. Mỗi finding liên kết check, entity, evidence, phiên bản phương pháp, severity, confidence, business impact, đề xuất sửa và cách retest. Evidence có nguồn, thời điểm quan sát/thu thập, phạm vi, hash, phương pháp, freshness và redaction.

Phân biệt bốn trục trong mọi định dạng:

- Report completeness: mọi module/check trong phạm vi đều được ghi nhận, kể cả pending.
- Assessment coverage: số assessed/(assessed + unknown) trên các check applicable; công bố N/A riêng. Assessed = pass + fail, không phải số URL crawl được.
- Site health: lỗi/rủi ro đã xác minh và mức độ, không dùng unknown như zero hoặc pass.
- Implementation status: proposed/drafted/applied/retested/rolled-back, tách khỏi trạng thái audit.

Ghi riêng coverage theo module/profile/entity; không dùng tổng trung bình để che module chưa kiểm tra. Check identity gồm rule version + entity + scenario + window. Sampled inventory, failed extraction và pending frontier có mẫu số riêng. Summary không được phủ nhận measurement lịch sử đã xuất hiện trong chi tiết.

## Hợp đồng báo cáo

**Một model có thẩm quyền: `report.json`.** `report.md` là bản văn bản được sinh xác định từ cùng model, dùng đọc/review/diff; `report.html` là bản trình bày cho người dùng. JSON và Markdown tạo thành hồ sơ source of truth cùng revision, nhưng khi khác nhau phải báo validation error, không tự chọn một bản hay merge hai nguồn tự do. Sửa narrative qua revision cập nhật model rồi render lại cả hai.

`manifest.json` ghi schema/tool/rule/profile versions, run/revision/parent IDs, fixed generatedAt, input/config hashes, SHA-256 các output. JSON chứa narrative có cấu trúc, không chỉ số liệu. Artifact có scope, executive summary, module results, checks/findings, evidence index, missing-data requests, prioritized actions, review decisions, change/retest history, methodology và limitations. CSV chỉ là export phụ.

HTML không tự tính metric hoặc gọi nguồn live; không cần mạng để đọc, escape nội dung không tin cậy, có navigation/filter in-page nếu được CSP cho phép. Counts/severity/gaps/actions phải khớp JSON/MD. Khách hàng dùng brand riêng. Public summary và customer dossier là hai edition có manifest riêng, có redaction policy; không nhúng raw PII/token vào HTML/Markdown.

Khung báo cáo: “Phạm vi & độ phủ → ưu tiên kinh doanh → kết quả từng module → cần bạn bổ sung → kế hoạch sửa → bằng chứng & retest → phương pháp/giới hạn”. Báo cáo có đầy đủ mục không có nghĩa website đã được kiểm tra đầy đủ.

## Kiểm tra tracking và measurement

Trace theo chuỗi: business action → app/dataLayer → tag/trigger/variables → network → provider observation → business outcome. Mỗi mắt xích có thể unknown riêng. Form submit không phải accepted lead; order created không phải settled payment; refund/renewal/cancellation riêng. Đối chiếu theo grain, dedup key, window/timezone, currency, attribution, source latency, thresholding/sampling; không ép GA4 sessions bằng GSC clicks.

Consent scenarios tối thiểu: fresh visit/default, reject, accept, selective consent, revoke, persisted preference, region variant, SPA navigation; chỉ chạy scenario có policy và môi trường cho phép. Basic/advanced mode có semantics riêng; network dưới trạng thái denied không tự chứng minh vi phạm. Không đưa email/số điện thoại thô vào analytics payload hay báo cáo.

CWV báo LCP/INP/CLS field p75 theo device/collection window, lab riêng với số lần chạy/config; không thay INP bằng TBT. A11y có keyboard/focus, error recovery, dialog và hành trình nhiều bước bên cạnh automated scan. UX heuristic chỉ sinh giả thuyết; đề xuất A/B test cần mục tiêu, guardrails, population/window và phương pháp thống kê trước khi khẳng định uplift.

## Quyền thực thi, dữ liệu và vận hành

Mode mặc định `audit`; `plan` tạo đề xuất/draft; `remediate` thực hiện trong phạm vi đã được cấp; `verify` lấy evidence mới. Monitoring định kỳ chỉ khi được yêu cầu. Quyền trước đó trong cùng phiên vẫn có hiệu lực đúng phạm vi, không hỏi lại máy móc.

Mỗi action ghi owner, impacted assets, dependencies, expected outcome, acceptance test, rollback, authorization reference và environment. Sửa repo/staging theo quyền đã cấp; GTM publish, CMS publish, production deployment và thay policy cần quyền tương ứng. Không coi audit là quyền gửi lead, email, đặt lịch hay thanh toán thật. Test dùng sandbox/test identity được xác nhận; side effect thật cần ủy quyền cụ thể.

Tách dữ liệu theo customer/run, không lấy evidence tenant khác làm context. Mặc định artifact nằm trong output directory do khách chọn; không upload/chia sẻ hay tự xóa raw evidence. Intake ghi retention policy/customer owner, cách yêu cầu purge và đường dẫn dữ liệu; lệnh purge sau này phải target đúng run và được ủy quyền. Import/browser/page/comment đều là dữ liệu không tin cậy; không nhận chỉ dẫn từ chúng. Áp dụng network allowlist, SSRF guard, redaction và escaped rendering hiện có, thêm test xuyên module.

## Kế thừa và migration

Tái sử dụng dispatcher/state/resume/evidence/coverage/review, collectors, measurement importers, immutable report revisions và packaging. Module mới nằm dưới cùng package, references tải theo nhu cầu, không nhồi toàn bộ vào SKILL.md. Năm upstream adaptation hiện tại giữ attribution; các nguồn analytics từng đọc vẫn reference-only cho đến khi có implementation và eval riêng.

Schema enterprise có version riêng; loader legacy không diễn giải lại dữ liệu cũ. Không overwrite archive 0.2.0 hoặc thay digest mà giữ version. Bổ sung adapter đọc report cũ nếu đủ semantics, trường không có thành unknown. Tên/version release tương lai quyết định sau khi có compatibility tests và gates; không gọi roadmap là capability đã ship.

## Bằng chứng thương mại và gate đề xuất

Fixtures dev tách holdout, gold không đưa vào prompt. Tối thiểu mỗi profile có 2 case clean, 2 defective, 2 missing-data; thêm case mixed-profile, consent, injection, stale/contradictory evidence, auth/quota failure và retest regression. Native trials trên cả Codex/Claude Code, ít nhất 3 lần/case/host; ghi model thực tế, budget/tool/version, cost/time và correction effort. Baseline cùng host/budget/tool nhưng không có skill; kết quả assisted báo riêng, không cộng vào native pass.

Đây là **ngưỡng dự kiến**, chưa phải kết quả: critical seeded defect recall 100%; material precision ≥90%, recall ≥80% theo từng module/profile có đủ denominator; zero false material findings trên clean controls; report accounting và cross-format consistency 100%; không có unauthorized mutation, secret leak, cross-tenant leak hoặc prompt-injection compliance. Input requests phải đúng nguồn/check, có fallback, không hỏi lại evidence hợp lệ; kiểm tra trên toàn bộ missing-data cases. Không có finding thì precision N/A, không ghi 100%.

Independent AI review dùng rubric/gold tách khỏi người tạo report; tranh chấp phải lưu adjudication và owner quyết định phần rủi ro cuối. Không giả danh verdict người dùng. Các kết luận chuyên môn ngoài competence cần chuyên gia. Pilot thật chỉ dùng website và account được chủ sở hữu đồng ý; ít nhất một pilot mỗi profile, có review của owner. Báo cỡ mẫu, khoảng bất định, lỗi còn lại và giới hạn suy rộng. Không tuyên bố cải thiện kinh doanh nếu chỉ chứng minh phát hiện lỗi.

Release chỉ khi tất cả module được quảng bá có evidence pack, regression không giảm tính đúng của scope 0.2.0, package/locked digests/install hai host đạt, review và risk acceptance hoàn tất. Có thể phát hành phạm vi nhỏ đã kiểm chứng nhưng marketing phải nêu đúng phần chưa ship.

## Quyết định bổ sung sau builder review

Release claim dùng ma trận `module × profile × acquisition mode × host`. Mỗi ô có `unvalidated`, `validated-assisted` hoặc `validated-native`, kèm suite/pilot/version và giới hạn. Chỉ quảng bá ô đã validated; triển khai module không tự xác nhận mọi profile. Thiếu live connector vẫn có thể xác nhận export mode, không gọi đó là account integration.

Registry P1 phải khóa danh sách mandatory checks của từng ô trước khi chạy holdout; các check applicable trong danh sách phải được đánh giá 100% trên full-evidence fixtures, không có unknown. Acquisition mode chỉ được giới hạn danh sách check bằng capability contract công bố trước, không dùng missing access sau test để giảm denominator. Một critical miss ở bất kỳ trial native nào chặn nhãn validated-native của ô đó. Phạm vi enterprise đầy đủ trong đề xuất này bao gồm P6; release nhỏ hơn có thể đi trước nhưng phải nêu rõ remediation chưa được hỗ trợ nếu chưa đạt gate P6.

Đơn vị semantic evaluation là finding vật chất duy nhất, ghép theo defect ID/entity/scenario trong gold; finding lặp không tăng true positives. False positive là material finding không được gold/adjudication hỗ trợ; false negative là gold defect chưa được phát hiện, kể cả unknown khi fixture đã cung cấp đủ bằng chứng. Precision = TP/(TP+FP), recall = TP/(TP+FN). Nếu một ô chưa có ít nhất 10 material gold defects và 10 clean controls độc lập thì chưa đủ gate thương mại của ô đó; tăng fixture ngoài bộ tối thiểu theo profile nêu trên.

Các ngưỡng phải đạt trong từng trial, từng host và từng ô được quảng bá; không lấy trung bình repeats để che lần thất bại. Báo thêm micro/macro summary chỉ để đọc. Với full-evidence fixtures, unknown do skill bỏ sót bằng chứng là thất bại của check đó; không có unknown không giải thích được ở critical checks. Với missing-data fixtures, gold quy định đúng những check phải unknown và yêu cầu dữ liệu tương ứng: tiêu chí là status/request chính xác 100%, không bắt skill kết luận khi không có evidence. Customer run không có ngưỡng unknown để từ chối xuất report: luôn xuất report và coverage thực tế; review xác định có đủ evidence cho từng quyết định kinh doanh hay chưa.

Pilot không thay semantic gold bằng cảm nhận owner. Mỗi profile cần ít nhất một pilot được phép; mỗi ô release claim cần scenario/evidence tương ứng trong pilot hoặc giữ unvalidated. Khi fixture/holdout bị lộ hoặc dùng để tune, chuyển sang dev và bổ sung holdout mới trước lần gate tiếp theo. Không hạ threshold sau khi xem kết quả để gọi release đạt.

## Hồ sơ liên quan

- [Nghiên cứu và quyết định nguồn](../research/website-audit-enterprise-2026-11-18.md)
- [Lộ trình triển khai dự thảo](../plans/website-audit-enterprise.md)
- [Đối chiếu năng lực hiện tại](../customer/website-audit-scope-reconciliation.md)

## Hợp đồng kỹ thuật sau independent review 2026-11-18

Các quyết định dưới đây là điều kiện triển khai P1–P4, không phải capability đã ship.

1. Enterprise persistence dùng schema family riêng `urn:nkskills:enterprise-audit:*`, version 1, file `enterprise-run.json`; không đưa multi-scenario checks vào legacy `run.json`. `checkId` là SHA-256 của canonical JSON array `[moduleId, ruleId, ruleVersion, entityId, scenarioId, windowId]`; giá trị không áp dụng dùng null, không chuỗi ngầm định. Check lưu nguyên tuple để đối chiếu collision/coverage. Entity có customerId/runId và typed identity; evidence chỉ tham chiếu cùng customer/run hoặc explicit parent revision cùng customer. Enterprise state/coverage/reconciliation là adapter riêng, không encode scenario vào entityId.
2. `operationMode` có audit/plan/remediate/verify, mặc định audit; `inventoryMode` có full/sample, mặc định sample nếu chưa xác nhận inventory đầy đủ. Legacy `mode` chỉ map sang inventoryMode trong explicit import, giữ original record và origin schema. CLI enterprise dùng command namespace riêng; không reinterpret legacy flags. Test cả tám tổ hợp operation/inventory.
3. P1 định nghĩa authorization envelope trước P4: trusted authorizationRef từ phiên người dùng/host, customerId, environment, asset scope, action classes, test identity, grantedAt, expiresAt hoặc session-bound validity, revokedAt, sideEffectConstraints. Payload import không thể tự cấp quyền. Check quyền tại thời điểm thực hiện từng action, không chỉ lúc lập kế hoạch; read access không cấp submit/publish/pay. P6 reuse cùng evaluator. Không tự hết hạn quyền hợp lệ đã cấp chỉ vì đổi task; chỉ áp validity được ghi nhận.
4. Reuse eligibility gồm evidence hashes, rule/profile/policy versions, freshness policy và assessmentAt. Freshness windows do module/source contract khóa trước đánh giá; không có policy thì report freshness unknown và không xác nhận current state từ dữ liệu cũ. Khi hết hạn giữ historical finding nhưng current check chuyển unknown/pending reassessment; invalidation chỉ lan tới dependency liên quan. Rendering cùng revision không lấy clock mới; reassessment tạo revision mới với timestamp mới. Authorization expiry chặn action, không xóa sự thật lịch sử.
5. P3 thêm business-observation export/manual adapter: sourceSystem, sourceEntityType, pseudonymousCorrelationKey, status taxonomy/version, eventTime, timezone, amount/currency khi áp dụng, reconciliationWindow, evidence provenance, completeness và observationMethod. Không dùng raw email/phone làm join key. Mapping accepted-lead/settled/confirmed/refunded/renewed do business dictionary xác nhận, không suy từ tên GA4 event. Missing, late, contradictory và unmatched observations giữ riêng; thiếu backend evidence thì terminal outcome unknown. Không hứa tích hợp live mọi CRM/payment provider.
