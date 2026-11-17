# Nghiên cứu và thiết kế Content Search Audit

Cập nhật tổng hợp: 2026-11-17. Trạng thái: candidate 0.1.31, chưa phải bản phát hành
thương mại. Tài liệu này tổng hợp quyết định hiện tại; lịch sử nghiên cứu và bằng
chứng chi tiết nằm trong các tài liệu được liên kết bên dưới. Không xem số lượng
stars, lượt cài hay số lượng checklist là bằng chứng về chất lượng của một skill.

## Trạng thái hiện tại để ra quyết định

**Một package, một skill khách hàng: `content-search-audit`, candidate 0.1.31.**
Codex gọi `$content-search-audit`; Claude Code gọi `/content-search-audit`.
Khách hàng không phải cài hoặc gọi năm skill upstream. Phương pháp đã chọn được
chuyển thành references nội bộ, đi cùng collector, evidence, state, report và
provenance của chính package.

Đọc phần 1–7 bên dưới cho thiết kế và data model; xem
[spec](../specs/content-search-audit.md) cho hợp đồng đầy đủ và
[kế hoạch](../plans/content-search-audit.md) cho từng task. Các đoạn theo phiên bản
sau đó là lịch sử, không phải trạng thái mới nhất hay mẫu độc lập để cộng dồn điểm.

### Cấu trúc và trạng thái bàn giao

| Lớp                  | Đã có trong candidate                                                                                    | Giới hạn còn phải giữ                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Bề mặt khách hàng    | Một entrypoint; cài riêng Codex/Claude hoặc kết hợp; ví dụ review nằm trong gói                          | Chưa promote commercial catalog hoặc phát hành                                                     |
| Kế thừa              | Năm phương pháp từ hai repository MIT, commit/digest cố định, NOTICE/licenses/provenance                 | Các họ tham khảo không tự trở thành dependency hoặc nguồn đủ điều kiện phân phối                   |
| Phương pháp          | Quality, SEO, AIO, AEO, GEO, portfolio; 26 rules                                                         | 24 semantic rules cần phán đoán; hai rule xác định từ evidence không chứng minh audit đầy đủ       |
| Thu thập và phục hồi | Local inert text, public allowlist/robots/limits, inventory union, campaign, resume, extraction recovery | Browser/PDF/transcript phụ thuộc capability và evidence; không có dữ liệu phải giữ unknown/blocked |
| Đánh giá             | Snapshot có hash, source lineage, immutable review, findings gộp nhiều chiều, quote verifier             | Hash và quote đúng không xác thực kết luận; còn bất đồng applicability giữa host                   |
| Đo lường             | Supplied GSC, GA4, Bing, log và AI observations; denominator/missingness riêng                           | Không phải authenticated live connector hay bằng chứng uplift                                      |
| Báo cáo              | Markdown, HTML, CSV, item/check coverage, evidence links, redacted derivatives                           | Báo cáo partial hợp lệ là kết quả trung thực, không phải nghiệm thu sản phẩm                       |

Năm nguồn kế thừa và bảy họ nguồn đối chiếu được tách trong
[bảng quyết định nguồn](content-search-audit-source-decisions.json). Bảy nhóm Corey
hỗ trợ có 19 references và 57 eval case đã đọc; hai nguồn Corey được chọn có thêm
21 eval case được đọc riêng. Đây không phải kết quả chạy eval upstream. Các review
mới gồm [Aaron benchmark](content-search-audit-aaron-benchmark-disposition.md),
[RankXAI measurement](content-search-audit-rankxai-measurement-disposition.md),
[Smoke linked methods](content-search-audit-smoke-linked-disposition.md) và
[Zubair runtime](content-search-audit-zubair-runtime-disposition.md).

### Bằng chứng trên đúng 0.1.31

| Kiểm chứng                                                                                | Kết quả được phép kết luận                                                                               | Phần chưa chứng minh                                                                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Cài đặt và nâng cấp](content-search-audit-0131-installation-snapshot.json)               | Cài mới/upgrade 0.1.29 → 0.1.31 và ví dụ thực thi trên hai host riêng/kết hợp                            | Không tự chứng minh model luôn tuân thủ workflow                                                                           |
| [Support methods](content-search-audit-trials/native-0131/README.md)                      | Mỗi host tìm 6/6 author-gold; 4 pending, 0 audited; 9/27 quote spans replay                              | Bất đồng AEO applicability; Claude vi phạm RTK; chưa có human verdict                                                      |
| [Expanded offline](content-search-audit-trials/expanded-0131/README.md)                   | Mỗi host tìm 6/6 units trong 5 findings; 12 items giữ 10 pending/2 blocked; 15/33 quotes replay          | Claude còn lỗi summary/advice và RTK; không phải general precision/recall                                                  |
| [Technical controls](content-search-audit-trials/technical-controls-0131/README.md)       | Mỗi host tìm ba gold units; valid schema/historical controls được giữ                                    | Lời khuyên crawl/canonical của Claude còn vượt bằng chứng                                                                  |
| [Public/missing analytics](content-search-audit-trials/public-pilot-0131/README.md)       | Hai host giữ 12 mục pending, 0 audited; discovery limits không bị ẩn                                     | Không phải full-site rendered audit; còn phán đoán và instruction errors                                                   |
| [Phục hồi](content-search-audit-trials/interrupted-process-0131/README.md)                | SIGKILL ở checkpoint rồi phục hồi 1.200 IDs, 31.200 checks                                               | Không chứng minh mọi điểm crash giữa các lần ghi; Claude nhầm số semantic rules                                            |
| [Collection boundaries](content-search-audit-trials/collection-boundaries-0131/README.md) | Ba kiểu cài đặt giữ đúng barrier/timeout/size/private-redirect/no-renderer accounting                    | Transport giả lập, không chứng minh native host không bypass collector                                                     |
| [Private share](content-search-audit-trials/private-share-0131/README.md)                 | Hai native host xuất bản chia sẻ không lộ literal/path đã chỉ định; links/hashes hợp lệ; trace đã review | Không phải general PII/exfiltration defense; Codex summary ngoài helper manifest; rule interpretations và RTK còn giới hạn |

Đã chạy lại toàn bộ kiểm tra repository ngày 2026-11-17: **62 files / 463 tests
đạt**, cùng format, lint, typecheck, build và diff checks. Xem
[biên bản kiểm chứng](content-search-audit-0131-current-verification.json).
Archive 0.1.31 và 74 tệp cùng 1.040 archive members trong hồ sơ review giữ đúng hash.
Kết quả này không thay thế đánh giá ngữ nghĩa độc lập. Runtime package vẫn giữ
nguyên từ 0.1.29; 0.1.30 sửa ba mô tả trạng thái và 0.1.31 sửa định dạng provenance.

### Việc còn lại, theo đúng loại bằng chứng cần có

1. **Chốt applicability và chất lượng ngữ nghĩa.** Review độc lập từng finding,
   clean control, missing gold, report/advice error và rule pass/unknown. Đặc biệt:
   FAQ so với material answer claim; task mapping so với câu trả lời sai;
   standalone context so với điều kiện chính sách bị mất. Không sửa gold sau khi
   nhìn kết quả để tự biến run thành đạt.
2. **Sửa hành vi nếu review xác nhận lỗi.** Dùng failed case đã ghi làm baseline,
   thử guidance thay thế trong context mới, rồi chạy lại cohort có liên quan.
   Nếu đổi package, khóa provenance và version mới, build/install/upgrade lại;
   giữ nguyên archive 0.1.31 và các bản cũ. Không phát hành thêm phiên bản chỉ để
   xóa một câu khó chịu khỏi lịch sử.
3. **Đóng từng mục compound bằng đúng phạm vi.** Đối chiếu
   [18 fixture classes](content-search-audit-fixture-coverage-matrix.md) và
   [collection gates](content-search-audit-collection-gates-0127.md). Helper test,
   installed replay, recorded native trace và human acceptance là bốn loại bằng
   chứng khác nhau. Reference-only disposition cũng không chứng minh đã review
   toàn bộ repository bên ngoài.
4. **Nghiệm thu rồi mới chuẩn bị release.** Bạn đã chọn trực tiếp review
   [sáu báo cáo trên đúng 0.1.31](content-search-audit-human-review-current-0131/README.md).
   Biểu mẫu vẫn trống; chưa có verdict. Public/resume/private-share có phạm vi
   bổ sung riêng. Sau khi gate đạt mới chuẩn bị scoped commit/release, kiểm tra
   archive/digests/install lock và ghi rollback. Hiện chưa push/deploy/publication.

[Completion audit](content-search-audit-completion-audit.md) giữ các gate còn mở.
Không có điểm SEO/GEO tổng, dự báo ranking hoặc tuyên bố độ chính xác sản phẩm
rút từ các fixture này.

## Lịch sử các lần sửa và thử nghiệm

Candidate 0.1.26 sửa lỗi tự sinh finding từ HTTP 401/403/429: phản hồi bị chặn
vẫn được giữ làm bằng chứng, check ở trạng thái unknown và không tự kết luận lỗi
nội dung. Replay bản cài đặt cũ/mới, campaign và resume đã xác minh thay đổi;
[xem bằng chứng](content-search-audit-trials/http-barriers-0126/README.md).

Kiểm chứng ngữ nghĩa trên bộ 12 hồ sơ: [semantic-0125](content-search-audit-trials/semantic-0125/README.md)
chạy đủ 12 hồ sơ trên cả hai host. Mỗi host phát hiện 15/15 lỗi đã gài; đây là bộ
phát triển đã biết, không phải benchmark độc lập. Codex đạt rubric cục bộ. Claude
còn một lỗi diễn giải eligibility, thiếu coverage đã kiểm chứng và không nạp
phương pháp nội bộ theo yêu cầu. Candidate chưa đạt nghiệm thu tổng thể.

Bộ thử bổ sung [support-methods-0126](content-search-audit-trials/support-methods-0126/README.md)
bao gồm bốn hồ sơ mới về so sánh đối thủ, cửa sổ đo lường, trang theo khu vực và
claim biên tập. Hai host đều tìm đúng 6/6 lỗi được gài và giữ các trường hợp đúng.
Tuy nhiên, cả hai bỏ qua pipeline kiểm chứng coverage; Claude còn nhập nhằng
referral tổng với incrementality. Đây là bằng chứng giới hạn của candidate,
không phải nghiệm thu độc lập hay chứng nhận độ chính xác tổng quát.

Candidate 0.1.27 làm rõ thứ tự tạo inventory, lưu semantic review và validate
trước khi giao báo cáo. [Lượt thử cùng dữ liệu](content-search-audit-trials/coverage-0127/README.md)
cho thấy Codex đã lưu 6 findings và 21 checks có kết luận; Claude đã tạo run nhưng
vẫn bỏ semantic review. Chưa đạt nghiệm thu cả hai host. 455 tests cùng các kiểm
tra format, lint, typecheck và build đã qua; nâng cấp từ 0.1.26 đã kiểm tra trên
hai host riêng lẻ và kết hợp.

Lượt [phục hồi có chỉ dẫn trực tiếp](content-search-audit-trials/review-diagnostic-0127/README.md)
cho thấy Claude dùng được helper review và lưu đủ sáu findings. Tuy nhiên, kết luận pass của `aeo-answer-evidence` chỉ dựa vào FAQ đúng lại
được gắn với cả dossier chứa claim sai. Rule về context của một câu hỏi có thể
có phạm vi áp dụng hẹp hơn nếu được giải thích; không coi mọi verdict FAQ hẹp
là lỗi. Validation cấu trúc không chứng minh kết luận ngữ nghĩa đúng. Ba test bổ sung về thu thập gián đoạn đã qua, với
[ranh giới bằng chứng](content-search-audit-collection-gates-0127.md) ghi rõ.

Candidate 0.1.28 bổ sung [hợp đồng phạm vi đánh giá](content-search-audit-semantic-scope-design.md):
pass phải bao phủ toàn bộ phần áp dụng của rule trong item; đoạn đúng vẫn được giữ
đúng và không được bịa thêm câu hỏi để tạo lỗi. Các kiểm tra package và nâng cấp đã
qua. [Lượt native đầu](content-search-audit-trials/scope-0128/README.md) bị gián
đoạn bởi lỗi kết nối API/stream. [Lượt thử lại](content-search-audit-trials/scope-retry-0128/README.md)
đã hoàn tất: Codex không còn dùng FAQ đúng để pass rule answer-evidence của cả
hồ sơ; Claude vẫn bỏ review và quote verifier. Chỉ có bằng chứng cải thiện trong
một lượt phát triển, chưa đủ để kết luận độ tin cậy chung.

## 1. Kết luận sản phẩm

Xây dựng **một skill khách hàng duy nhất: `content-search-audit`**, hỗ trợ Codex và
Claude Code. Khách hàng gọi một lần; skill tự quản lý phạm vi, inventory, evidence,
đánh giá từng nội dung, phân tích toàn bộ tập nội dung và báo cáo. Không yêu cầu
khách hàng cài/gọi tuần tự các skill upstream.

Phần kế thừa là phương pháp đã review, có attribution, license và commit/digest
cố định. Không ghép nguyên văn hàng loạt prompt có quy tắc mâu thuẫn. Mã thu thập,
kiểm chứng và đóng gói của candidate là phần triển khai riêng; nguồn gốc từng file
được lưu trong provenance lock.

Sản phẩm hiện tại **audit nội dung**, không tự động sáng tác hàng loạt, sửa website,
đổi robots, xuất bản CMS hay triển khai production. Một workflow tạo nội dung sau
audit phải là phạm vi riêng, sử dụng backlog và bằng chứng đã được duyệt.

## 2. Phân biệt các thuật ngữ trong hợp đồng của skill

| Khía cạnh            | Câu hỏi cần trả lời                                                              | Bằng chứng phù hợp                                                                   | Điều không được suy diễn                                                                   |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Chất lượng nội dung  | Nội dung phục vụ ai, giải quyết việc gì, claim có căn cứ không?                  | Văn bản, nguồn chính sách/sản phẩm, audience/context được cung cấp                   | Văn phong giống AI không chứng minh tác giả là AI                                          |
| SEO                  | Nội dung có thể được crawl, hiểu và tổ chức phù hợp cho search không?            | HTTP, directives, canonical, liên kết, HTML/rendered evidence, dữ liệu search khi có | HTTP 200 không chứng minh đã được index/rank                                               |
| AIO                  | Nội dung và entity có đủ rõ, nhất quán và có thể truy xuất cho AI search không?  | Entity records, claim consistency, crawler/access evidence                           | Trong sản phẩm này AIO nghĩa là AI search optimization; Google AI Overviews được gọi riêng |
| AEO                  | Câu trả lời có giải quyết đúng câu hỏi, tự đủ ngữ cảnh và nêu giới hạn không?    | Bộ câu hỏi, định nghĩa, quy trình, so sánh, nội dung thực                            | Không có độ dài câu trả lời tối ưu phổ quát                                                |
| GEO                  | Thương hiệu/nội dung xuất hiện và được mô tả thế nào trong câu trả lời tạo sinh? | Observations theo engine, surface, thời gian, locale, prompt cohort; nguồn đối chiếu | Readiness không phải citation, recommendation hay doanh thu                                |
| Toàn bộ tập nội dung | Các trang có trùng, mâu thuẫn, bỏ trống hành trình hoặc sai lệch locale không?   | Inventory đầy đủ trong phạm vi, graph, topic/entity map, bằng chứng liên trang       | Một trang tốt không chứng minh cả website tốt                                              |

Các khía cạnh giao nhau. Không cộng sáu điểm số thành một chỉ số “đảm bảo lên top”.
Mỗi kết luận cần có phạm vi, bằng chứng và trạng thái unknown khi chưa đủ dữ liệu.

## 3. Nguồn được chọn và cách kế thừa

| Nguồn                               | Phần chọn                     | Vai trò trong custom skill                                      | Ràng buộc                                                                  |
| ----------------------------------- | ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Corey Haines / Marketing Skills     | `seo-audit`                   | Intake, thứ tự kiểm tra technical/on-page, tổ chức phát hiện    | Heuristic không trở thành luật ranking cứng                                |
| Corey Haines / Marketing Skills     | `content-strategy`            | Intent, audience, information gain, topic/journey               | Không bịa keyword volume, nhu cầu hay bằng chứng thị trường                |
| Profound / Skills Marketing Library | `ai-answer-accuracy-auditor`  | Đối chiếu claim trong câu trả lời AI với nguồn được chấp thuận  | Annotation có nguồn; hash không xác thực chân lý của annotation            |
| Profound / Skills Marketing Library | `ai-prompt-portfolio-builder` | Tổ chức prompt cohort, segmentation và theo dõi lặp lại         | Không gộp tùy tiện engine, surface, locale, cohort version                 |
| Profound / Skills Marketing Library | `aeo-operator-2026`           | Workflow AEO và phân biệt khả năng đáp ứng với kết quả quan sát | Không thừa hưởng cam kết tăng trưởng, vendor dependency hay quyền ghi ngầm |

Các nguồn đã chọn dùng MIT, attribution riêng được giữ trong package. Revision:

- [Corey đã review](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d): `1f837447b20bb6f0e72d87b80ece1c221c362c7d`.
- [Profound đã review](https://github.com/retieedra-profound/skills-marketing-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6): `80293f156c27d3f90aedebfb3c27309769b2eec6`.

Chín reference files trong hai thư mục Corey đã chọn đã được đọc và kiểm tra hash.
Nguồn được link từ upstream nhưng không nằm trong closure đã chọn không tự động
được kế thừa. Xem [review reference](content-search-audit-selected-reference-review.json)
và [provenance lock](../../skills/content-search-audit/provenance.lock.json).

## 4. Các họ skill so sánh, chưa đưa vào bundle

| Họ nguồn                                                               | Giá trị nghiên cứu                                     | Lý do không bundle nguyên bộ                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [Claude SEO](https://github.com/AgriciDaniel/claude-seo)               | Technical SEO, audit, rendered content và locale       | Phải tách phụ thuộc host/plugin; không mặc định tương thích Codex             |
| [RankXAI](https://github.com/rankxai/seo-geo-skills)                   | Evidence grading, crawler, Search Console/log workflow | Collector và tiêu chí cần review độc lập; adoption không chứng minh tính đúng |
| [TheSmokeDev GEO](https://github.com/TheSmokeDev/geo-skills)           | Prompt inventory và AI discovery/citation              | Phụ thuộc CLI và claim của công cụ không được thừa hưởng tự động              |
| [Gaguero](https://github.com/gaguero/seo-agent-skills)                 | Phân biệt observed/inferred và anti-spam               | Dùng đối chiếu phương pháp, không tạo thêm customer entrypoint                |
| [Zubair GEO SEO](https://github.com/zubair-trabzada/geo-seo-claude)    | Citability, brand authority, báo cáo theo platform     | Điểm số cần hiệu chỉnh; assumptions về script/host cần xác minh               |
| [Aaron SEO GEO](https://github.com/aaron-he-zhu/seo-geo-claude-skills) | Content, research và measurement                       | Cần phân biệt lịch sử standalone với repository đã đổi hướng                  |

Nguồn còn lại trong thiết kế ban đầu, URL `AgriciDaniel/codex-seo`, đã được xác
minh chuyển sang gói `chatgpt-seo`. Đã đọc 13 tài liệu tại commit cố định và ghi
[quyết định chỉ đối chiếu](content-search-audit-chatgpt-disposition.md). Không đưa
runtime, scoring hoặc mô hình nhiều skill của nguồn này vào bundle; sản phẩm
vẫn chỉ hỗ trợ Codex và Claude Code. Tổng cộng có bảy họ nguồn đối chiếu ngoài
năm phương pháp được chọn. [Receipt hiện tại](content-search-audit-source-closure-0126.json)
xác minh lại commit, digest, license và file đã khai báo của phần được kế thừa.

Mức độ review của từng họ không giống nhau. Bảng này là quyết định phạm vi, không
phải chứng nhận đã audit toàn bộ mọi repository. Xem [nhật ký upstream](content-search-audit-upstreams.md)
và các snapshot được liên kết trong đó để biết revision và độ sâu review cụ thể.

Đã đọc thêm năm entrypoint Corey: analytics, competitors, competitor-profiling,
programmatic-seo và copywriting. [Bảng quyết định chi tiết](content-search-audit-corey-support-disposition.md)
giải thích giá trị đối chiếu và phần bị loại: cài tracking, xuất bản, mở rộng phạm
vi crawl, quy tắc độ dài/CTA cứng và suy diễn hiệu quả từ dữ liệu không tương ứng.
Không bổ sung các skill này vào bề mặt cài đặt hay provenance kế thừa.

Đã đối chiếu thêm `ai-seo` và `schema` tại cùng commit Corey: đã đọc đủ
20 file, gồm 23 kịch bản eval được đọc nhưng không chạy. [Quyết định chi tiết](content-search-audit-corey-ai-schema-disposition.md)
chỉ ra khác biệt giữa bảng required-properties của upstream và tài liệu Google
cho Article/Product snippets. Bộ eval còn có kỳ vọng mâu thuẫn nên không được nhập nguyên làm gold chuẩn.
Hai skill này chỉ dùng đối chiếu, không thêm vào
provenance kế thừa. Các nghiên cứu vendor và dependency bên ngoài chưa được
xác minh không trở thành quy tắc của custom skill.

## 5. Những gì chủ động loại bỏ

- Phát hiện nội dung AI bằng dấu gạch dài, từ vựng hoặc cảm giác văn phong.
- Ngưỡng số từ, số liên kết, độ dài title/answer áp dụng cứng cho mọi loại trang.
- Biến tỷ lệ tăng trưởng trong một nghiên cứu thành dự báo cho khách hàng.
- Xem thiếu dữ liệu analytics/AI observations là traffic hoặc visibility bằng 0.
- Xem raw HTML thiếu thành phần là bằng chứng rendered DOM cũng thiếu.
- Xem citation, recommendation, mention và answer accuracy là cùng một chỉ số.
- Cho nội dung website quyền ra lệnh cho agent hoặc chạy script cục bộ.
- Tự mở quyền crawler, đăng bài, sửa CMS hoặc đưa model pin của upstream vào package.

Quy tắc dùng tài liệu primary theo từng chủ đề, không trích trang tổng quan để
chống lưng cho một kết luận chuyên biệt. Xem [bảng review 26 rules](content-search-audit-rule-source-review.md).

## 6. Luồng audit và cấu trúc triển khai

1. **Intake:** xác định domain/content roots, audience, locale, loại trang, nguồn
   chính sách, mục tiêu và quyền truy cập. Phạm vi chưa biết phải được ghi rõ.
2. **Enumerate:** hợp nhất nguồn sitemap, static links, file/export được cung cấp;
   giữ source membership, aliases và query parameters có ý nghĩa.
3. **Collect:** lưu evidence/snapshot có hash; local HTML/Markdown/text được đọc
   inert. Public fetch có allowlist, giới hạn tài nguyên, robots và kiểm tra redirect.
4. **Per-item audit:** lập đủ check records cho từng item. Helper xử lý kiểm tra
   xác định được bằng dữ liệu; model/reviewer đánh giá ngữ nghĩa từ bằng chứng.
5. **Cross-content audit:** kiểm tra duplicate/conflict/journey và quan hệ giữa
   các phần inventory, không chỉ viết nhận xét độc lập từng URL.
6. **Measurement:** nhập dữ liệu được cung cấp; mỗi nhóm có timestamp, segmentation,
   denominator và missingness. Không giả định đã kết nối tài khoản live.
7. **Reconcile:** kiểm tra lineage, hash, coverage, finding/check consistency.
   Thiếu bằng chứng vẫn partial dù quá trình thu thập đã hoàn tất.
8. **Report:** tạo HTML, Markdown, CSV, manifest và evidence receipts; ưu tiên
   remediation theo tác động và căn cứ, không tự sửa nội dung gốc.

| Thành phần           | Đường dẫn                                                      | Trách nhiệm                                      |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| Entry point duy nhất | `skills/content-search-audit/SKILL.md`                         | Điều phối và ranh giới hành vi                   |
| Hướng dẫn chi tiết   | `skills/content-search-audit/references/`                      | Progressive disclosure theo công việc            |
| Rule registry        | `skills/content-search-audit/rules/core.json`                  | 26 rule IDs, applicability, evidence và giới hạn |
| Scripts              | `skills/content-search-audit/scripts/`                         | Thu thập, state/resume, validation và report     |
| Schemas              | `skills/content-search-audit/schemas/`                         | Hợp đồng record có thể kiểm tra máy              |
| Attribution          | `NOTICE.md`, `licenses/`, `provenance.lock.json` trong package | Nguồn gốc, license và file digests               |
| Solution manifest    | `solutions/content-search-audit.yaml`                          | Version, outcome, hosts, component lock          |
| Evaluation           | `tests/` và `docs/research/content-search-audit-trials/`       | Regression và bằng chứng native host             |

Xem [thiết kế chi tiết](../specs/content-search-audit.md) cho data model, security,
coverage, report contract và acceptance gates; [kế hoạch triển khai](../plans/content-search-audit.md)
cho từng task và lịch sử thực hiện.

## 7. Đo lường đúng

**Mention rate:** số response có annotation nhắc brand / số response captured có
annotation mention xác định trong cùng segment. Annotation null không vào mẫu số.

**Citation rate:** số response có ít nhất một citation khớp brand host được khai báo /
số response có annotation citation xác định. Đây không phải tỷ trọng của mọi citation.

**Claim accuracy:** số claim được review là correct / số claim correct + incorrect.
Claim unknown tách riêng. Không được hiểu đây là độ chính xác của mọi claim chưa review.

**Response accuracy:** số response đủ điều kiện mà mọi claim đều correct / số response
có inventory claim complete, không rỗng và không có verdict unknown. Response chưa
review, inventory chưa đủ hoặc có claim unknown không được âm thầm tính là đúng/sai.

Mẫu số 0 trả về unavailable/null. Ghi riêng số response chưa review, claim unknown,
inventory rỗng/chưa đủ; không cộng các nhóm chồng lấn thành một population mới.
Snapshot nguồn và quote phải khớp bytes đã hash. Điều đó kiểm chứng binding, không
xác nhận danh tính reviewer, nguồn capture hay tính đúng của lời adjudication.

GSC, GA4, Bing, log và AI observations hiện là **supplied exports/observations**.
Không tuyên bố đã có authenticated live integration hoặc đo uplift thực nghiệm.
Xem [hợp đồng measurement](../../skills/content-search-audit/references/measurement.md).

## 8. Bằng chứng tại các mốc trước và giới hạn của chúng

| Bằng chứng hiện có                                                 | Kết luận được phép                                       | Chưa chứng minh                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------- |
| 59 test files / 423 tests (0.1.13); format, lint, typecheck, build | Kiểm tra tự động tại mốc đó pass                         | Không thay thế đánh giá ngữ nghĩa                                    |
| Fresh archive installs trên Codex, Claude Code và combined         | Package/digests/provenance/install lock hợp lệ           | Không tự chứng nhận mọi workflow khách hàng                          |
| Native semantic cases trên cả hai host                             | Các gold issues chính của tập case đã được tìm thấy      | Chưa có precision/recall tổng quát được chấp nhận                    |
| Public NKSkills pilot                                              | Hai host tạo artifacts partial có thể kiểm tra           | Không phải full-site rendered audit                                  |
| SIGKILL sau committed checkpoint với 1.200 items                   | Hai host tiếp tục và kiểm tra accounting                 | Không chứng minh crash consistency ở mọi điểm giữa multi-file writes |
| Native accuracy 0.1.7                                              | Hai host diễn giải đúng denominator, unknown và partial  | Không đo visibility live hay xác thực mọi annotation                 |
| 0.1.8 CLI regression và installed replay                           | Sửa lỗi campaign CLI từ trial; evidence input giữ nguyên | Chưa có native session mới riêng cho 0.1.8                           |

Một lỗi thực tế đáng chú ý: 0.1.7 renderer nhận AI measurements nhưng campaign CLI
chặn trường này. Cả hai host phát hiện và dùng renderer trực tiếp. Bản 0.1.8 sửa
allowlist, có regression đỏ trước sửa/xanh sau sửa và replay từ gói cài mới.
Xem [bằng chứng trial](content-search-audit-trials/native-accuracy-017/README.md).

## 9. Điều kiện trước phát hành thương mại

- Hoàn thiện các fixture ngữ nghĩa còn thiếu. Bộ mixed-source/cặp locale thực sự đã chạy trên hai host ở 0.1.8: cả hai tìm đúng hai lỗi chính và giữ clean controls; Claude vẫn đề xuất một workflow Search Console đã ngừng hỗ trợ. Xem [trial](content-search-audit-trials/mixed-locale-018/README.md).
- Đánh giá findings đúng/sai, clean controls, reporting errors và instruction failures
  với mẫu số rõ ràng; không chỉ kiểm tra “có tìm thấy lỗi được gieo hay không”.
- Hoàn tất kiểm tra fidelity của báo cáo; những sai lệch đã quan sát trong các trial
  cũ vẫn được giữ lại, không xóa bằng chứng vì phiên bản sau có một case thành công.
- Reconcile từng mục kế hoạch với artifact thực tế, rồi kiểm tra package cuối cùng,
  upgrade và khả năng phục hồi phù hợp với bytes sẽ phát hành.
- Thực hiện independent human acceptance theo hợp đồng đã thiết kế.

Commercial catalog chưa thay đổi; chưa push/deploy/publication cho candidate này.
[Completion audit](content-search-audit-completion-audit.md) là danh sách phần còn
mở, không dùng tình trạng pass unit tests để tuyên bố sản phẩm hoàn tất.

## 10. Cập nhật kiểm chứng 0.1.9

Bổ sung bước kiểm tra tính hiện hành của công cụ/tính năng được đề xuất trong báo
cáo. Hai host chạy lại cùng prompt/dữ liệu không lặp khuyến nghị International
Targeting đã ngừng hỗ trợ; Claude đánh dấu rõ công cụ tùy chọn chưa xác minh khi
offline. Cả hai vẫn tìm đúng hai lỗi chính. Claude còn mô tả quá rộng dữ liệu CMS
và có tóm tắt AEO mâu thuẫn với F1; chưa đạt nghiệm thu ngữ nghĩa tổng thể.

Fresh installs, nâng cấp 0.1.8 → 0.1.9, từ chối package đã sửa và phục hồi snapshot
cô lập đều được kiểm chứng. 416 tests và các root checks pass. Xem [trial và giới
hạn](content-search-audit-trials/capability-freshness-019/README.md).

## 11. Backlog có thể bàn giao — 0.1.10

Sửa lỗi báo cáo campaign làm mất owner/effort của finding từng phần. HTML, Markdown
và CSV hiện giữ đủ metadata này; finding toàn cục cũ chưa có thông tin ghi rõ
`Not supplied`. Metadata được cung cấp sai kiểu bị từ chối. Ba cấu hình cài mới và
CLI đã được kiểm tra bằng transport giả lập; 417 tests và root checks pass.
[Bằng chứng](content-search-audit-trials/backlog-0110/README.md). Các giới hạn về
đánh giá ngữ nghĩa và nghiệm thu độc lập vẫn giữ nguyên.

## 12. Hoàn thiện đầu ra đã cam kết — 0.1.11

Bổ sung coverage.json cho campaign, JSONL quan sát AI có nhãn synthetic/hash evidence,
và bảng nguồn/ngày review của 26 rules. Ba cấu hình cài mới đều được kiểm tra qua
CLI với artifact lịch sử; dữ liệu gốc giữ nguyên, schema và manifest hashes khớp.
418 tests cùng root checks pass. [Bằng chứng](content-search-audit-trials/output-parity-0111/README.md).
Cột loại hành động, các lỗi diễn giải ngữ nghĩa và nghiệm thu độc lập vẫn còn mở.

## 13. Quyết định hành động trong backlog — 0.1.12

Hai đường báo cáo dùng chung keep/update/consolidate/investigate, kèm lý do và nhãn
phân biệt reviewer đề xuất với triage mặc định. CLI trên ba bản cài mới giữ nguyên
inventory/checks/evidence khi tạo bốn revision; 419 tests cùng root checks pass.
Quyết định không cấp quyền sửa, xóa hay gộp nội dung. [Bằng chứng](content-search-audit-trials/actions-0112/README.md).

## 14. Truy vết rule → nguồn → fixture

[Bảng truy vết đầy đủ](content-search-audit-rule-traceability.md) nối 26 rules với
section upstream tại commit cố định, tài liệu primary/context, phương pháp nội bộ
và fixture cần kiểm chứng. Năm source pins đã được kiểm tra lại commit và tree
digest. Bảng phân biệt rõ case đã có với benchmark còn thiếu; không suy diễn chất
lượng phương pháp từ license, stars hoặc hash. Đây là đối chiếu snapshot, không
phải một lần xác minh mới toàn bộ tài liệu trên Internet.

## 15. Tuổi nguồn tại mốc báo cáo — 0.1.13

Báo cáo đơn và campaign hiện tính tuổi bằng chứng, ngày review rule, export và
quan sát AI theo một mốc báo cáo UTC duy nhất. Phân biệt ngày lịch khi nguồn chỉ
có ngày với chu kỳ 24 giờ khi có timestamp; ngày thiếu/sai/tương lai là unavailable.
Tuổi export không thay thế khoảng đo thực tế và không tự kết luận nội dung cũ/sai.
Ba bản cài mới đã kiểm chứng đầu ra và giữ nguyên input; 423 tests cùng root checks
pass. [Bằng chứng](content-search-audit-trials/source-age-0113/README.md).

## 16. Loại nội dung khai báo — 0.1.14

Inventory mới có `type`: một giá trị khai báo duy nhất được giữ lại; không có
hoặc có nhiều giá trị thì là `unknown`. Không suy luận từ extension/MIME. Validator
từ chối type trái với candidates; inventory lịch sử không có type vẫn đọc được.
Hai regression đỏ trước sửa và xanh sau sửa; toàn bộ 425 tests, lint, typecheck,
build và format pass. Archive mới được giải nén và cài vào ba project mới cho
Codex, Claude Code và combined; normalizer được chạy từ từng package đã cài.
Đây không phải native model trial mới. Xem [receipt](content-search-audit-type-installation-snapshot.json).
Metadata scope/permissions/budgets trong run.json, redaction và các lỗi diễn giải
ngữ nghĩa còn mở; chưa phát hành thương mại.

## 17. Hợp đồng run — 0.1.15

Run format 0.2.0 bổ sung scope, sourcePermissions và budgets, đối chiếu với
config.json và configHash khi validate. Resume giữ cấu hình mới; revision kiểm
tra cấu hình trước ghi. Ba cấu hình cài mới chạy CLI thành công và từ chối budget
bị sửa; 427 tests cùng root checks pass. Xem [trial](content-search-audit-trials/run-contract-0115/README.md).
Redaction, extraction gaps và nghiệm thu ngữ nghĩa vẫn chưa hoàn tất.

## 18. Bản bằng chứng đã che — 0.1.17

Thêm `redact-evidence` tạo derivative văn bản theo danh sách literal khai báo,
giữ snapshot gốc và liên kết hash gốc/hash mới. Đầu ra không chép config, policy
hay locators gốc. Đây chưa phải bộ báo cáo đã xử lý để chia sẻ: dữ liệu chưa khai
báo hoặc có encoding khác có thể còn nguyên. 428 tests và kiểm tra ba bản cài
mới pass; xem [trial](content-search-audit-trials/redaction-0117/README.md).
Archive 0.1.16 được giữ nguyên và thay thế bởi 0.1.17 sau sửa import phục vụ lint.

## 19. Báo cáo đã che cho standalone/partition — 0.1.18

`redact-report` xuất HTML/Markdown/CSV/coverage và bằng chứng derivative cùng hash
manifest. Nội dung hiển thị được che trước escape; links/hash trỏ tới derivative,
coverage số học giữ nguyên từ audit gốc. Báo cáo ghi rõ đây là bản trình bày đã
biến đổi. 429 tests và ba bản cài mới pass. [Trial](content-search-audit-trials/redacted-report-0118/README.md).
Chưa gồm campaign-wide report, narrative riêng hay measurement exports. Chính sách
literal không tự phát hiện mọi dữ liệu riêng tư; nghiệm thu ngữ nghĩa còn mở.

## 20. Báo cáo campaign đã che — 0.1.19

Thêm `campaign-redact-report`: giữ coverage gốc, che nội dung hiển thị trước escape,
đổi links sang derivatives cục bộ và ghi hash nguồn/hash mới. Receipt context được
parse trước che các giá trị chuỗi. Báo cáo partition gốc và measurement exports
không được chép sang; điều này được ghi rõ trong báo cáo. 430 tests và ba bản cài
mới pass. [Trial](content-search-audit-trials/redacted-campaign-0119/README.md).
Chia sẻ measurement exports và nghiệm thu ngữ nghĩa vẫn còn mở.

## 21. Measurement attachments đã che — 0.1.20

Hai lệnh xuất báo cáo đã che nhận OPTIONS.json tùy chọn. GSC/GA4/Bing/log/AI
observations được validate từ bản gốc, rồi xuất dưới wrapper bản trình bày đã
biến đổi, có hash nguồn và hash file đầu ra. Không được nhập derivative như export
gốc hoặc dùng hash cũ để xác thực quote đã che. 431 tests và cả hai đường CLI
trên ba bản cài mới pass. [Trial](content-search-audit-trials/redacted-measurements-0120/README.md).
Phần triển khai chia sẻ theo literal đã bao gồm standalone/campaign/measurements;
không chứng nhận tự động hết mọi dữ liệu riêng tư. Nghiệm thu ngữ nghĩa còn mở.

## Kiểm chứng mới nhất: 0.1.21

Bản candidate bổ sung verifier đối chiếu trích dẫn với dòng nguồn và hash của
báo cáo cuối. Năm lần chạy Claude đều có receipt tái kiểm tra thành công. Tuy
nhiên, hai lần còn lỗi hoặc cách diễn đạt mơ hồ về kết luận; một đoạn trích đúng
ký tự nhưng bỏ mất phủ định của câu nguồn. Vì vậy, chưa thể xem skill là đạt
nghiệm thu ngữ nghĩa hoặc sẵn sàng phát hành thương mại. Xem
[bằng chứng và lỗi còn lại](content-search-audit-trials/fidelity-candidate-0121/README.md).

## Kiểm chứng toàn bộ bộ hồ sơ: 0.1.22

Codex và Claude Code đã chạy lại đủ 12 hồ sơ phát triển, mỗi host tìm đủ 15 lỗi.
Lỗi phủ nhận thay đổi mô tả và trích dẫn mất phủ định không tái xuất hiện trong
lần này. Codex đạt rubric nội bộ của lần chạy; Claude còn lỗi về qualifier giá,
suy đoán cơ chế render, cỡ mẫu và lời khuyên về điều kiện hiển thị. Bản candidate
vẫn chưa được nghiệm thu thương mại. Bằng chứng đầy đủ ở
[trial 0.1.22](content-search-audit-trials/semantic-0122/README.md).

## Đối chiếu nguồn hiện tại cho 26 quy tắc

Đã kiểm tra lại 5 pin upstream, license, 9 file tham chiếu và 16 tài liệu chính
thức; đối chiếu đủ 26 quy tắc với phương pháp nội bộ và bằng chứng fixture mới.
Không đổi pin hoặc nội dung package trong bước này. Xem
[bản đối chiếu có nguồn và giới hạn](content-search-audit-source-reconciliation-0122.md).
Đây là kiểm chứng cơ sở phương pháp, không phải bằng chứng skill luôn suy luận đúng.

## Phục hồi PDF có nguồn gốc — 0.1.23

Bổ sung `collectionRecoveries` trong cùng lệnh review: kiểm tra bytes/hash file
PDF gốc, phạm vi truy cập, bằng chứng từng trang và người review trước khi chuyển
unsupported thành pending. Không tự đánh dấu nội dung đạt. 448 tests và root
checks pass; gói giải nén cài mới cho Codex, Claude Code và combined đều phục hồi
PDF hai trang Anh–Việt, giữ image-only unsupported và báo cáo partial. Đây là
kiểm chứng helper với đầu ra PDFKit thật đã lưu, không phải lần chạy model mới.
Xem [bằng chứng và giới hạn](content-search-audit-trials/extraction-recovery-0123/README.md).

## Aaron: quyết định sau khi đối chiếu dependency

Đã đọc thêm runtime contract, catalog CORE-EEAT, scorer và các reference liên quan;
ba probe tổng hợp xác nhận khác biệt giữa hướng dẫn ngắn/local reference và
scorer về N/A, một veto và hai veto khi còn thiếu bằng chứng. Giữ nhóm này ở mức
reference-only; không nhập scorer, refinement loop hoặc runtime vào package.
Xem [quyết định có nguồn và bằng chứng thực thi](content-search-audit-aaron-disposition.md).
Đây là quyết định cho bản bundle hiện tại, không phải review toàn bộ repository.

## RankXAI: quyết định sau khi kiểm tra helper

Đã đọc các reference và dependency của source/overlap checker, chạy bốn probe
có kiểm soát. Exit 0 có thể còn nguồn unknown; một con số trùng trong link không
chứng minh claim có nguồn; overlap không chứng minh cần gộp nội dung. Giữ nhóm
này reference-only, không nhập runtime hoặc workflow tự rewrite vào bundle.
[Báo cáo, bằng chứng và giới hạn](content-search-audit-rankxai-disposition.md).

## TheSmokeDev và Gaguero: chốt phạm vi kế thừa

Giữ hai nhóm ở mức reference-only. Đã đối chiếu phương pháp đo với các ví dụ
mẫu số, chạy bốn probe CLI và hai case schema, đồng thời kiểm tra tài liệu
provider về crawler và hidden text. Không nhập suy luận nhân quả, publication
gate hoặc regex linter vào bundle. [Quyết định và bằng chứng](content-search-audit-geo-gates-disposition.md).

## Quyết định nguồn cho bundle hiện tại

Đã có quyết định cụ thể cho cả sáu nhóm so sánh: reference-only, không nhập
runtime. Năm skill nguồn đã chọn tiếp tục cung cấp phương pháp qua provenance
lock. [Bảng quyết định nguồn](content-search-audit-source-decisions.json) liên kết
bằng chứng cho từng nhóm; [đối chiếu AgriciDaniel/Zubair](content-search-audit-orchestrator-disposition.md)
ghi rõ giới hạn crawl, ngoại lệ Shopify, score và dependency. Hoàn tất quyết định
lựa chọn không có nghĩa đã review mọi file của các repository hoặc đạt nghiệm thu
ngữ nghĩa; các điều kiện phát hành còn mở.

## Đối chứng báo cáo ngắn, không cài skill

Năm session Claude Code mới xử lý bốn hồ sơ phát triển với cùng prompt, không
cài custom skill và không dùng tools. Điều kiện giá và mẫu số được giữ đúng;
vẫn có lời khuyên prerequisite thiếu phạm vi, khẳng định tác động chưa quan sát
và mâu thuẫn giữa tóm tắt với bảng findings. Đây là nhóm đối chứng để thiết kế
thử nghiệm tiếp theo, không phải kết quả chạy candidate hay nghiệm thu độc lập.
Không thay đổi package 0.1.23. [Báo cáo và dữ liệu nguyên bản](content-search-audit-trials/semantic-micro-control-0123/README.md).

## Thử nghiệm hướng dẫn và trích xuất native trên 0.1.23

Hai cách viết bổ sung cho phần báo cáo đã được thử với nhóm đối chứng, năm lượt
mỗi nhóm; chưa cải thiện ổn định nên không đưa vào package. [Bằng chứng](content-search-audit-trials/semantic-recipe-0123/README.md).

Hai host đã tự xử lý HTML/PDF gốc từ gói cài mới, gồm OCR thật cho PDF ảnh.
Các run và quote receipts được kiểm tra lại; cả hai giữ ba item pending và báo
cáo helper partial. Claude có DOM thực nhưng lời trả cuối ghi sai “3/3 audited”.
Codex báo đúng browser unavailable, nhưng chạy script đích trong Node VM ngoài
phạm vi chỉ cho phép browser. Các lỗi này ngăn nghiệm thu; không đổi package.
[Trial, artifacts và giới hạn](content-search-audit-trials/native-extraction-0123/README.md).

## Context, coverage và giới hạn thực thi — 0.1.24/0.1.25

Bản 0.1.24 yêu cầu lưu policy đã có thành evidence và lấy số fully audited từ
coverage. Native Claude đã thực hiện đúng hai điểm này. Codex thử biến môi trường
tắt sandbox WebKit sau lỗi browser; lượt đó bị dừng, không có báo cáo cuối và
không được chấp nhận. [Bằng chứng 0.1.24](content-search-audit-trials/native-extraction-0124/README.md).

Bản 0.1.25 bổ sung ranh giới không thay đổi bảo vệ browser/OS để hoàn thành capture.
448 tests và root checks pass; archive riêng đã cài mới trên hai host và combined.
Lượt native đã kiểm tra ba điểm mục tiêu: không ghi nhận lại workaround bị cấm,
policy được dùng làm evidence và số fully audited đúng. Codex chạm deadline
harness rồi hoàn tất bàn giao từ artifact đã lưu; 55 artifact trước đó giữ nguyên.
Đây không phải một lượt chạy liên tục hoặc nghiệm thu độc lập.
[Bằng chứng 0.1.25](content-search-audit-trials/native-extraction-0125/README.md).
Các lỗi của bộ 12 hồ sơ ngữ nghĩa vẫn cần kiểm tra lại trước khi phát hành.

## Kết quả mới nhất: scope retry 0.1.28

Hai host đều tìm được sáu lỗi trong bốn hồ sơ tổng hợp. Codex lưu sáu findings,
hoàn thành 15/104 checks và đối chiếu thành công 16 trích dẫn. Claude vẫn bỏ bước
`review` và `verify-quotes`, nên artifact còn 104 checks unknown và không có finding
đã lưu. Cả hai báo đúng 0 fully audited, 4 pending. Đây là thử nghiệm phát triển
lặp lại, chưa phải nghiệm thu độc lập hoặc bằng chứng đủ điều kiện phát hành.

[Trial và dữ liệu gốc](content-search-audit-trials/scope-retry-0128/README.md) lưu
91 file đã đối chiếu byte. [Source closure 0.1.28](content-search-audit-source-closure-0128.json)
kiểm tra lại pin, license, provenance, package và archive. Phần tham khảo chưa review
và lỗi tuân thủ quy trình của Claude vẫn còn mở; chưa promote bản thương mại.

## Thử nghiệm có ví dụ review tham khảo

Một phiên Claude mới được cung cấp ví dụ review tổng hợp ngoài dữ liệu audit.
Lần này host lưu đủ sáu findings, hoàn thành 15/104 checks và kiểm chứng 30
trích dẫn. Tuy nhiên, báo cáo còn suy luận chưa chặt về median; phản ví dụ và
dữ liệu gốc đã được lưu. Prompt có thay đổi nên không coi đây là nghiệm thu
candidate nguyên trạng hoặc bằng chứng cải thiện có tính nhân quả.
[Xem trial](content-search-audit-trials/worked-native-0128/README.md).

Đã đọc thêm toàn bộ ba reference và mười eval case của copywriting tại pin đã
chọn. [Quyết định chi tiết](content-search-audit-copywriting-reference-disposition.md)
giữ nguồn này ở mức tham khảo, không nhập các style ban, CTA bắt buộc hay dự báo
tăng trưởng. Các nguồn bên ngoài được dẫn lại vẫn chưa được review đầy đủ.

## Candidate 0.1.29: ví dụ review tích hợp

Đã đưa ví dụ review chạy được vào chính package và liên kết từ entrypoint/helper
guide. Khách hàng vẫn chỉ gọi một skill. Ví dụ tạo dữ liệu tổng hợp riêng, minh
họa evidence → verdict → finding → validation → quote receipt; không áp dụng
phán quyết cố định vào nội dung khách hàng. Hợp đồng evidence cũng làm rõ rằng
median không đủ để suy ra phân bố, tail, maximum hoặc bảo đảm.

455 tests và toàn bộ root checks đã qua. Archive mới đã giải nén, cài đặt và chạy
ví dụ trên Codex, Claude Code và cấu hình kết hợp. Nâng cấp 0.1.28 → 0.1.29 từ
chối file đã sửa mà không làm mất file/lock; nâng cấp sạch khớp package.
[Bằng chứng cài đặt/nâng cấp](content-search-audit-0129-upgrade-snapshot.json) và
[source closure](content-search-audit-source-closure-0129.json) xác minh byte và
provenance, không thay thế thử nghiệm hành vi native. Bản mới chưa được nghiệm
thu ngữ nghĩa trên hai host và chưa được promote vào catalog thương mại.

## Native 0.1.29: hai host đã lưu đầy đủ review

Với prompt gốc, cả Codex và Claude đều lưu sáu findings và giữ đúng 0 fully
audited, 4 pending. Codex kiểm chứng 17 trích dẫn; Claude kiểm chứng 22. Không
lặp lại lỗi suy luận median. Tuy nhiên, Claude thêm nhận định sai về hướng sai
lệch của tỷ lệ dùng hai cửa sổ thời gian khác nhau và còn vi phạm quy ước RTK.
[Trial nguyên bản](content-search-audit-trials/native-0129/README.md) lưu 126 file
đã đối chiếu byte. Đây là tiến bộ quy trình trong thử nghiệm phát triển, chưa
phải nghiệm thu tổng thể.

Đã hoàn tất đọc local references/evals cho hai nhóm tham khảo nữa:
[competitors](content-search-audit-competitors-reference-disposition.md) và
[programmatic SEO](content-search-audit-programmatic-reference-disposition.md).
Các phương pháp vẫn ở mức tham khảo; không nhập runtime hay pin mới.

## Hoàn tất đọc tài liệu local của năm nhóm hỗ trợ

Đã đọc đủ năm entrypoint, mười hai reference và bốn mươi eval case của analytics,
competitors, competitor profiling, programmatic SEO và copywriting tại pin đã
review. Eval chỉ được đọc, chưa chạy. [Bảng quyết định tổng hợp](content-search-audit-corey-support-disposition.md)
giữ cả năm ở mức tham khảo, không thêm dependency hoặc bắt khách hàng gọi skill
khác. Một số hướng dẫn GA4/GTM cũ đã được đối chiếu tài liệu Google và loại khỏi
phần kế thừa. Nguồn bên ngoài và các họ ứng viên khác vẫn có giới hạn review riêng;
đây không phải tuyên bố đã kiểm chứng toàn bộ ecosystem.

## Bổ sung nghiên cứu copy-editing

Đã đọc đầy đủ skill copy-editing ở cùng commit Corey đã khóa: entrypoint, ba
reference và chín tình huống eval. Hash của năm file và giấy phép MIT đã được
đối chiếu; chưa chạy chín eval đó. Tổng nhóm support hiện có sáu skill đối chiếu,
15 reference và 49 tình huống eval đã đọc, vẫn không thêm skill khách hàng phải gọi.

Giữ phương pháp giải thích lý do sửa, tôn trọng giọng tác giả và kiểm tra bằng
chứng cho claim. Không biến tuổi số liệu thành lỗi tự động, không thay năm thu thập
của nghiên cứu lịch sử bằng năm hiện tại, không yêu cầu mọi tài liệu có CTA/cảm xúc,
và không dùng dấu câu để suy ra tác giả AI. Các điểm này đã nằm trong hợp đồng
audit nên chưa cần sửa package. Copy-editing được giữ ở mức reference-only;
nguồn phái sinh bên ngoài chưa được coi là đã đủ điều kiện phân phối lại.

[Xem đánh giá chi tiết và nguồn chính thức](content-search-audit-copy-editing-reference-disposition.md).

## Bổ sung nghiên cứu site-architecture

Đã đọc đầy đủ entrypoint, bốn reference và tám eval của site-architecture, xác minh
hash sáu file tại commit đã khóa. Nhóm support hiện có bảy skill đối chiếu,
19 reference và 57 eval đã đọc; chưa chạy các eval upstream này.

Kết luận: giữ inventory và hành trình người dùng làm cơ sở đánh giá; không tự
biến số lần nhấp, số mục menu hay mật độ link thành lỗi. Breadcrumb có thể phản ánh
hành trình khác với cấu trúc URL; đường dẫn khác chữ hoa/thường và query có ý nghĩa
không được tự gộp. Đồ thị được vẽ là mô hình cần ghi rõ nguồn, không tự chứng minh
website đã được crawl đầy đủ. Không triển khai redirect hoặc thay CMS từ một yêu
cầu audit. [Nguồn và đánh giá chi tiết](content-search-audit-site-architecture-disposition.md).

## Đối chiếu sâu năm agent chuyên trách của Zubair

Đã đọc đầy đủ 1580 dòng trong năm agent về AI visibility, content, schema,
platform và technical, tại commit đã khóa; license và hash từng file được
kiểm chứng. [Bản đánh giá](content-search-audit-zubair-agent-disposition.md)
giữ nguồn này ở mức tham khảo, loại các điểm số visibility không có quan sát,
suy luận ranking từ chất lượng trang, nhận diện tác giả AI bằng văn phong và
khuyến nghị schema lỗi thời. Các nested skills/runtime chưa được nhập vào gói;
khách hàng tiếp tục chỉ gọi một skill của chúng ta.

## Bổ sung đối chiếu nested skills và runtime Zubair

Đã đọc đầy đủ bốn nested skills, fetcher và requirements (2.133 dòng),
khóa hash từng file ở revision đã review. Giữ quyết định reference-only:
collector mất navigation, dùng URL ban đầu để resolve link sau redirect,
robots parser không đủ grouping/precedence và sitemap không giữ queue còn lại.
Không chạy upstream hoặc cài dependency; transitive dependencies và các claim
nghiên cứu ngoài vẫn chưa đóng. Candidate 0.1.31 không đổi.
Chi tiết: [runtime disposition](content-search-audit-zubair-runtime-disposition.md).
