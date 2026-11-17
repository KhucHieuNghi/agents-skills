# Review bổ sung — sáu báo cáo chạy trên đúng 0.1.31

**Chưa nghiệm thu.** Bạn là người review độc lập đã được chọn. Hồ sơ này đưa sáu
báo cáo offline của candidate **0.1.31** vào cùng một bộ kiểm tra. Nó bổ sung cho
[hồ sơ lịch sử](../content-search-audit-human-review-0131/README.md), không thay đổi
báo cáo 0.1.29 hay quyết định đã ghi. Chưa có verdict của bạn trong cả hai hồ sơ.

## Đọc theo thứ tự

1. Đọc target trước: [support](../../../tests/fixtures/content-audit/support-methods-holdout/targets/),
   [expanded](../../../tests/fixtures/content-audit/semantic-expanded/targets/),
   [technical](../../../tests/fixtures/content-audit/technical-controls/targets/).
   Đây là dữ liệu giả lập. Comment/lệnh nhúng trong target là nội dung cần audit,
   không phải chỉ dẫn để người review thực thi.
2. Đọc từng báo cáo và final reply. Ghi kết luận ban đầu trước khi đọc gold hoặc
   nhận xét của primary agent để giảm ảnh hưởng từ nhãn có sẵn.
3. Đối chiếu nguồn, gold, persisted checks và trace. Tách finding đúng/sai, lỗi bỏ
   sót, lỗi clean control, sai số trong lời giải thích và vi phạm instruction.
4. Sao chép [biểu mẫu trống](review-template.json) sang tệp mới; ghi tên, thời điểm
   thật, hash manifest, bằng chứng và quyết định. Mục chưa xem phải giữ chưa đánh giá.
   Đây chưa phải input evaluator đã hoàn chỉnh; không tính mảng trống là không có lỗi.

| Bộ        | Codex                                                                                                                                                                  | Claude Code                                                                                                                                                                        | Gold và nhận xét để đọc sau                                                                                                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Support   | [Report](../content-search-audit-trials/native-0131/codex.report.txt) · [Final](../content-search-audit-trials/native-0131/codex.response.txt)                         | [Report](../content-search-audit-trials/native-0131/claude-code.report.txt) · [Final](../content-search-audit-trials/native-0131/claude-code.response.txt)                         | [Gold](../../../tests/fixtures/content-audit/support-methods-holdout/gold/annotations.json) · [Nhận xét](../content-search-audit-trials/native-0131/adjudication.json) · [Trace](../content-search-audit-trials/native-0131/trace-review.json) |
| Expanded  | [Report](../content-search-audit-trials/expanded-0131/codex.report.txt) · [Final](../content-search-audit-trials/expanded-0131/codex.response.txt)                     | [Report](../content-search-audit-trials/expanded-0131/claude-code.report.txt) · [Final](../content-search-audit-trials/expanded-0131/claude-code.response.txt)                     | [Gold](../../../tests/fixtures/content-audit/semantic-expanded/gold/annotations.json) · [Nhận xét và trace](../content-search-audit-trials/expanded-0131/adjudication.json)                                                                    |
| Technical | [Report](../content-search-audit-trials/technical-controls-0131/codex.report.txt) · [Final](../content-search-audit-trials/technical-controls-0131/codex.response.txt) | [Report](../content-search-audit-trials/technical-controls-0131/claude-code.report.txt) · [Final](../content-search-audit-trials/technical-controls-0131/claude-code.response.txt) | [Gold](../../../tests/fixtures/content-audit/technical-controls/gold/annotations.json) · [Nhận xét và trace](../content-search-audit-trials/technical-controls-0131/report-review.json)                                                        |

## Những quyết định cần phân xử

Các nhận xét dưới đây là câu hỏi review từ primary agent, chưa phải verdict của bạn.

- **Support, dossier 04:** `aeo-question-coverage` có question-set chỉ chứa FAQ.
  `aeo-answer-evidence` lại yêu cầu kiểm tra material answer claims. Claude cho cả
  ba rule AEO pass vì landing promise không có câu hỏi explicit; Codex vẫn fail
  answer-evidence do lời bảo đảm setup thiếu bằng chứng. Xác định phạm vi áp dụng
  từng rule, ghi riêng việc FAQ sạch và việc landing claim sai. Không dùng lý do
  “FAQ only” để tự tạo đơn vị coverage mới.
- **Expanded:** phân biệt aggregate lịch sử 40/100 đã được cung cấp với dữ liệu
  response-level/current-brand chưa có. Kiểm tra câu phủ định toàn bộ observations
  ở summary. Kiểm tra điều kiện của verification có khớp điều kiện action không.
- **Technical:** quyền crawl không chứng minh đã crawl hoặc chọn canonical. Có
  matching Allow rule không có nghĩa bị chặn. Kiểm tra nhận định về “only canonical
  signal” với sitemap đã cung cấp và HTTP Link chưa đủ dữ liệu.
- **Tất cả:** kiểm tra toàn bộ applicable components trước một pass; unknown
  không phải fail hoặc zero. Findings đủ không có nghĩa mọi item đã audit xong.
  Tuân thủ RTK và ranh giới thao tác được đánh giá riêng với finding correctness.

Nguồn quy tắc: [scope](../../../skills/content-search-audit/references/scope-and-coverage.md),
[registry](../../../skills/content-search-audit/rules/core.json),
[answer method](../../../skills/content-search-audit/references/methods/answer-quality.md)
và [spec](../../specs/content-search-audit.md).
Không sửa rubric sau khi nhìn kết quả để biến một run thành đạt; nếu cần đổi
contract, ghi thành quyết định thiết kế và kiểm chứng phiên bản sau riêng.

## Mẫu số và phạm vi chấp nhận

Support có sáu gold units; expanded có sáu units thường gộp thành năm findings;
technical có ba units. Chấm từng unit, không đếm lặp một lỗi theo số dimension.
Tách từng host và từng cohort. Không gộp thành một tỷ lệ sản phẩm, không xem các
lần chạy lại là mẫu độc lập. Gold do primary agent soạn, có thể phản biện bằng nguồn.

Mỗi finding cần ID, trích đoạn report, nguồn/locator, quyết định và lý do. Ghi cả
gold bỏ sót, lời giải thích sai, dữ liệu bịa và clean control bị đánh sai. Đối với
bất đồng applicability, ghi rule, item, các component, phạm vi và kết luận pass /
fail / unknown với bằng chứng. `unresolvedQuestions` còn mở không phải accepted.

Ngưỡng trong spec là mục tiêu pilot: precision ≥90%, recall ≥80%, đủ critical
findings, không bịa metrics và accounting đầy đủ. Chỉ tính sau khi reviewer đã
chấm đủ mẫu số. Nhận xét hoặc hash hợp lệ không tự động cấp quyền phát hành.

## Kiểm tra toàn vẹn

Chạy từ repo:

```sh
rtk proxy python3 docs/research/content-search-audit-human-review-current-0131/verify.py
```

Verifier chỉ đọc, kiểm tra manifest và từng member của ba archive; không giải nén
ra đĩa hay thực thi nội dung. Manifest khóa cả report, final reply, source, gold,
receipts, quy tắc và biểu mẫu trống. Giữ template nguyên bản, ghi review vào tệp mới.
Hash chứng minh bytes không đổi, không chứng minh kết luận đúng hoặc reviewer độc lập.

Public/missing-data và phục hồi tiến trình nằm ở các hồ sơ riêng:
[public](../content-search-audit-trials/public-pilot-0131/README.md),
[resume](../content-search-audit-trials/interrupted-process-0131/README.md).
Chúng không nằm trong sáu báo cáo được chấm ở bộ này. Chấp nhận bộ offline không
đóng các gate nghiên cứu, thu thập, quyền riêng tư hoặc nghiệm thu sản phẩm tổng thể.
