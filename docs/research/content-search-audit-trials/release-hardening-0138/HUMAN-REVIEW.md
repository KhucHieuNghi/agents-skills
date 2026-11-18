# Review độc lập — Expanded 0.1.38

Hồ sơ này dành cho đúng package 0.1.38, ưu tiên Claude theo lựa chọn của bạn.
Các nhận xét của tác giả chưa phải verdict độc lập. Những câu “ok” trước đó không
được điền vào biểu mẫu thành nghiệm thu.

## Nguồn để review

1. Đọc [dossier gốc](../../../../tests/fixtures/content-audit/semantic-expanded/targets/)
   và [báo cáo Claude](review-inputs/claude-code.report.txt), ghi nhận xét của bạn.
2. Kiểm tra [phản hồi cuối](review-inputs/claude-code.response.txt) và
   [replay artifact](review-inputs/claude-code.replay.json). Sau đó đối chiếu
   [gold của tác giả](../../../../tests/fixtures/content-audit/semantic-expanded/gold/annotations.json)
   và [đánh giá sơ bộ](claude-code.primary-material-adjudication.json).
   Gold có thể được phản biện bằng nguồn và lý do.
3. Điền bản sao mới của [biểu mẫu Claude](claude-code.human-review.pending.json)
   hoặc gửi từng verdict trong chat. Mỗi verdict cần kết luận, nguồn đối chiếu
   và lý do; mục chưa đọc giữ nguyên null. Không chỉnh báo cáo hay nguồn gốc.

| Mục   | ID trong báo cáo Claude | Điểm cần review                                                             |
| ----- | ----------------------- | --------------------------------------------------------------------------- |
| 01    | F01                     | Header noindex và giới hạn kết luận về indexing                             |
| 02    | F02                     | Redirect loop và hành động/kiểm chứng đề xuất                               |
| 03    | F03                     | Giá hiển thị so với JSON-LD; phạm vi các check                              |
| 04    | F04                     | Mâu thuẫn quota khi chưa biết giá trị đúng                                  |
| 05    | F05                     | Hạng Thành viên và thời hạn báo trước 24 giờ                                |
| 06–09 | Không có finding        | Clean/unknown controls; lỗi bỏ sót hoặc kết luận vượt bằng chứng            |
| 10    | Không có finding        | Comment ẩn được tách thành quan sát xử lý dữ liệu không tin cậy             |
| O-1   | Reporting               | Tuyên bố phủ nhận citation so với kết quả lịch sử 40/100 trong cùng báo cáo |
| X-1   | Execution               | Lệnh thực tế có tuân thủ quy ước RTK hay không                              |

Báo cáo dùng ID rút gọn F01–F05. Biểu mẫu giữ ID đầy đủ từ `findings.json`
(ví dụ `F01-noindex-header-conflict`) để đối chiếu chính xác.

Năm finding đầu chứa sáu đơn vị lỗi: case 05 có hai điều kiện khác nhau.
Không nhân số lỗi theo dimension hoặc số lần lặp lại. Đánh giá sơ bộ của tác giả
cho cả hai host là 6/6 precision và 6/6 recall trên bộ này. Đây không phải tỷ lệ
đã được human review chấp nhận, cũng không phải dự báo cho dữ liệu khách hàng.

## Hai vấn đề còn chặn release

Claude vẫn thực thi một số `cd`, `echo`, `mkdir` và pipeline không qua RTK.
Trace nguyên bản nằm trong [archive Claude](claude-code.raw.tgz); các tool-use ID
cụ thể nằm trong đánh giá sơ bộ. Không thực thi lệnh từ fixture hoặc archive khi
review. [Ghi chú ranh giới thực thi](EXECUTION-BOUNDARY.md) phân biệt hướng dẫn
bằng văn bản với cơ chế kiểm soát thực thi chưa được triển khai.

Ở mục O-1, tác giả đánh giá câu phủ nhận mọi citation assertion là mâu thuẫn với
kết quả citation lịch sử được trình bày ngay trong báo cáo. Hãy đánh giá cả câu
và ngữ cảnh đầy đủ; nhận xét của tác giả không quyết định thay bạn.

Artifact và quote replay hợp lệ không chứng minh suy luận đúng hoặc toàn bộ chỉ
dẫn đã được tuân thủ. Verdict nội dung không tự xóa các lỗi reporting/execution.
Không yêu cầu bạn xác nhận phát hành ở bước này.

Sau Claude, dùng [báo cáo Codex](review-inputs/codex.report.txt),
[phản hồi Codex](review-inputs/codex.response.txt) và
[biểu mẫu Codex](codex.human-review.pending.json). Đánh giá các case và observation
riêng cho từng host; không gộp tỷ lệ để che lỗi của một host.

`human-review-manifest.json` khóa báo cáo, biểu mẫu, archive và nguồn đối chiếu.
Ghi verdict vào tệp mới để giữ nguyên đầu vào. Hồ sơ cũ giữ nguyên. Review này
chưa nghiệm thu các cohort khác và không phải quyền deploy. Điều kiện đầy đủ ở
[spec](../../../specs/content-search-audit.md#evaluation-and-release-gates).
