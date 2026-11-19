# Pilot audit đa ngành — 18/11/2026

Đã audit công khai cả bốn website theo danh sách người dùng cung cấp. Kết quả này là **pilot có giới hạn**, không phải audit toàn bộ URL, chứng nhận WCAG, kiểm toán pháp lý hoặc nghiệm thu enterprise release. Không sửa website, gửi form, đặt chỗ, mua hàng hay deploy.

## Báo cáo khách hàng

**Bổ sung sau snapshot public:** đã tìm thấy kết nối GSC read-only cho QuokkaGuide và lấy Search Analytics cùng URL Inspection cho bốn URL mẫu. Phụ lục chứa dữ liệu tài khoản được giữ riêng tại `build/enterprise-pilot-20261118/quokkaguide-gsc/` (JSON, Markdown, HTML và manifest), không đưa vào hồ sơ public. Các dòng “thiếu GSC” bên dưới mô tả snapshot ban đầu; không còn áp dụng cho phần dữ liệu QuokkaGuide đã lấy. Bing và các nguồn chưa kết nối vẫn cần bổ sung. Báo cáo gốc và digest của chúng được giữ nguyên.

| Website | URL HTML mẫu | Capture desktop/mobile | Findings đã review | Report |
| --- | ---: | ---: | ---: | --- |
| Cake | 4 | 5 | 2 | [HTML](cake.vn/report/report.html) · [Markdown](cake.vn/report/report.md) · [JSON](cake.vn/report/report.json) · [Bằng chứng](cake.vn/evidence.json) |
| Infinity Racing | 2 | 3 | 2 | [HTML](infinity.racing/report/report.html) · [Markdown](infinity.racing/report/report.md) · [JSON](infinity.racing/report/report.json) · [Bằng chứng](infinity.racing/evidence.json) |
| QuokkaGuide | 4 | 5 | 2 | [HTML](quokkaguide.com/report/report.html) · [Markdown](quokkaguide.com/report/report.md) · [JSON](quokkaguide.com/report/report.json) · [Bằng chứng](quokkaguide.com/evidence.json) |
| VBA | 4 | 5 | 3 | [HTML](vba.vn/report/report.html) · [Markdown](vba.vn/report/report.md) · [JSON](vba.vn/report/report.json) · [Bằng chứng](vba.vn/evidence.json) |

JSON là nguồn dữ liệu chuẩn; Markdown và HTML được sinh xác định từ JSON. Manifest kiểm tra hash cả ba định dạng. `source-run` và `bundle.json` lưu đầu vào; `evidence.json` là bằng chứng đã giảm dữ liệu nhạy cảm, được liên kết bằng canonical digest trong report. Raw DOM, screenshot toàn trang, cookie/frame/network chi tiết nằm riêng trong thư mục build nội bộ, không đưa vào hồ sơ giao khách.

## Ưu tiên xử lý

1. **VBA:** kiểm tra vùng lịch trống tại `/fixtures`, tích hợp provider và fallback khi lỗi. Lặp lại trên trình duyệt người dùng trước khi quy nguyên nhân. Sửa tương phản CTA mua vé và tên truy cập nút newsletter mobile.
2. **QuokkaGuide:** thống nhất phạm vi/số lượng catalog (26 ở homepage, 20 ở listing không lọc); sửa token màu CTA và chữ nhỏ.
3. **Cake:** sửa tương phản CTA và nhãn bộ chọn ngôn ngữ. Rà tiếp tên nút đóng popup và vùng cuộn mobile; cảnh báo chưa tái kiểm chưa được tính thành finding mới.
4. **Infinity:** sửa carousel mobile có button focusable trong aria-hidden và tương phản chữ phụ. Bổ sung ngày/kỳ dữ liệu leaderboard và nguồn gốc cho tuyên bố định lượng; chưa kết luận dữ liệu giả.

Độ ưu tiên này dựa trên chức năng và bằng chứng public, chưa có traffic/revenue baseline để lượng hóa tác động kinh doanh. Không hứa tăng ranking, citation hay conversion.

## Phạm vi từng nhóm

| Nhóm | Đã làm | Cần tiếp tục |
| --- | --- | --- |
| Technical SEO | robots/sitemap; HTTP; rendered title, description, canonical, robots, hreflang, JSON-LD trên mẫu | Crawl các template còn lại, raw-vs-rendered, hreflang reciprocity, schema semantics, GSC URL Inspection |
| Content / AIO / AEO / GEO | Đối chiếu nội dung public, FAQ và các claim cụ thể | Nguồn chủ sở hữu, reviewer ngành, query/prompt panel theo thị trường, kiểm tra AI responses có attribution |
| GSC / Bing | Ghi nhận thiếu evidence tài khoản; không coi sitemap là index count | Export page/query/device/country, property, date/filter/pagination; AI observations nếu provider có và định nghĩa rõ |
| GA4 | Quan sát dấu hiệu tag public ở phạm vi capture | Property/streams/key events, report export, timezone/currency, thresholding/sampling, funnel definitions |
| GTM / dataLayer / conversion | Request host và tên event được ghi nhận, không coi là collector receipt | Container version, tag/trigger/variable mapping, debug trace, outcome cuối và dedup |
| Consent | Quokka: fresh default/reject/accept, lưu trạng thái consent | Policy theo vùng; cookie domain/timing, selective/revoke/persistence; các site còn lại chưa exercise matrix |
| Performance / CWV | Lưu lần tải lab sơ bộ, không chấm điểm; không cộng shift thành CLS | CrUX/RUM 28 ngày; PSI field nếu có, lab tách riêng; chạy lặp với cấu hình/network/CPU cố định; INP cần tương tác |
| Accessibility | Axe 4.14.1, DOM retest và focus targeted; sáu bước Tab ban đầu | Keyboard hành trình đầy đủ, screen reader, zoom/reflow, contrast trạng thái, form recovery; không coi zero axe là pass WCAG |
| UX/CRO | Quan sát discovery, CTA và vùng lịch; không hoàn tất giao dịch | Funnel/research, thiết bị thật, handoff app/call/ticket và outcome; thử nghiệm có thiết kế |
| Thực thi tối ưu | Backlog, owner role, cách retest cho từng finding | Scope được phép, source/staging, acceptance/rollback; chưa có sửa hoặc deployment |

## Dữ liệu cần cung cấp để audit sâu

Không cần gửi mật khẩu hoặc token. Có thể dùng export read-only hoặc connector được cấp quyền tối thiểu. Cần bảng mapping domain → property/site/container, environment, owner và định nghĩa outcome. Khoảng báo cáo đề xuất: **21/10–17/11/2026**, xác nhận timezone, filters và completeness trước khi đối chiếu.

- **Cake:** web-to-app/deep-link mapping, đăng ký → eKYC → mở tài khoản/thẻ thành công; dùng dữ liệu pseudonymized, không gửi hồ sơ khách hàng. Nguồn và ngày hiệu lực ưu đãi/lãi suất do owner xác nhận.
- **Infinity:** call/modal lead → lead accepted → booking confirmed → cancellation/refund; nguồn leaderboard và ngày cập nhật, tài liệu claim 40%.
- **QuokkaGuide:** catalog public count/pagination; web → app store → install/purchase/refund; định nghĩa creator profit share; policy consent và browser trace có domain/timing.
- **VBA:** lịch/mùa giải/provider config, web → ticket subdomain → order/payment/refund; transaction IDs pseudonymized, dedup và attribution cross-domain.

Từng report đã có data requests theo owner, định dạng chấp nhận, export instructions và fallback. Các nhóm còn thiếu giữ **unknown**, không tính là lỗi website và không tự chuyển thành pass.

## Review và kiểm chứng

- [Independent review](independent-review.json): AI reviewer độc lập chấp nhận 9/9 findings trong phạm vi mẫu. Đây là số verdict, **không phải precision 100%**; chưa có ground truth hay denominator để tính precision/recall.
- [Verification](verification.json): 8 trường hợp report desktop/mobile, chạy offline, không script/request ngoài, có skip link, không tràn ngang; report integrity và projection được kiểm tra.
- [Receipts](receipts.json): manifest/report digests. Digest chứng minh tính nhất quán, không tự chứng minh đúng nội dung hay authenticity của provider.
- 14 URL HTML, 18 capture ban đầu, 5 lượt tái kiểm targeted, 3 phiên consent. Các lần tải không throttle và có concurrency; không dùng số thời gian để xếp hạng bốn website.
- `reviewStatus: pending` trong report là đúng: 9 finding có verdict độc lập, các narrative/check/action và module đầy đủ chưa hoàn thành review gate. Không ghi AI verdict thành human approval.
- Không phát hiện HTTP error trên mẫu không đồng nghĩa toàn website không có broken links. Không thấy tag trong một capture không chứng minh tag không tồn tại.

## Điều pilot chứng minh và chưa chứng minh về skill

Đã chứng minh đường đi dữ liệu của report với bốn mô hình ngành khác nhau: giữ unknown, sinh yêu cầu bổ sung, gắn bằng chứng/retest, sinh ba định dạng và lưu verdict riêng. Chưa chứng minh provider ingestion end-to-end trên tài khoản thật, recall tìm lỗi, cost/latency ổn định, consent đầy đủ, terminal business outcomes hoặc hiệu quả thay đổi trên production.

P3 vẫn có finding review riêng về planner chấp nhận target chưa có importer/cấu hình không hợp lệ. Pilot này không đóng finding đó và không thay thế P4–P7.

## Nguồn phương pháp

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): không coi tài nguyên AI riêng hoặc schema là bảo đảm được xuất hiện/trích dẫn.
- [Google: Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): đối chiếu claim với nguồn và mục đích người đọc.
- [Web Vitals](https://web.dev/articles/vitals): tách field và lab.
- [W3C: Preliminary accessibility checks](https://www.w3.org/WAI/test-evaluate/preliminary/): kiểm tra sơ bộ không thay conformance evaluation đầy đủ.

## Trạng thái kiểm tra codebase cùng thời điểm

Lint, typecheck, build và git diff --check đạt. Full suite: 606 pass, 8 fail trong 2 file package/verifier vì source P3 đang thay đổi chưa cập nhật composition/component lock (scripts/audit.mjs và cây package không khớp digest 0.3.2). Đây là blocker đóng gói candidate hiện tại, không phải bằng chứng bốn website fail. Không cập nhật lock hoặc phát hành 0.3.2 để che thay đổi P3 chưa review xong. Report integrity và 8 browser cases của pilot đều đạt độc lập với package gate này.

Correction 2026-11-19: the earlier prose named axe 4.14.0. Each of the four evidence.json files records axeVersion 4.14.1, corroborated by the retained local dependency lock. The prose is corrected; source captures, report bytes and verdicts are unchanged.


Bổ sung 19/11/2026: [phụ lục performance thực tế](../enterprise-performance-public-20261119/README.md) có 12 lượt Lighthouse mobile gốc và ba lượt riêng cho URL đích Infinity. Có JSON/Markdown/HTML và review độc lập; giữ cảnh báo/partial, không suy diễn field CWV. Phụ lục cũng ghi nhận vấn đề báo cáo mobile quá dài cần cải thiện. Snapshot và verdict của pilot gốc không đổi.
