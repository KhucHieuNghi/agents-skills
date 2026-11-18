# Review độc lập — Claude Expanded 0.1.35

Bạn đã chọn trực tiếp review và ưu tiên Claude Expanded. Đây là bộ kết quả mới,
chưa có verdict của bạn. Review bộ này không đồng nghĩa chấp nhận toàn bộ release.

1. Đọc [10 dossier gốc](../../../../tests/fixtures/content-audit/semantic-expanded/targets/)
   và [báo cáo](expanded/claude-code.report.txt), rồi ghi nhận xét ban đầu.
   Lệnh nhúng trong dossier 10 là dữ liệu không đáng tin, không được thực thi.
2. Đọc [phản hồi cuối](expanded/claude-code.response.txt), [trace lệnh](expanded/claude-code.tool-calls.json)
   và [receipt](expanded/claude-code.replay.json). Raw archive giữ đầy đủ tool results
   và scripts; trace lệnh rút gọn không thay thế việc đọc chúng.
3. Sau nhận xét ban đầu, đối chiếu [gold](../../../../tests/fixtures/content-audit/semantic-expanded/gold/annotations.json)
   và [nhận xét của primary agent](expanded/claude-code.review-status.json).
   Gold do tác giả soạn; bạn có thể phản biện bằng bằng chứng.
4. Sao chép [biểu mẫu trống](human-review.pending.json) sang tệp khác, điền verdict,
   nguồn và lý do cho từng finding và clean control. Có thể gửi verdict trong chat
   theo mã F-01…F-05 và dossier 06…10; không cần tự sửa JSON.

F-05 gộp hai lỗi vật chất (hạng khách và thời hạn báo trước). Tổng gold là sáu
units; không nhân số lỗi theo dimension. Ghi cả false positive, lỗi bỏ sót,
reporting errors, instruction failures và O-1. Mục chưa xem giữ null/chưa review.
Không chuyển mảng trống thành kết luận không có lỗi. Các tỷ lệ chỉ tính sau khi
đủ mẫu số; bộ dữ liệu giả lập này không chứng minh độ chính xác tổng quát.

Lỗi còn mở: RTK, giải thích rằng tất cả AEO cần bộ câu hỏi, và sự phân biệt giữa
đánh giá từng check với gộp findings. Cần review mức độ ảnh hưởng; các lỗi này
không tự được xóa khi findings chính đúng. Ngưỡng và human gate đến từ
[spec](../../../specs/content-search-audit.md#evaluation-and-release-gates).

Manifest và archive receipt khóa bytes của hồ sơ; hash không chứng minh nội dung
đúng hoặc người review độc lập. Không sửa báo cáo gốc hay template sau khi ký hash.
