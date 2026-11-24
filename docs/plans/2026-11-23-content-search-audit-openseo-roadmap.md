# Kế hoạch mở rộng Content Search Audit với OpenSEO

**Trạng thái** — Đề xuất triển khai ngày 23/11/2026. Nội dung bán hàng và tài liệu khách hàng chỉ công bố những khả năng đã qua nghiệm thu.

**Mục tiêu** — Một lần gọi Content Search Audit cho phép khách hàng nhận báo cáo có bằng chứng từ URL, bổ sung số liệu khi kết nối OpenSEO, và chủ động duyệt các hành động quản lý theo dõi. Dùng được trên Codex và Claude Code với yêu cầu Việt, Anh hoặc trộn hai ngôn ngữ.

**Kiến trúc** — Giữ OpenSEO là một nguồn dữ liệu và thực thi tùy chọn qua MCP của host. NKSkills giữ việc lập inventory, chuẩn hóa bằng chứng, kiểm tra phạm vi, kết luận, báo cáo và quyết định có thực hiện hành động hay không. Dùng lại pipeline thu thập, importer và report hiện có trước khi thêm adapter.

**Công nghệ** — Node.js, CLI hiện tại, báo cáo JSON/Markdown/HTML, MCP của host, Vitest và Playwright. Ưu tiên OpenSEO hosted trong pilot. Self-hosted cần một vòng nghiệm thu riêng về phiên bản, nhà cung cấp dữ liệu và chi phí.

**Hợp đồng liên quan** — [Spec website audit](../specs/website-audit-enterprise.md), [quyền truy cập provider](../../skills/content-search-audit/references/provider-access.md), [import dữ liệu provider](../../skills/content-search-audit/references/enterprise-providers.md), [giao thức nghiệm thu](../research/website-audit-enterprise-evaluation.md).

## 1. Hiện trạng và quyết định sản phẩm

- GitHub `main` đã nhận template 0.3.47 tại `da3d754`. Pilot 0.3.48 có mã nguồn song ngữ trong checkout cục bộ. Log kiểm tra ghi 2.262 test repo qua. Gói đã được thử cài trên cả hai host. Kết quả này xác minh kỹ thuật của candidate trong phạm vi đã test.
- `0.2.0` vẫn là bản phát hành chính thức có review bắt buộc. Các ca giữ kín cho luồng URL công khai, thử khả năng đọc với người chưa chạy audit, và nghiệm thu native của tích hợp OpenSEO đều còn mở. Bản tóm tắt tiếng Việt cho lãnh đạo VBA đã được biên tập riêng. Tạo tự động bản tóm tắt có kiểm chứng vẫn là hạng mục phát triển.
- Repo đã có lập kế hoạch truy cập, kiểm tra capability, import GA4/GSC/Bing và kết xuất số liệu. Hợp đồng hiện tại ghi rõ chưa có executor mặc định cho connector live. Kết quả tool trả về theo API OpenSEO cần được phân loại là dữ liệu do connector chuyển tiếp, có phạm vi và phiên thu thập. Nguồn gốc API gốc của Google phải có bằng chứng riêng nếu được tuyên bố.
- Khuyến nghị dùng chung ba chế độ bên dưới. Yêu cầu OpenSEO khi khách hàng chọn audit kèm dữ liệu hoặc quản lý trên OpenSEO. Luồng URL công khai giữ mức đầu vào tối thiểu.

| Chế độ            | Đầu vào tối thiểu                 | Giá trị                                                                                               | Hành động cho phép                                                    |
| ----------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Audit công khai   | URL hoặc domain và phạm vi        | Lỗi quan sát được, việc ưu tiên, bằng chứng, giới hạn                                                 | Thu thập công khai và xuất file theo phạm vi audit                    |
| Audit kèm dữ liệu | URL và project OpenSEO đúng quyền | Thêm Google Search Console (GSC), GA4, crawl đã lưu, cơ hội từ khóa, hoặc quan sát AI đã có tùy quyền | Đọc nguồn đã chọn. Lượt truy vấn tốn credits dùng ngân sách đã đồng ý |
| Quản lý SEO       | Project và yêu cầu tác vụ cụ thể  | Lưu kết quả, theo dõi, đặt lịch và kiểm tra lại                                                       | Xem trước → duyệt → thực hiện đúng payload → đối soát kết quả         |

Phương án OpenSEO bắt buộc cho mọi người tăng ma sát và làm mất luồng dùng URL đơn lẻ. Việc xây tích hợp riêng trực tiếp vào Google, Bing và từng nhà cung cấp ngay từ đầu tăng việc quản lý OAuth, quota và kiểm thử. Bắt đầu bằng MCP của host cho kết nối và bằng import có kiểm chứng cho khả năng dự phòng. Xem xét tích hợp trực tiếp từng nguồn khi đã xác định khoảng trống dữ liệu qua pilot.

## 2. Nguồn, công cụ và giới hạn

Đã đối chiếu tài liệu chính thức và danh mục công cụ OpenSEO đang được host cung cấp. Danh mục tool xác nhận giao diện khả dụng trong môi trường nghiên cứu. Quyền trên project thực tế, giới hạn gói và độ tương thích của từng host cần được đo trong pilot.

| Nhu cầu               | Công cụ ưu tiên                                                                                                                              | Bằng chứng dùng được                                                       | Giới hạn và thứ tự                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài khoản và project  | `whoami`, `list_projects`, `get_project_context`                                                                                             | Phiên kết nối, project/domain, thị trường, bối cảnh                        | Đọc trước. Trùng domain hoặc khác workspace cần người dùng chọn. Tạo project và lưu bối cảnh là hành động ghi                                                                                |
| SEO kỹ thuật          | `list_site_audits`, `get_audit_status`, `get_audit_pages`, `get_audit_issues`                                                                | URL đã đọc, lỗi phát hiện, trạng thái crawl                                | Ưu tiên lần crawl còn phù hợp. Crawl mới tạo run. Ghi page cap, redirects, blocked, JS render và phạm vi. Plain crawl, JS render và Lighthouse có chi phí khác nhau                          |
| Hiệu suất trên Google | `get_search_console_performance`                                                                                                             | Click, impression, CTR, vị trí bình quân theo chiều dữ liệu                | Kiểm tra property, thiết bị, loại tìm kiếm, quốc gia, cửa sổ và trang phân trang. Dữ liệu chi tiết có thể bị cắt và không cộng ra tổng property                                              |
| Index và canonical    | `inspect_urls`                                                                                                                               | Trạng thái phiên bản Google biết, canonical khai báo/chọn, thời điểm crawl | Tối đa 10 URL/lượt theo tool. Chọn trang quyết định được hành động. Phân biệt capture mới và trạng thái trong index                                                                          |
| Hành vi và kết quả    | `get_google_analytics_organic_overview`, `get_google_analytics_organic_landing_pages`, `get_google_analytics_key_events`                     | Sessions, key events, chỉ số phù hợp tùy báo cáo                           | GA4 property, filter, timezone, đơn vị và sampling/threshold. Diễn giải theo định nghĩa event của khách hàng                                                                                 |
| Cơ hội theo trang     | `get_search_opportunities` cùng GSC/GA4 gốc                                                                                                  | Gợi ý ưu tiên dựa trên trang ghép được và trang chưa ghép                  | Chấm thử đối chiếu chuẩn NKSkills. Giữ trang không ghép, số lượng ngoài mẫu và tiêu chí xếp hạng. Cơ hội là đề xuất kiểm tra                                                                 |
| Research SEO          | `research_keywords`, `get_keyword_metrics`, `get_serp_results`, `get_ranked_keywords`, các tool backlink/đối thủ                             | Nhu cầu ước tính, quan sát SERP, khoảng trống nội dung, mẫu nguồn liên kết | Dùng ở giai đoạn 3 theo thị trường, ngôn ngữ và thiết bị. Dữ liệu volume và traffic của nhà cung cấp là ước tính                                                                             |
| GEO quan sát được     | `get_ai_visibility_tracker`, `get_ai_visibility_results`, `get_ai_visibility_sources`, `get_ai_visibility_answer`, `get_ai_visibility_trend` | Prompt, câu trả lời, nguồn dẫn, lượt xuất hiện đã lưu                      | Đọc run đã lưu trước. Kiểm tra engine, API/consumer surface, thị trường, prompt, thời gian, lần lặp và số lần thất bại. Khả dụng của prompt research theo ngôn ngữ/engine phải được xác minh |
| Theo dõi và lưu dự án | Rank tracker, AI visibility tracker, `save_keywords`, `update_project_context`, `save_report`                                                | Trạng thái từ project, theo dõi theo cohort, báo cáo lưu                   | Tách cấu hình, chạy một lần, lịch định kỳ, chia sẻ công khai và xóa. Duyệt theo từng tác động ở giai đoạn 4                                                                                  |
| Local SEO             | `search_local_businesses`, `get_business_profile`, `get_local_serp_results`, `get_local_rank_grid`                                           | Hồ sơ và đối thủ tại vị trí xác định, lưới theo dõi                        | Chỉ áp dụng cho mô hình địa phương, có địa điểm/địa bàn hợp lệ và ngân sách riêng                                                                                                            |
| CWV, Bing, GTM        | Lighthouse của OpenSEO làm lab. CrUX/RUM, Bing Webmaster Tools, GTM hoặc trace dùng nguồn riêng khi đã cấp quyền                             | Field/lab, Bing index và click, cấu hình và quan sát runtime tương ứng     | Xem xét từng adapter sau MVP. Gửi IndexNow là tác vụ ghi của một luồng khác với đọc Bing. Tag hoặc sự kiện đơn lẻ chưa đủ chứng minh chuyển đổi                                              |

Nguồn đối chiếu [Công cụ MCP](https://openseo.so/docs/mcp-tools), [kết nối GSC/GA4](https://openseo.so/docs/google-integrations), [site audits](https://openseo.so/docs/site-audits), [AI Visibility](https://openseo.so/docs/ai-visibility), [PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/about), [CrUX API](https://developer.chrome.com/docs/crux/api/), [Bing URL Inspection](https://www.bing.com/webmasters/help/url-inspection-55a30305).

### Cách dùng các skill OpenSEO

- Dùng `seo-project-setup` để tham khảo cách xác định mục tiêu, thị trường và trang quan trọng. Chỉ lưu bối cảnh khi người dùng duyệt tác vụ.
- Học cách chọn 1–3 đề xuất có trọng lượng từ `seo-audit`. Dùng `keyword-research`, `keyword-clustering`, `competitive-landscape`, `competitor-analysis` và `link-prospecting` theo nhu cầu cụ thể. Kết quả link prospecting là đề xuất, outreach là một yêu cầu riêng.
- Dùng `ai-visibility-audit` cho kiểm tra bằng chứng từ câu trả lời đã lưu và `ai-prompt-research` cho khám phá nhu cầu khi nguồn hỗ trợ thị trường. `local-seo` theo profile có địa điểm.
- `seo-report` là tham chiếu cho báo cáo HTML gọn trong OpenSEO. NKSkills xuất và kiểm tra bộ ba file tại thư mục làm việc trước. Các hướng dẫn upstream có thể yêu cầu tự lưu project, research log hoặc report. Tích hợp NKSkills chỉ sử dụng phần phù hợp với quyền của tác vụ. Nếu đưa nội dung upstream vào package về sau, review license/NOTICE/commit/digest theo quy trình repo. Pilot chỉ dùng API/công cụ qua host và giữ một entrypoint NKSkills.
- Hướng dẫn người dùng chọn một cách kết nối theo host. MCP-only phù hợp khi chỉ cần công cụ OpenSEO và muốn NKSkills điều phối toàn bộ. Plugin OpenSEO phù hợp khi khách hàng cũng muốn các workflow riêng của nhà cung cấp. Tài liệu có cả đường kết nối cho desktop và CLI. Ghi nhận phiên bản host và tool thực tế khi thử nghiệm để tránh mặc định rằng mọi plugin đều có cùng danh mục. [Codex](https://openseo.so/docs/codex-plugin) · [Claude Code](https://openseo.so/docs/claude-code-plugin) · [OpenSEO MCP](https://openseo.so/docs/mcp)

## 3. Luồng khách hàng và quyền kiểm soát

1. Landing EN/VI đưa hai lựa chọn “Audit từ URL” và “Kết nối OpenSEO để đọc dữ liệu”. Bản pilot có nhãn riêng. Hướng dẫn EN/VI kèm phần xử lý prompt trộn. Ngôn ngữ báo cáo, ngôn ngữ truy vấn và thị trường là các lựa chọn độc lập.
2. Khách hàng cài NKSkills rồi tự kết nối OpenSEO bằng UI hoặc CLI host. GSC và GA4 được kết nối riêng trong OpenSEO Project Settings → Integrations. Với mỗi project xác nhận domain, workspace, GSC site và GA4 property trước lượt đọc đầu tiên. Cùng một Google account có thể có nhiều property. Lỗi sai workspace hoặc sai property hiện thành thông báo có hướng xử lý và giữ audit công khai tiếp tục.
3. Hiện bản xem trước ngắn gồm nguồn, project, cửa sổ dữ liệu, giới hạn crawl, số URL cần inspection, dữ liệu sẽ lưu và mức chi tối đa. Mặc định bản connected đọc nguồn sẵn có. Gợi ý giới hạn pilot là hai cửa sổ 28 ngày đã kết thúc có cùng độ dài, tối đa 10 URL kiểm tra index có lý do chọn, ưu tiên crawl đã lưu. Đây là mặc định đề xuất và phải cho khách hàng chỉnh.
4. Khi thiếu kết nối, hết quyền, hết quota, không có dữ liệu, dữ liệu trễ, bị cắt hoặc tool thay đổi shape, giữ trạng thái tương ứng và giải thích tác động lên kết luận. Khách hàng có thể dùng export đã cấp phép. Khi xác thực hết hạn, dừng lượt provider tương ứng và tiếp tục các nguồn độc lập.
5. Xuất báo cáo local gồm phần quyết định cho lãnh đạo và phần kỹ thuật có thể mở. Lưu vào OpenSEO chỉ theo yêu cầu, mặc định riêng tư trong workspace đúng. Chia sẻ public là một tác vụ riêng và cần xem lại dữ liệu được phép chia sẻ.
6. Chế độ quản lý hiển thị danh sách từ khóa, trang, thiết bị, địa điểm, lịch và thay đổi dự kiến. Cho phép chấp thuận từng nhóm thay đổi. Sau thực thi, đọc lại trạng thái, ghi kết quả từng mục và cách hoàn tác khi có thể.

### Kiểm soát chi phí và quyền thao tác

| Loại                                                         | Mặc định đề xuất                          | Điều kiện thực thi                                                                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đọc project và kết quả đã lưu                                | Có thể dùng trong audit đã kết nối        | Asset khớp quyền và phạm vi; báo cáo lượng dữ liệu thực sự đọc                                                                                                          |
| Tạo crawl, lưu report hoặc sửa context/keyword               | Bản xem trước                             | Duyệt nơi lưu, dữ liệu và tác động, kể cả thao tác không thu credits                                                                                                    |
| SERP, keyword, backlinks, AI research, JS render, Lighthouse | Ngân sách tiêu chuẩn của MVP là 0 credits | Khách chọn đổi ngân sách và phạm vi khi cần. Dùng giá trần tool trả về nếu có. Loại tool không có giới hạn chi phí thực thi cần ước lượng hoặc xin duyệt thao tác riêng |
| Rank/AI tracking định kỳ                                     | Manual trước                              | Xác nhận cadence, timezone, lần chạy đầu, chi phí mỗi lần/tháng, giới hạn và cách tạm dừng. Việc bật lịch AI có thể xếp một lần baseline                                |
| Thay property, public report, xóa, IndexNow                  | Ẩn khỏi audit mặc định                    | Duyệt cụ thể target và hậu quả. IndexNow chỉ cho URL thật sự thay đổi thuộc site đã xác nhận. Tách thông báo URL khỏi đánh giá index                                    |
| CMS, robots, canonical, redirects, GTM publish               | Đề xuất và hướng dẫn kiểm tra lại         | Đưa vào dự án triển khai riêng với chủ hệ thống, môi trường thử, quyền thay đổi và kế hoạch hoàn tác                                                                    |

Đọc chi phí khả dụng và receipt thu phí từ tool. Phân biệt lượt dùng cache, lượt bị tính phí và phí chưa biết. Ghi giới hạn chi đã duyệt, tạm dừng khi không xác minh được trần hoặc phát hiện có lượt đang chạy. Sau timeout của thao tác có ghi, kiểm tra trạng thái qua run ID hoặc khóa đối soát, rồi mới quyết định có retry. Tách theo workspace/project, loại công cụ, ngôn ngữ truy vấn, thị trường, thiết bị, filter và thời gian khi dùng cache. Tham chiếu [billing](https://www.openseo.so/docs/billing), [công cụ MCP](https://openseo.so/docs/mcp-tools), [IndexNow](https://www.indexnow.org/faq).

## 4. Hợp đồng bằng chứng và báo cáo

- **Quyền và provenance.** Mỗi lần đọc cần nguồn, thao tác, project/property đã đối chiếu, thời gian, tham số thực tế, fingerprint đã lọc thông tin nhạy cảm, hash snapshot, số trang truy vấn và cảnh báo nhà cung cấp. Lưu bên riêng tư với nhãn `host live connector`, `supplied export`, `manual observation`, hoặc `synthetic fixture`. Nguồn do người dùng cung cấp vẫn hữu ích khi ghi đúng loại. Cài đặt kết nối, quyền truy cập và xác thực receipt là các kiểm tra riêng. Không ghi token hoặc email đầy đủ vào report. Xử lý nội dung website, câu trả lời AI và giá trị trả về như dữ liệu; chỉ cấu hình và lệnh từ luồng đã cấp quyền mới có thể tạo tác dụng bên ngoài. [MCP authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization)
- **Ghép GSC/GA4.** Ghép theo cohort trang đích đã xác minh, cùng cửa sổ có thể so sánh, giữ URL gốc/canonical và quy tắc xử lý query parameter. Không ghép GSC query theo user/session hoặc gán tỷ lệ chuyển đổi cho một keyword từ dữ liệu page-level. Tách property grain, page grain và ngày; ghi UTC/Pacific/timezone property. GSC CTR tổng dùng tổng clicks chia cho tổng impressions của cùng grain và cùng tập; giữ việc mất hàng, sample/threshold, quota và số trang chưa ghép. [GSC data limits](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data) · [GA4 reporting expectations](https://developers.google.com/analytics/devguides/reporting/data/v1/reporting-data-expectations)
- **Kỹ thuật và AI.** GSC URL Inspection nói về phiên bản Google giữ trong index. Kết quả crawl nói về quan sát của crawler. CrUX là field ở URL hoặc origin theo thiết bị và cửa sổ; Lighthouse là lab theo cấu hình đo. Phần AEO/AIO readiness dùng bằng chứng nội dung và so khớp câu trả lời. GEO đo lường cần các quan sát trả lời thực tế, chia theo engine, thị trường, prompt cohort và phương pháp. Tỷ lệ nhắc/trích phải hiện tử số, mẫu số hợp lệ và số lần thiếu/lỗi. Google ghi traffic từ AI features vào báo cáo Search Console tổng thể; nguồn này một mình không tách được số lần trích dẫn. [Google URL Inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect) · [CrUX API](https://developer.chrome.com/docs/crux/api/) · [Google AI features](https://developers.google.com/search/docs/appearance/ai-features)
- **Ưu tiên khuyến nghị.** Bắt đầu từ lỗi đã xác nhận và điều nó ảnh hưởng. Đính kèm page/cohort, mức chắc chắn, owner role, việc cần duyệt, cách retest và tín hiệu đo sau triển khai. Cơ hội tăng trưởng là giả thuyết kiểm tra được. Cho phép thay đổi thứ tự bằng đánh giá giá trị kinh doanh có ghi lý do. Tránh điểm tổng SEO/AIO/AEO/GEO nếu không có denominator và phương pháp được nghiệm thu.
- **Phần cho lãnh đạo.** Tạo một phần cấu trúc trong JSON gồm kết luận, ý nghĩa, tối đa ba việc cần giao, quyết định cần duyệt, các nguồn tham chiếu theo ID và giới hạn. Markdown và HTML chiếu cùng dữ liệu, bằng ngôn ngữ đã chọn. Kiểm tra mỗi mục dẫn đến bằng chứng thuộc revision. Render rõ mục do agent tổng hợp và phần chưa đo được. Kết quả _0_ cần truy vấn hợp lệ và coverage phù hợp.
- **Xuất sang OpenSEO.** Báo cáo VBA HTML 0.3.48 cục bộ đo được 699.854 byte, vượt giới hạn 500.000 byte của giao diện `save_report` đang thấy. Nếu khách hàng muốn lưu, render một bản HTML gọn với CSS inline, không phụ thuộc vào đường dẫn file cục bộ và không nhúng snapshot riêng tư. Mục tiêu kích thước đề xuất dưới 80 KB theo gợi ý tool. Gắn ID/hash revision và đường dẫn bằng chứng được phép truy cập. Bản đầy đủ vẫn có manifest cục bộ. Kiểm tra trạng thái sharing trước khi ghi đè report, vì cập nhật report đã chia sẻ có thể cập nhật nội dung ở link public hiện có. Giai đoạn đầu ưu tiên lưu report mới riêng tư; thay bản public là tác vụ chia sẻ cần duyệt riêng. [OpenSEO reports](https://openseo.so/docs/reports) · [MCP tools](https://openseo.so/docs/mcp-tools)

## 5. Các giai đoạn triển khai

### G0 — Chốt nền public và đóng băng phạm vi nghiệm thu

- [ ] Chọn gói candidate làm mốc. Chạy ca URL, domain, không connector, thiếu dữ liệu, prompt EN/VI/trộn và cài sạch trên hai host. Tách lỗi bản public khỏi lỗi module connected.
- [ ] Thêm cấu trúc tóm tắt lãnh đạo vào cùng revision báo cáo. Bổ sung bộ ví dụ tổng hợp và thử với người đọc không tham gia audit. Chỉ giới thiệu theo phạm vi có bằng chứng.
- [ ] Chuẩn bị một tài khoản thử được cấp quyền, hai project độc lập, một GSC site đúng và một property cố tình không khớp, một project có GA4 và một project không có dữ liệu. Đăng ký ca giữ kín trước khi chạy. Không tự cấp quyền hoặc tạo project thực của khách hàng.
- **Qua giai đoạn khi** biết chính xác phạm vi public nào được phép phát hành, tài liệu EN/VI phản ánh đúng và luồng fallback được giữ.

### G1 — Kết nối và thăm dò chỉ đọc

- [ ] Bổ sung hướng dẫn riêng cho mỗi host trong `site/src/components/HostGuidePage.astro` và hướng dẫn cài hiện có. Các nút kết nối chỉ dẫn vào quy trình OAuth chính thức. Hướng dẫn phân biệt OpenSEO login và Google account binding.
- [ ] Mở rộng `references/provider-access.md` và dùng `scripts/lib/provider-capabilities.mjs` để lập bản kê capability theo host và project. Adapter thăm dò mới cần định danh `project + provider + resource + operation` và trả trạng thái rõ cho unavailable, disconnected, mismatch, forbidden, expired, quota.
- [ ] Viết fixtures các trường hợp khác domain, trùng domain, tool vắng mặt, scope thiếu, project rỗng và tài khoản hết hạn. Xác nhận không chuyển workspace hoặc tự gọi tool ghi để sửa.
- **Qua giai đoạn khi** người dùng từ cả hai host chọn đúng project, xác nhận được nguồn khả dụng và tiếp tục audit từ URL nếu ngắt kết nối.

### G2 — MVP số liệu thực và báo cáo lãnh đạo

- [ ] Thêm adapter chuẩn hóa ba nguồn đầu tiên: GSC performance, GA4 organic theo trang và crawl OpenSEO đã lưu. Tra cứu URL Inspection cho nhóm trang ảnh hưởng quyết định nếu đã có quyền và thêm được hợp đồng đúng. Tái sử dụng `enterprise-provider-workflow.mjs`, `measurement-report.mjs` và `enterprise-provider-report.mjs`. Nếu OpenSEO trả shape tổng hợp, tạo envelope chuyển tiếp có version và giữ source; tránh giả định đó là export API Google thô.
- [ ] Viết fixture có ngày không tương thích, URL trùng, mẫu không đầy đủ, metric ngưỡng, zero hợp lệ, và không ghép được. Câu trả lời có ID nguồn, kỳ so sánh, quan sát chính, giải thích và cách kiểm tra lại.
- [ ] Đồng bộ phần lãnh đạo trong `report.mjs`, `campaign-report.mjs` và `report-view.mjs` theo canonical model thích hợp. Đường dẫn bằng chứng phải mở được trong bản offline. Test prompt tiếng Việt pha thuật ngữ Anh, override ngôn ngữ trình bày và tài liệu gốc có trích dẫn hai ngôn ngữ.
- [ ] Đọc kết quả hai host trên một pilot được phép và trên bộ ca giữ kín. Kiểm tra số liệu đối chiếu với giao diện người sở hữu trong đúng range và scope. Dùng cohort nhỏ để xác định chi phí, thời gian và lợi ích thực tế.
- **Qua giai đoạn khi** tạo được danh sách việc ưu tiên từ số liệu đúng, có fallback khi mất nguồn, không phát sinh thao tác ghi hoặc phí ngoài phạm vi.

### G3 — Research có ngân sách và GEO đã đo

- [ ] Thêm keyword/SERP/backlink theo câu hỏi, ưu tiên cache có phạm vi và giới hạn số truy vấn. Xác định locale, market và device trước khi mua dữ liệu. Đo riêng các tool hỗ trợ thị trường Việt Nam và giới hạn prompt research.
- [ ] Nhập run AI đã lưu, ràng buộc engine/prompt/time/model method và citation. Những lần thất bại hoặc không áp dụng giữ trong accounting. Chỉ mở chạy mới sau khi kiểm chứng estimate, trần chi và cách dừng.
- [ ] Thử thứ tự đề xuất với holdout SEO/AEO/GEO. So sánh native có cùng tool budget với baseline. Ghi đủ phí và thời gian khi host cung cấp.
- **Qua giai đoạn khi** từng nhóm tác vụ có bằng chứng và ROI vận hành đủ rõ để giới thiệu, cùng giới hạn theo thị trường và trả lời khi thiếu dữ liệu.

### G4 — Tác vụ quản lý có phê duyệt

- [ ] Khởi đầu với lưu keyword và tracker thủ công trong project thử. Xác minh ghi đúng project, đối soát trạng thái sau timeout và lặp lại thao tác không tạo bản trùng.
- [ ] Thêm luồng preview → approve → apply → verify. Sự đồng ý phải gắn loại thao tác, project/resource, payload hash, trần chi, thời hạn hiệu lực. Nếu quyền, payload hoặc estimate thay đổi, trở lại bước xem trước. Lưu sự kiện chấp thuận, kết quả, dữ liệu được đổi, tác vụ bị từ chối và cách hoàn tác.
- [ ] Bật lịch rank/AI theo từng profile sau khi kiểm thử dừng lịch, chi vượt dự tính, time zone và baseline tự chạy. Bổ sung upload HTML gọn sau khi kiểm tra kích thước và sharing.
- [ ] Đưa IndexNow và xuất bản công khai vào một tập kiểm thử riêng có xác nhận địa chỉ, ảnh hưởng và quyền. Không mở thao tác sửa live website từ entrypoint đọc báo cáo.
- **Qua giai đoạn khi** phép gọi đúng mục tiêu được đối soát, mọi thay đổi ngoài scope hoặc thiếu duyệt bị chặn, và khách hàng có thể tạm dừng các tác vụ phát sinh chi phí.

### G5 — Nguồn bổ sung theo giá trị pilot

- [ ] Đánh giá nhu cầu thực với Local SEO, CrUX/RUM, Bing export, GTM/consent, accessibility và UX bằng từng profile. Ưu tiên nguồn trả lời quyết định mà MVP đang bỏ ngỏ.
- [ ] Tách các adapter và tài liệu này khỏi các tuyên bố release của MVP. Mở từng nguồn khi chứng minh được quyền, nguồn gốc, giới hạn, hiệu năng và độ ổn định ở lần chạy ban đầu và khi kiểm tra lại sau một tuần.

## 6. Nghiệm thu, vận hành và phát hành

| Hạng mục              | Ca thử bắt buộc                                                                                    | Bằng chứng nghiệm thu                                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đúng tài khoản        | Trùng domain khác workspace, thiếu quyền, kết nối lại giữa hai lượt, đổi property                  | 100% ca dừng hoặc chọn đúng theo đăng ký. Không xuất dữ liệu workspace khác                                                                                                                                                      |
| Trạng thái và số liệu | GSC top rows, GA4 thresholding, split timezones, không có trang ghép, số liệu zero thật và missing | 100% trạng thái và dữ liệu hợp lệ/truncated theo gold. Đối chiếu lần đọc và khóa revision. Không suy số liệu còn thiếu                                                                                                           |
| Phát hiện             | Lỗi thật và trang sạch cho từng claim cell, có cả hai host                                         | Dùng gate hiện có: critical recall 100%, material precision ≥90%, recall ≥80%, không có cảnh báo vật chất sai trên clean controls. Tối thiểu 10 lỗi và 10 control độc lập/cell, ba lượt native và ba lượt baseline theo protocol |
| Báo cáo và ngôn ngữ   | EN, VI, mixed, cùng audit xuất lại, công cụ thiếu, evidence link thật                              | JSON/Markdown/HTML đồng nhất nội dung và kiểm tra manifest. Người đọc độc lập nêu được việc ưu tiên, người làm, chứng cứ và giới hạn. Ghi thời gian tới quyết định, lý do đọc sai và vòng sửa                                    |
| Tác vụ và ngân sách   | Duyệt một phần, hết hạn, lặp, timeout sau apply, phí phát sinh, lịch tự chạy, cố share ngoài quyền | 0 thao tác ghi ngoài duyệt, 0 rò workspace/secret, 0 phí vượt giới hạn đã cam kết, 0 kết luận bịa. Đọc lại trạng thái trước retry và có receipt cho mỗi tác vụ                                                                   |
| Vận hành              | Thay version MCP, mất nguồn, đứt giữa lượt, cache cũ, kết quả mới khác ngày                        | Ghi p50/p95 time-to-report, tỷ lệ fallback hữu ích, chi phí/run, số lượt cấu hình thành công, tỷ lệ file hợp lệ, số lần reviewer phải sửa và lý do. Đo pilot trước khi đặt SLA                                                   |

- Dùng capability flag cho connected reads, paid research, write actions và public share. Mỗi nhóm có cách tạm dừng riêng, giữ báo cáo cũ và luồng URL. Định kỳ kiểm tra tool descriptions và shape trên hai host rồi chạy lại contract test nếu thay đổi.
- Kết quả native, baseline và assisted ghi riêng. Người review nhận artifact đóng băng. Không dùng pilot VBA đã xem trước hoặc test kỹ thuật như bộ holdout. Bộ quyết định cuối ghi claim nào được phép bán, pipeline nào còn experimental, chi phí, tác động và khả năng hỗ trợ. Áp dụng [giao thức nghiệm thu hiện có](../research/website-audit-enterprise-evaluation.md).
- Thứ tự triển khai đề nghị là **G0, G1 và G2 trước**. Dấu hiệu MVP có giá trị là cùng một audit từ URL, sau khi được cấp đúng project, có thêm các việc ưu tiên mà người đọc xác nhận dựa trên click/impression hoặc hành vi đo được. Chỉ triển khai G3/G4 khi kết quả pilot chứng minh nhu cầu, quyền và ngân sách cho từng chức năng.

## Tiến độ triển khai sau bản đề xuất

- Candidate 0.3.49 thêm chọn project theo domain, ba họ dữ liệu chỉ đọc và báo
  cáo từ receipt đã kiểm tra. Đây là phần đầu G1/G2. Google Analytics nhận bản
  tổng hợp Organic Search cấp property. Phép ghép theo landing page vẫn mở.
- Phiên Codex đã trả được danh sách project bằng connector. Không chạy audit có
  dữ liệu tài khoản thực trên hai host. Test cài gói và fixture kiểm tra đường
  dẫn kết xuất nhưng không thay cho nghiệm thu native có project được cho phép.
- Tạo bản tóm tắt lãnh đạo tự động, lookup Index Inspection, nghiên cứu tốn
  credits, thao tác ghi và phát hành thương mại vẫn cần vòng triển khai và
  nghiệm thu tương ứng.
