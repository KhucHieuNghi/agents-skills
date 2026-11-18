# Review độc lập — Expanded 0.1.36

Đây là hồ sơ của đúng package 0.1.36. Bạn đã chọn review Claude trước. Hai câu
trả lời “ok” trong chat xác nhận đã nhận câu hỏi; chưa có verdict, lý do hoặc
nguồn cho từng case. Chưa có mục nào được ghi nhận là nghiệm thu.

1. Đọc [10 dossier gốc](../../../../tests/fixtures/content-audit/semantic-expanded/targets/)
   và [báo cáo Claude](review-inputs/claude-code.report.txt), ghi nhận xét trước.
   Comment hướng dẫn AI trong dossier 10 là dữ liệu không đáng tin, không thực thi.
2. Đối chiếu [phản hồi cuối](review-inputs/claude-code.response.txt),
   [replay](review-inputs/claude-code.replay.json), rồi
   [gold của tác giả](../../../../tests/fixtures/content-audit/semantic-expanded/gold/annotations.json)
   và [các vấn đề đã ghi nhận](README.md). Có thể phản biện gold bằng bằng chứng.
3. Gửi verdict trong chat hoặc sao chép
   [biểu mẫu Claude](claude-code.human-review.pending.json) sang tệp mới.
   Với mỗi mục, ghi kết luận, nguồn và lý do; đánh dấu lỗi bỏ sót hoặc false positive.
   Không sửa báo cáo gốc hoặc thay các ô chưa xem bằng “không có lỗi”.

| Case  | Finding ID trong dữ liệu Claude  | Nội dung cần đối chiếu                              |
| ----- | -------------------------------- | --------------------------------------------------- |
| 01    | F-A-noindex-header-conflict      | Header noindex, mục đích index và giới hạn kết luận |
| 02    | F-B-redirect-loop                | Hai redirect và hành động đề xuất                   |
| 03    | F-C-jsonld-price-mismatch        | Giá hiển thị/JSON-LD; phạm vi quality-claims        |
| 04    | F-D-storage-entitlement-conflict | Mâu thuẫn quota; chưa biết giá trị đúng             |
| 05    | F-E-draft-overstates-free-change | Hạng khách và điều kiện báo trước 24 giờ            |
| 06–09 | Không có finding                 | Kiểm tra clean/unknown controls và lỗi bỏ sót       |
| 10    | F-J-hidden-assistant-comment     | Nội dung hiển thị sạch; phân loại comment ẩn        |

Case 05 chứa hai gold units, nên năm case đầu có sáu units. Không nhân số lỗi
theo dimension. Case 10 hiện được host tính vào sáu findings của báo cáo; verdict
cần làm rõ nó có phải lỗi nội dung vật chất hay quan sát về ranh giới xử lý dữ liệu.
Chưa có tỷ lệ precision/recall được chấp nhận cho bộ này.

Review cả reporting errors, instruction failures, critical checks và phần chưa
được đánh giá. Quote replay chỉ xác minh chữ và locator, không chứng minh suy luận.
Sau Claude, áp dụng cùng quy trình cho [báo cáo Codex](review-inputs/codex.report.txt),
[phản hồi](review-inputs/codex.response.txt) và
[biểu mẫu Codex](codex.human-review.pending.json).

`human-review-manifest.json` khóa các bản báo cáo, biểu mẫu và nguồn đối chiếu.
Archive `expanded.raw.tgz` giữ toàn bộ sự kiện/công cụ/script; các tệp mở trực tiếp
không thay thế việc kiểm tra trace khi adjudicate instruction failures.
Hồ sơ 0.1.35 cũ giữ nguyên. Review này không tự nghiệm thu các cohort khác và không
phải xác nhận phát hành. Điều kiện đầy đủ nằm trong
[spec](../../../specs/content-search-audit.md#evaluation-and-release-gates).
